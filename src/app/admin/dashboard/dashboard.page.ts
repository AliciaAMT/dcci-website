import { Component, OnInit, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Firestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, Timestamp } from '@angular/fire/firestore';
import { AuthService, AdminUser } from '../../services/auth';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  newsletterSubscribers: number;
  totalViews: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  storagePercentUsed: number;
}

interface ActivityItem {
  icon: string;
  text: string;
  time: string;
  timestamp: Date | Timestamp;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
    CommonModule,
    HttpClientModule
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  currentUser: AdminUser | null = null;
  stats: DashboardStats = {
    totalUsers: 0,
    totalMessages: 0,
    newsletterSubscribers: 0,
    totalViews: 0,
    storageUsedBytes: 0,
    storageLimitBytes: 1024 * 1024 * 1024,
    storagePercentUsed: 0
  };
  recentActivity: ActivityItem[] = [];

  private userSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private firestore: Firestore,
    private http: HttpClient,
    private injector: Injector
  ) {}

  ngOnInit() {
    // Subscribe to current user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;

      // Redirect if user is not admin/moderator or not verified
      if (!user || !user.isAdmin || !user.emailVerified || 
          (user.userRole !== 'Admin' && user.userRole !== 'Moderator')) {
        this.router.navigate(['/home']);
      }
    });

    // Load dashboard data
    this.loadDashboardData();
    this.loadRecentActivity();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async loadDashboardData() {
    try {
      // Ensure Firebase API calls are within injection context
      const [adminSnapshot, contactStats, storageStats, siteStatsSnap] = await Promise.all([
        runInInjectionContext(this.injector, async () => {
          const adminUsersRef = collection(this.firestore, 'adminUsers');
          const adminQuery = query(adminUsersRef, where('isAdmin', '==', true));
          return await getDocs(adminQuery);
        }),
        firstValueFrom(this.http.get(environment.firebaseFunctionsUrl + '/getContactStats')),
        firstValueFrom(this.http.get(environment.firebaseFunctionsUrl + '/getStorageUsage')),
        runInInjectionContext(this.injector, async () => {
          return await getDoc(doc(this.firestore, 'stats', 'siteStats'));
        })
      ]);

      const siteStatsData = siteStatsSnap.exists() ? (siteStatsSnap.data() as any) : null;
      const storageData = storageStats as any;
      const storageLimitBytes = storageData?.freeTierBytes ?? this.stats.storageLimitBytes;
      const storageUsedBytes = storageData?.totalBytes ?? 0;
      const storagePercentUsed = storageData?.percentUsed ?? 0;

      this.stats = {
        ...this.stats,
        totalUsers: adminSnapshot.size,
        totalMessages: (contactStats as any)?.totalContacts ?? 0,
        newsletterSubscribers: (contactStats as any)?.totalSubscribers ?? 0,
        totalViews: siteStatsData?.totalUniqueVisitors ?? 0,
        storageUsedBytes,
        storageLimitBytes,
        storagePercentUsed
      };
    } catch (error) {
      console.error('Error loading admin user count:', error);
    }
  }

  async loadRecentActivity() {
    try {
      const activities: ActivityItem[] = [];

      // Load activities within injection context
      await runInInjectionContext(this.injector, async () => {
        // 1. Get recently published content (last 5 items)
        try {
          const contentRef = collection(this.firestore, 'content');
          const publishedContentQuery = query(
            contentRef,
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc'),
            limit(5)
          );
          const publishedSnapshot = await getDocs(publishedContentQuery);
          
          publishedSnapshot.forEach((doc) => {
            const content = doc.data() as any;
            const timestamp = content.publishedAt || content.createdAt;
            if (timestamp) {
              const articleType = content.archive ? 'Archived article' : 'Article';
              activities.push({
                icon: content.archive ? 'archive-outline' : 'document-text-outline',
                text: `${articleType} published: "${content.title}"`,
                time: this.formatTimeAgo(timestamp),
                timestamp: timestamp
              });
            }
          });
        } catch (error: any) {
          console.error('Error loading published content activities:', error);
          // Fallback: try to get published content without orderBy
          try {
            const contentRef = collection(this.firestore, 'content');
            const publishedQuery = query(
              contentRef,
              where('status', '==', 'published'),
              limit(10)
            );
            const publishedSnapshot = await getDocs(publishedQuery);
            const publishedArray = publishedSnapshot.docs
              .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
              .filter((item: any) => item.publishedAt || item.createdAt)
              .sort((a: any, b: any) => {
                const aTime = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : 
                             (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
                const bTime = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : 
                             (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
                return bTime - aTime;
              })
              .slice(0, 5);
            
            publishedArray.forEach((item: any) => {
              const timestamp = item.publishedAt || item.createdAt;
              if (timestamp) {
                const articleType = item.archive ? 'Archived article' : 'Article';
                activities.push({
                  icon: item.archive ? 'archive-outline' : 'document-text-outline',
                  text: `${articleType} published: "${item.title}"`,
                  time: this.formatTimeAgo(timestamp),
                  timestamp: timestamp
                });
              }
            });
          } catch (fallbackError) {
            console.error('Error loading published content activities (fallback):', fallbackError);
          }
        }

        // 2. Get recent contact form submissions (last 5)
        try {
          const contactsRef = collection(this.firestore, 'contacts');
          const contactsQuery = query(
            contactsRef,
            orderBy('submittedAt', 'desc'),
            limit(5)
          );
          const contactsSnapshot = await getDocs(contactsQuery);
          
          contactsSnapshot.forEach((doc) => {
            const data = doc.data() as any;
            const timestamp = data.submittedAt;
            if (timestamp) {
              activities.push({
                icon: 'mail-outline',
                text: `Contact form submission from ${data.name || 'Anonymous'}`,
                time: this.formatTimeAgo(timestamp),
                timestamp: timestamp
              });
            }
          });
        } catch (error) {
          console.error('Error loading contact form activities:', error);
          // If submittedAt field doesn't exist or isn't indexed, try without orderBy
          try {
            const contactsRef = collection(this.firestore, 'contacts');
            const contactsSnapshot = await getDocs(contactsRef);
            const contactsArray = contactsSnapshot.docs
              .map(doc => {
                const docData = doc.data() as any;
                return { id: doc.id, ...docData };
              })
              .filter((item: any) => item.submittedAt)
              .sort((a: any, b: any) => {
                const aTimestamp = a.submittedAt;
                const bTimestamp = b.submittedAt;
                const aTime = aTimestamp?.toDate ? aTimestamp.toDate().getTime() : new Date(aTimestamp).getTime();
                const bTime = bTimestamp?.toDate ? bTimestamp.toDate().getTime() : new Date(bTimestamp).getTime();
                return bTime - aTime;
              })
              .slice(0, 5);
            
            contactsArray.forEach((item: any) => {
              const timestamp = item.submittedAt;
              if (timestamp) {
                activities.push({
                  icon: 'mail-outline',
                  text: `Contact form submission from ${item.name || 'Anonymous'}`,
                  time: this.formatTimeAgo(timestamp),
                  timestamp: timestamp
                });
              }
            });
          } catch (fallbackError) {
            console.error('Error loading contact form activities (fallback):', fallbackError);
          }
        }

        // 3. Get recent newsletter subscriptions (last 5)
        try {
          const subscribersRef = collection(this.firestore, 'subscribers');
          const subscribersQuery = query(
            subscribersRef,
            orderBy('subscribedAt', 'desc'),
            limit(5)
          );
          const subscribersSnapshot = await getDocs(subscribersQuery);
          
          subscribersSnapshot.forEach((doc) => {
            const data = doc.data() as any;
            const timestamp = data.subscribedAt;
            if (timestamp) {
              activities.push({
                icon: 'newspaper-outline',
                text: `Newsletter subscription: ${data.email || 'New subscriber'}`,
                time: this.formatTimeAgo(timestamp),
                timestamp: timestamp
              });
            }
          });
        } catch (error) {
          console.error('Error loading newsletter subscription activities:', error);
          // If subscribedAt field doesn't exist or isn't indexed, try without orderBy
          try {
            const subscribersRef = collection(this.firestore, 'subscribers');
            const subscribersSnapshot = await getDocs(subscribersRef);
            const subscribersArray = subscribersSnapshot.docs
              .map(doc => {
                const docData = doc.data() as any;
                return { id: doc.id, ...docData };
              })
              .filter((item: any) => item.subscribedAt)
              .sort((a: any, b: any) => {
                const aTimestamp = a.subscribedAt;
                const bTimestamp = b.subscribedAt;
                const aTime = aTimestamp?.toDate ? aTimestamp.toDate().getTime() : new Date(aTimestamp).getTime();
                const bTime = bTimestamp?.toDate ? bTimestamp.toDate().getTime() : new Date(bTimestamp).getTime();
                return bTime - aTime;
              })
              .slice(0, 5);
            
            subscribersArray.forEach((item: any) => {
              const timestamp = item.subscribedAt;
              if (timestamp) {
                activities.push({
                  icon: 'newspaper-outline',
                  text: `Newsletter subscription: ${item.email || 'New subscriber'}`,
                  time: this.formatTimeAgo(timestamp),
                  timestamp: timestamp
                });
              }
            });
          } catch (fallbackError) {
            console.error('Error loading newsletter subscription activities (fallback):', fallbackError);
          }
        }

        // 4. Get recently created/updated drafts (last 3)
        try {
          const contentRef = collection(this.firestore, 'content');
          const draftsQuery = query(
            contentRef,
            where('status', '==', 'draft'),
            orderBy('updatedAt', 'desc'),
            limit(3)
          );
          const draftsSnapshot = await getDocs(draftsQuery);
          
          draftsSnapshot.forEach((doc) => {
            const content = doc.data() as any;
            const timestamp = content.updatedAt || content.createdAt;
            if (timestamp) {
              activities.push({
                icon: 'create-outline',
                text: `Draft ${content.updatedAt ? 'updated' : 'created'}: "${content.title}"`,
                time: this.formatTimeAgo(timestamp),
                timestamp: timestamp
              });
            }
          });
        } catch (error: any) {
          console.error('Error loading draft activities:', error);
          // Fallback: try to get drafts without orderBy
          try {
            const contentRef = collection(this.firestore, 'content');
            const draftsQuery = query(
              contentRef,
              where('status', '==', 'draft'),
              limit(10)
            );
            const draftsSnapshot = await getDocs(draftsQuery);
            const draftsArray = draftsSnapshot.docs
              .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
              .filter((item: any) => item.updatedAt || item.createdAt)
              .sort((a: any, b: any) => {
                const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 
                             (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
                const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 
                             (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
                return bTime - aTime;
              })
              .slice(0, 3);
            
            draftsArray.forEach((item: any) => {
              const timestamp = item.updatedAt || item.createdAt;
              if (timestamp) {
                activities.push({
                  icon: 'create-outline',
                  text: `Draft ${item.updatedAt ? 'updated' : 'created'}: "${item.title}"`,
                  time: this.formatTimeAgo(timestamp),
                  timestamp: timestamp
                });
              }
            });
          } catch (fallbackError) {
            console.error('Error loading draft activities (fallback):', fallbackError);
          }
        }
      });

      // Sort all activities by timestamp (most recent first) and limit to 10
      activities.sort((a, b) => {
        const aTime = a.timestamp instanceof Date 
          ? a.timestamp.getTime() 
          : (a.timestamp as any)?.toDate ? (a.timestamp as any).toDate().getTime() 
          : new Date(a.timestamp as any).getTime();
        const bTime = b.timestamp instanceof Date 
          ? b.timestamp.getTime() 
          : (b.timestamp as any)?.toDate ? (b.timestamp as any).toDate().getTime() 
          : new Date(b.timestamp as any).getTime();
        return bTime - aTime;
      });

      this.recentActivity = activities.slice(0, 10);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      // Fallback to empty array if there's an error
      this.recentActivity = [];
    }
  }

  formatTimeAgo(timestamp: Date | Timestamp | any): string {
    try {
      let date: Date;
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp) {
        date = new Date(timestamp);
      } else {
        return 'Unknown time';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  }

  navigateToCreateContent() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/create']);
  }

  navigateToArchiveContent() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/archive']);
  }

  navigateToManageContent() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/manage']);
  }

  navigateToYouTubeSettings() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/youtube-settings']);
  }

  navigateToUserManagement() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/user-management']);
  }

  navigateToEmergencyControls() {
    // Blur any active element to prevent aria-hidden warnings during navigation
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/emergency-controls']);
  }

  /**
   * Check if current user is a full Admin (not Moderator)
   */
  isFullAdmin(): boolean {
    return this.authService.isFullAdmin();
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      this.router.navigate(['/home']);
    }
  }
}
