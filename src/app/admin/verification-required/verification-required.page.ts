import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonItem,
  IonLabel,
  IonInput
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
    IonItem,
    IonLabel,
    IonInput,
    CommonModule,
    ReactiveFormsModule
  ]
})
export class VerificationRequiredPage implements OnInit, OnDestroy {
  userEmail: string = '';
  isResending = false;
  showSuccessState = false;
  resendCooldown = 0;
  statusMessage: { success: boolean; message: string } | null = null;
  credentialsForm: FormGroup;
  showCredentialsForm = false;
  isLoggedIn = false;
  
  private cooldownSubscription: Subscription = new Subscription();
  private userSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.credentialsForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    // Get email from route parameters or query params
    this.userEmail = this.route.snapshot.queryParams['email'] || '';
    
    // Check if user is logged in
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      
      if (user) {
        // If user is logged in, use their email
        if (!this.userEmail) {
          this.userEmail = user.email || '';
        }
        
        // Check if user is already verified and admin
        if (user.emailVerified && user.isAdmin) {
          // User is verified and admin, redirect to dashboard
          this.router.navigate(['/admin/dashboard']);
        } else if (user.emailVerified && !user.isAdmin) {
          // User is verified but not admin, redirect to home
          this.router.navigate(['/home']);
        }
      } else {
        // No user logged in - show credentials form if no email in query params
        if (!this.userEmail) {
          this.showCredentialsForm = true;
        } else {
          // Email provided in query params, pre-fill form
          this.credentialsForm.patchValue({ email: this.userEmail });
          this.showCredentialsForm = true;
        }
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

      let result;
      
      // If not logged in, use credentials from form
      if (!this.isLoggedIn) {
        if (this.credentialsForm.invalid) {
          this.statusMessage = {
            success: false,
            message: 'Please enter your email and password to resend the verification email.'
          };
          this.isResending = false;
          return;
        }
        
        const email = this.credentialsForm.value.email;
        const password = this.credentialsForm.value.password;
        result = await this.authService.sendEmailVerification(email, password);
        
        // Update userEmail if form was used
        if (result.success && email) {
          this.userEmail = email;
        }
      } else {
        // User is logged in, use their session
        result = await this.authService.sendEmailVerification();
      }
      
      this.statusMessage = result;
      
      if (result.success) {
        this.showSuccessState = true;
        this.startResendCooldown();
        // Hide credentials form after successful send
        this.showCredentialsForm = false;
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