import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IonInput, IonButton, IonIcon, IonTextarea } from '@ionic/angular/standalone';
import { ContactService } from 'src/app/services/contact.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, IonTextarea]
})
export class ContactFormComponent implements OnInit {
  contactForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService
  ) {
    this.contactForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      website: [''] // Honeypot field - should always be empty
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
        // Remove honeypot field before sending
        const formData = { ...this.contactForm.value };
        delete formData.website;

        await this.contactService.submitContactForm(formData);
        this.submitSuccess = true;
        this.contactForm.reset();
      } catch (error) {
        this.submitError = 'Failed to send message. Please try again.';
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
