import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonInput, IonButton, IonIcon, IonTextarea, IonCheckbox } from '@ionic/angular/standalone';
import { ContactService } from 'src/app/services/contact.service';
import { SiteSettingsService } from '../services/site-settings.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

const SUPPORT_EMAIL = 'admin@accessiblewebmedia.com';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, IonTextarea, IonCheckbox]
})
export class ContactFormComponent implements OnInit, OnDestroy {
  @Input() prefillSubject: string = '';
  @Input() hideDescription: boolean = false;
  @Input() hideNewsletter: boolean = false;
  /** 'home' | 'welcome' | other — stored on delivery events only */
  @Input() sourcePage: string = 'unknown';

  @ViewChild('statusAlert') statusAlert?: ElementRef<HTMLElement>;

  contactForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  deliveryFailed = false;
  readonly supportEmail = SUPPORT_EMAIL;
  readonly supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('DCCI contact form delivery problem')}`;
  formLoadTime: number = 0;
  contactFormsDisabled = false;
  private settingsSubscription: Subscription = new Subscription();

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private siteSettingsService: SiteSettingsService,
    private route: ActivatedRoute
  ) {
    this.formLoadTime = Date.now();

    this.contactForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
      newsletter: [false],
      website: [''],
      formTimestamp: [this.formLoadTime]
    });
  }

  ngOnInit() {
    const subjectParam = this.route.snapshot.queryParams['subject'];
    const subjectToUse = this.prefillSubject || subjectParam || '';

    if (subjectToUse) {
      this.contactForm.patchValue({ subject: subjectToUse });
    }

    this.settingsSubscription = this.siteSettingsService.settings$.subscribe(settings => {
      const shouldDisable = settings.nuclearLockdown || settings.disableContactForms;
      this.contactFormsDisabled = shouldDisable;
      if (shouldDisable) {
        this.contactForm.disable();
      } else {
        this.contactForm.enable();
      }
    });
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  async onSubmit() {
    const settings = await firstValueFrom(this.siteSettingsService.settings$);
    if (settings.nuclearLockdown) {
      this.submitError = 'Site is currently in maintenance mode. Please try again later.';
      this.deliveryFailed = false;
      this.focusStatus();
      return;
    }

    if (settings.disableContactForms) {
      this.submitError = 'Contact form temporarily unavailable.';
      this.deliveryFailed = false;
      this.focusStatus();
      return;
    }

    if (this.contactForm.get('website')?.value) {
      this.submitSuccess = true;
      this.deliveryFailed = false;
      this.submitError = '';
      this.contactForm.reset();
      return;
    }

    if (this.contactForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';
      this.deliveryFailed = false;

      try {
        const formData: Record<string, unknown> = { ...this.contactForm.value };
        delete formData['website'];
        formData['submissionTime'] = Date.now();
        formData['formLoadTime'] = formData['formTimestamp'];
        delete formData['formTimestamp'];
        formData['sourcePage'] = this.sourcePage || 'unknown';

        const result = await this.contactService.submitContactForm(formData as any);

        if (result.delivered === true) {
          this.submitSuccess = true;
          this.deliveryFailed = false;
          this.submitError = '';
          this.contactForm.reset();
        } else {
          // Keep typed values in memory — do not clear the form
          this.submitSuccess = false;
          this.deliveryFailed = true;
          this.submitError = '';
        }
        this.focusStatus();
      } catch (error: any) {
        this.submitSuccess = false;
        this.deliveryFailed = false;
        this.submitError = this.formatContactFormError(error);
        console.error('Contact form submission error:', error);
        this.focusStatus();
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private focusStatus() {
    setTimeout(() => {
      this.statusAlert?.nativeElement?.focus();
    }, 0);
  }

  private formatContactFormError(error: any): string {
    const body = error?.error;
    if (!body) {
      return 'Failed to send message. Please check your connection and try again.';
    }

    if (body.message) {
      return body.message;
    }

    if (body.error === 'invalid_input' && Array.isArray(body.details) && body.details.length > 0) {
      return body.details.join(' ');
    }

    if (body.error === 'Invalid input' && Array.isArray(body.details) && body.details.length > 0) {
      return body.details.join(' ');
    }

    return 'Failed to send message. Please try again.';
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
    this.deliveryFailed = false;
    this.contactForm.reset();
  }

  dismissDeliveryFailure() {
    this.deliveryFailed = false;
  }
}
