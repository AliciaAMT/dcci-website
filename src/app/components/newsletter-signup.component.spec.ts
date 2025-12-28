import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NewsletterSignupComponent } from './newsletter-signup.component';
import { ContactService } from 'src/app/services/contact.service';

describe('NewsletterSignupComponent', () => {
  let component: NewsletterSignupComponent;
  let fixture: ComponentFixture<NewsletterSignupComponent>;
  let mockContactService: jasmine.SpyObj<ContactService>;

  beforeEach(waitForAsync(() => {
    mockContactService = jasmine.createSpyObj('ContactService', ['subscribeToNewsletter']);

    TestBed.configureTestingModule({
      declarations: [NewsletterSignupComponent],
      imports: [IonicModule.forRoot(), ReactiveFormsModule],
      providers: [
        { provide: ContactService, useValue: mockContactService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required form controls', () => {
    expect(component.newsletterForm.get('name')).toBeTruthy();
    expect(component.newsletterForm.get('email')).toBeTruthy();
  });

  it('should validate required fields', () => {
    const nameControl = component.newsletterForm.get('name');
    const emailControl = component.newsletterForm.get('email');

    nameControl?.setValue('');
    emailControl?.setValue('');

    expect(nameControl?.hasError('required')).toBeTruthy();
    expect(emailControl?.hasError('required')).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.newsletterForm.get('email');

    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();

    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should call contact service on valid form submission', async () => {
    mockContactService.subscribeToNewsletter.and.returnValue(Promise.resolve());

    component.newsletterForm.patchValue({
      name: 'John Doe',
      email: 'john@example.com'
    });

    await component.onSubmit();

    expect(mockContactService.subscribeToNewsletter).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com'
    });
  });
});



