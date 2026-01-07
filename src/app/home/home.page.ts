import { Component } from '@angular/core';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { VersionService } from '../services/version.service';
import { AnalyticsService } from '../services/analytics.service';
import { ContactFormComponent } from '../components/contact-form.component';
import { NewsletterSignupComponent } from '../components/newsletter-signup.component';
import { FooterComponent } from '../components/footer.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon, ContactFormComponent, NewsletterSignupComponent, FooterComponent],
  standalone: true
})
export class HomePage {
  version: string;

  constructor(
    private versionService: VersionService,
    private analyticsService: AnalyticsService
  ) {
    this.version = this.versionService.getVersion();
    // Fire-and-forget tracking of home page views
    this.analyticsService.trackPageView('/home').catch(() => {
      // Swallow errors; already logged in service
    });
  }
}
