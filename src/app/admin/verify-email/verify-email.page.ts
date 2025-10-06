import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    CommonModule
  ]
})
export class VerifyEmailPage implements OnInit {
  verificationStatus: 'loading' | 'success' | 'error' | 'pending' = 'loading';
  errorMessage = '';
  isResending = false;
  resendMessage: { success: boolean; message: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check if there's an action code in the URL (from email verification link)
    const actionCode = this.route.snapshot.queryParams['oobCode'];

    if (actionCode) {
      this.verifyEmail(actionCode);
    } else {
      // No action code - show pending state (manual verification)
      this.verificationStatus = 'pending';
    }
  }

  async verifyEmail(actionCode: string) {
    try {
      this.verificationStatus = 'loading';

      const result = await this.authService.verifyEmail(actionCode);

      if (result.success) {
        this.verificationStatus = 'success';
        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.goToLogin();
        }, 3000);
      } else {
        this.verificationStatus = 'error';
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.verificationStatus = 'error';
      this.errorMessage = 'An unexpected error occurred during verification.';
      console.error('Email verification error:', error);
    }
  }

  async resendVerification() {
    try {
      this.isResending = true;
      this.resendMessage = null;

      const result = await this.authService.sendEmailVerification();
      this.resendMessage = result;

      if (result.success) {
        // Clear the message after 5 seconds
        setTimeout(() => {
          this.resendMessage = null;
        }, 5000);
      }
    } catch (error) {
      this.resendMessage = {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
      console.error('Resend verification error:', error);
    } finally {
      this.isResending = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/admin/login']);
  }
}
