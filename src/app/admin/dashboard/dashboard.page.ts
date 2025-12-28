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
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
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

      // Redirect if user is not admin or not verified
      if (!user || !user.isAdmin || !user.emailVerified) {
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

  loadRecentActivity() {
    // TODO: Implement actual activity loading from Firestore
    // For now, using mock data
    this.recentActivity = [
      {
        icon: 'person-add-outline',
        text: 'New user registration',
        time: '2 hours ago'
      },
      {
        icon: 'mail-outline',
        text: 'Contact form submission',
        time: '4 hours ago'
      },
      {
        icon: 'newspaper-outline',
        text: 'Newsletter subscription',
        time: '6 hours ago'
      },
      {
        icon: 'log-in-outline',
        text: 'Admin login',
        time: '1 day ago'
      }
    ];
  }

  navigateToCreateContent() {
    this.router.navigate(['/admin/content/create']);
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
