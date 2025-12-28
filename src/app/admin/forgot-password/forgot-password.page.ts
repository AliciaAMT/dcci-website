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
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  isResending = false;
  showSuccessState = false;
  emailAddress = '';
  statusMessage: { success: boolean; message: string } | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    // Reset any existing state
    this.showSuccessState = false;
    this.statusMessage = null;
  }

  async onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.statusMessage = null;
      this.showSuccessState = false;

      const email = this.forgotPasswordForm.get('email')?.value;

      try {
        const result = await this.authService.sendPasswordResetEmail(email);
        
        this.statusMessage = result;
        
        if (result.success) {
          this.emailAddress = email;
          this.showSuccessState = true;
          // Clear the form
          this.forgotPasswordForm.reset();
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

  async resendEmail() {
    if (this.emailAddress) {
      this.isResending = true;
      this.statusMessage = null;

      try {
        const result = await this.authService.sendPasswordResetEmail(this.emailAddress);
        this.statusMessage = result;
        
        if (result.success) {
          // Clear the message after 5 seconds
          setTimeout(() => {
            this.statusMessage = null;
          }, 5000);
        }
      } catch (error) {
        this.statusMessage = { 
          success: false, 
          message: 'An unexpected error occurred. Please try again.' 
        };
        console.error('Resend password reset error:', error);
      } finally {
        this.isResending = false;
      }
    }
  }

  goBack() {
    this.router.navigate(['/admin/login']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      const control = this.forgotPasswordForm.get(key);
      control?.markAsTouched();
    });
  }
}