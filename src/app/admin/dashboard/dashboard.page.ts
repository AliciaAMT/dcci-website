import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../services/auth';
import { Subscription } from 'rxjs';

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  newsletterSubscribers: number;
  totalViews: number;
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
    CommonModule
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  currentUser: AdminUser | null = null;
  stats: DashboardStats = {
    totalUsers: 0,
    totalMessages: 0,
    newsletterSubscribers: 0,
    totalViews: 0
  };
  recentActivity: ActivityItem[] = [];

  private userSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
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
    // TODO: Implement actual data loading from Firestore
    // For now, using mock data
    this.stats = {
      totalUsers: 12,
      totalMessages: 8,
      newsletterSubscribers: 45,
      totalViews: 1250
    };
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
