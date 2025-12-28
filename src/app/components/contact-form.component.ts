import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonInput, IonButton, IonIcon, IonTextarea, IonCheckbox } from '@ionic/angular/standalone';
import { ContactService } from 'src/app/services/contact.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, IonTextarea, IonCheckbox]
})
export class ContactFormComponent implements OnInit {
  contactForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  formLoadTime: number = 0;

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService
  ) {
    // Record when the form was loaded (for bot detection)
    this.formLoadTime = Date.now();

    this.contactForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
      newsletter: [false], // Newsletter subscription (optional)
      website: [''], // Honeypot field - should always be empty
      formTimestamp: [this.formLoadTime] // Hidden field for bot detection
    });
  }

  ngOnInit() {}

  async onSubmit() {
    // Honeypot check - if website field is filled, it's likely a bot
    if (this.contactForm.get('website')?.value) {
      console.log('Bot detected via honeypot');
      // Silently fail - don't let bots know they were caught
      this.submitSuccess = true;
      this.contactForm.reset();
      return;
    }

    if (this.contactForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';

      try {
        // Prepare form data and add submission timestamp
        const formData = { ...this.contactForm.value };
        delete formData.website; // Remove honeypot field

        // Add submission timestamp for bot detection
        formData.submissionTime = Date.now();
        formData.formLoadTime = formData.formTimestamp; // The original form load time
        delete formData.formTimestamp; // Clean up the form field

        await this.contactService.submitContactForm(formData);
        this.submitSuccess = true;
        this.contactForm.reset();
      } catch (error: any) {
        // Check for VPN detection error
        if (error.error?.error === 'VPN detected') {
          this.submitError = error.error.message || 'VPN detected. Please turn off your VPN and try again.';
        }
        // Check for input validation errors
        else if (error.error?.error === 'Invalid input' && error.error?.details) {
          this.submitError = 'Please check your input: ' + error.error.details.join(', ');
        }
        else {
          this.submitError = 'Failed to send message. Please try again.';
        }
        console.error('Contact form submission error:', error);
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.contactForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(controlName)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['minlength']) {
        const requiredLength = control.errors['minlength'].requiredLength;
        return `${this.getFieldLabel(controlName)} must be at least ${requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        const maxLength = control.errors['maxlength'].requiredLength;
        return `${this.getFieldLabel(controlName)} must be less than ${maxLength} characters`;
      }
    }
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message'
    };
    return labels[controlName] || controlName;
  }

  resetForm() {
    this.submitSuccess = false;
    this.submitError = '';
    this.contactForm.reset();
  }
}
