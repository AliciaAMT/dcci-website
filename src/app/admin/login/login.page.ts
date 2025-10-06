import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SanitizationService } from '../../services/sanitization';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    CommonModule,
    ReactiveFormsModule
  ]
})
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isSignUpMode = false;
  isLoading = false;
  showPassword = false;
  statusMessage: { success: boolean; message: string; needsVerification?: boolean; isLocked?: boolean } | null = null;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private sanitizationService: SanitizationService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    // Check if user is already logged in and is admin
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user && user.isAdmin && user.emailVerified) {
        this.router.navigate(['/admin/dashboard']);
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.statusMessage = null;

      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;

      try {
        let result;
        if (this.isSignUpMode) {
          result = await this.authService.signUp(email, password);
        } else {
          result = await this.authService.signIn(email, password);
        }

        if (result.needsVerification) {
          // User needs email verification - redirect to verification page
          this.router.navigate(['/admin/verification-required'], {
            queryParams: { email: email }
          });
          return;
        }

        if (result.isLocked) {
          // Account is locked - show message and disable form
          this.statusMessage = result;
          this.loginForm.disable();
          return;
        }

        this.statusMessage = result;

        if (result.success && !this.isSignUpMode) {
          // Successful login - redirect to admin dashboard
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 1000);
        } else if (result.success && this.isSignUpMode) {
          // Successful signup - switch to login mode
          setTimeout(() => {
            this.toggleMode();
            this.loginForm.get('password')?.setValue('');
          }, 2000);
        }
      } catch (error) {
        this.statusMessage = { success: false, message: 'An unexpected error occurred. Please try again.' };
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
    this.statusMessage = null;
    this.loginForm.reset();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToForgotPassword() {
    this.router.navigate(['/admin/forgot-password']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return 'Password must be at least 8 characters long';
      }
    }
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
