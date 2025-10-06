import { Component, OnInit } from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
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
export class ResetPasswordPage implements OnInit {
  resetPasswordForm: FormGroup;
  verificationStatus: 'loading' | 'verified' | 'error' = 'loading';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  showSuccessState = false;
  userEmail = '';
  errorMessage = '';
  statusMessage: { success: boolean; message: string } | null = null;

  // Password validation properties
  get hasMinLength(): boolean {
    const password = this.resetPasswordForm.get('password')?.value || '';
    return password.length >= 8;
  }

  get hasLetter(): boolean {
    const password = this.resetPasswordForm.get('password')?.value || '';
    return /[a-zA-Z]/.test(password);
  }

  get hasNumber(): boolean {
    const password = this.resetPasswordForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  get passwordsMatch(): boolean {
    const password = this.resetPasswordForm.get('password')?.value || '';
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value || '';
    return password === confirmPassword && password.length > 0;
  }

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetPasswordForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Get the action code from URL parameters
    const actionCode = this.route.snapshot.queryParams['oobCode'];
    
    if (actionCode) {
      this.verifyResetCode(actionCode);
    } else {
      this.verificationStatus = 'error';
      this.errorMessage = 'Invalid reset link. Please request a new password reset email.';
    }
  }

  async verifyResetCode(actionCode: string) {
    try {
      this.verificationStatus = 'loading';
      
      const result = await this.authService.verifyPasswordResetCode(actionCode);
      
      if (result.success && result.email) {
        this.verificationStatus = 'verified';
        this.userEmail = result.email;
      } else {
        this.verificationStatus = 'error';
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.verificationStatus = 'error';
      this.errorMessage = 'An unexpected error occurred during verification.';
      console.error('Reset code verification error:', error);
    }
  }

  async onSubmit() {
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      this.statusMessage = null;
      this.showSuccessState = false;

      const actionCode = this.route.snapshot.queryParams['oobCode'];
      const newPassword = this.resetPasswordForm.get('password')?.value;

      try {
        const result = await this.authService.confirmPasswordReset(actionCode, newPassword);
        
        this.statusMessage = result;
        
        if (result.success) {
          this.showSuccessState = true;
          // Clear the form
          this.resetPasswordForm.reset();
        }
      } catch (error) {
        this.statusMessage = { 
          success: false, 
          message: 'An unexpected error occurred. Please try again.' 
        };
        console.error('Password reset error:', error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.router.navigate(['/admin/login']);
  }

  goToForgotPassword() {
    this.router.navigate(['/admin/forgot-password']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return 'Password must be at least 8 characters long';
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  private markFormGroupTouched() {
    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      const control = this.resetPasswordForm.get(key);
      control?.markAsTouched();
    });
  }
}