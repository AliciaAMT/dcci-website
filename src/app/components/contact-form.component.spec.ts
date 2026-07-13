import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ContactFormComponent } from './contact-form.component';
import { ContactService } from '../services/contact.service';
import { SiteSettingsService } from '../services/site-settings.service';

describe('ContactFormComponent', () => {
  let component: ContactFormComponent;
  let fixture: ComponentFixture<ContactFormComponent>;
  let mockContactService: jasmine.SpyObj<ContactService>;

  beforeEach(async () => {
    mockContactService = jasmine.createSpyObj('ContactService', ['submitContactForm']);

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, IonicModule, ReactiveFormsModule],
      providers: [
        { provide: ContactService, useValue: mockContactService },
        {
          provide: SiteSettingsService,
          useValue: {
            settings$: of({ nuclearLockdown: false, disableContactForms: false }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    component.sourcePage = 'home';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.contactForm.get('name')?.value).toBe('');
    expect(component.contactForm.get('email')?.value).toBe('');
    expect(component.contactForm.get('subject')?.value).toBe('');
    expect(component.contactForm.get('message')?.value).toBe('');
  });

  it('should validate required fields', () => {
    const form = component.contactForm;
    expect(form.valid).toBeFalsy();

    form.controls['name'].setValue('John Doe');
    form.controls['email'].setValue('john@example.com');
    form.controls['subject'].setValue('Test Subject');
    form.controls['message'].setValue('This is a test message');

    expect(form.valid).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.contactForm.controls['email'];

    emailControl.setValue('invalid-email');
    expect(emailControl.errors?.['email']).toBeTruthy();

    emailControl.setValue('valid@email.com');
    expect(emailControl.errors?.['email']).toBeFalsy();
  });

  it('shows success only when delivered is true and clears the form', fakeAsync(async () => {
    mockContactService.submitContactForm.and.resolveTo({
      success: true,
      delivered: true,
      contactId: 'abc',
      errorType: null,
    });

    component.contactForm.setValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Hello there',
      message: 'This is a sufficiently long message.',
      newsletter: false,
      website: '',
      formTimestamp: Date.now(),
    });

    await component.onSubmit();
    tick();

    expect(component.submitSuccess).toBeTrue();
    expect(component.deliveryFailed).toBeFalse();
    expect(component.contactForm.get('message')?.value).toBeFalsy();
  }));

  it('keeps form values when delivered is false', fakeAsync(async () => {
    mockContactService.submitContactForm.and.resolveTo({
      success: true,
      delivered: false,
      contactId: 'abc',
      errorType: 'delivery_failed',
    });

    const message = 'This is a sufficiently long message.';
    component.contactForm.setValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Hello there',
      message,
      newsletter: false,
      website: '',
      formTimestamp: Date.now(),
    });

    await component.onSubmit();
    tick();

    expect(component.submitSuccess).toBeFalse();
    expect(component.deliveryFailed).toBeTrue();
    expect(component.contactForm.get('message')?.value).toBe(message);
    expect(component.supportEmail).toBe('admin@accessiblewebmedia.com');
  }));

  it('passes sourcePage to the service', fakeAsync(async () => {
    component.sourcePage = 'welcome';
    mockContactService.submitContactForm.and.resolveTo({
      success: true,
      delivered: true,
      contactId: 'xyz',
      errorType: null,
    });

    component.contactForm.setValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Hello there',
      message: 'This is a sufficiently long message.',
      newsletter: false,
      website: '',
      formTimestamp: Date.now(),
    });

    await component.onSubmit();
    tick();

    const payload = mockContactService.submitContactForm.calls.mostRecent().args[0];
    expect(payload.sourcePage).toBe('welcome');
  }));
});
