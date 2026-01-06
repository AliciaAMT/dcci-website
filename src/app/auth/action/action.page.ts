import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-action',
  templateUrl: './action.page.html',
  styleUrls: ['./action.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    CommonModule
  ]
})
export class ActionPage implements OnInit {
  status: 'loading' | 'success' | 'error' | 'already-verified' = 'loading';
  message = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const mode = this.route.snapshot.queryParams['mode'];
    const oobCode = this.route.snapshot.queryParams['oobCode'];

    if (mode === 'verifyEmail' && oobCode) {
      this.handleEmailVerification(oobCode);
    } else {
      this.status = 'error';
      this.errorMessage = 'Invalid verification link. Please check your email and try again.';
    }
  }

  async handleEmailVerification(actionCode: string) {
    try {
      this.status = 'loading';
      this.message = '';
      this.errorMessage = '';

      const result = await this.authService.verifyEmail(actionCode);

      if (result.success) {
        this.status = 'success';
        this.message = result.message;
      } else {
        // Check error code for specific cases
        const errorCode = result.code || '';
        const errorMessage = result.message.toLowerCase();
        
        // Check if error indicates already verified or already applied
        if (errorCode === 'auth/expired-action-code' && errorMessage.includes('already')) {
          this.status = 'already-verified';
          this.message = 'Your email has already been verified. You can sign in now.';
        } else if (errorMessage.includes('already') || errorMessage.includes('already verified') || errorMessage.includes('already applied')) {
          this.status = 'already-verified';
          this.message = 'Your email has already been verified. You can sign in now.';
        } else if (errorCode === 'auth/expired-action-code' || errorMessage.includes('expired')) {
          this.status = 'error';
          this.errorMessage = 'This verification link has expired. Please request a new verification email.';
        } else if (errorCode === 'auth/invalid-action-code' || errorMessage.includes('invalid')) {
          this.status = 'error';
          this.errorMessage = 'This verification link is invalid. Please request a new verification email.';
        } else {
          this.status = 'error';
          this.errorMessage = result.message || 'Verification failed. Please try again or request a new verification email.';
        }
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      this.status = 'error';
      this.errorMessage = 'An unexpected error occurred. Please try again or request a new verification email.';
    }
  }

  goToSignIn() {
    if (this.status === 'success' || this.status === 'already-verified') {
      this.router.navigate(['/admin/login'], { queryParams: { verified: '1' } });
    } else {
      this.router.navigate(['/admin/login']);
    }
  }
}

