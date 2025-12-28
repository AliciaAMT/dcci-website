import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-verification-required',
  templateUrl: './verification-required.page.html',
  styleUrls: ['./verification-required.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    CommonModule
  ]
})
export class VerificationRequiredPage implements OnInit, OnDestroy {
  userEmail: string = '';
  isResending = false;
  showSuccessState = false;
  resendCooldown = 0;
  statusMessage: { success: boolean; message: string } | null = null;
  
  private cooldownSubscription: Subscription = new Subscription();
  private userSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get email from route parameters or query params
    this.userEmail = this.route.snapshot.queryParams['email'] || '';
    
    // If no email in route, try to get from current user
    if (!this.userEmail) {
      this.userSubscription = this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.userEmail = user.email;
        } else {
          // If no user is logged in, redirect to login
          this.router.navigate(['/admin/login']);
        }
      });
    }

    // Check if user is already verified and admin
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user && user.emailVerified && user.isAdmin) {
        // User is verified and admin, redirect to dashboard
        this.router.navigate(['/admin/dashboard']);
      } else if (user && user.emailVerified && !user.isAdmin) {
        // User is verified but not admin, redirect to home
        this.router.navigate(['/home']);
      }
    });
  }

  ngOnDestroy() {
    if (this.cooldownSubscription) {
      this.cooldownSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async resendVerificationEmail() {
    if (this.isResending || this.resendCooldown > 0) {
      return;
    }

    try {
      this.isResending = true;
      this.statusMessage = null;
      this.showSuccessState = false;

      const result = await this.authService.sendEmailVerification();
      
      this.statusMessage = result;
      
      if (result.success) {
        this.showSuccessState = true;
        this.startResendCooldown();
      }
    } catch (error) {
      this.statusMessage = { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.' 
      };
      console.error('Resend verification error:', error);
    } finally {
      this.isResending = false;
    }
  }

  private startResendCooldown() {
    this.resendCooldown = 60; // 60 seconds cooldown
    
    this.cooldownSubscription = interval(1000).subscribe(() => {
      this.resendCooldown--;
      
      if (this.resendCooldown <= 0) {
        this.cooldownSubscription.unsubscribe();
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/admin/login']);
  }
}