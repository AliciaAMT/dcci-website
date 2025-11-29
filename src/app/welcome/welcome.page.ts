import { Component } from '@angular/core';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { VersionService } from '../services/version.service';
import { AnalyticsService } from '../services/analytics.service';
import { ContactFormComponent } from '../components/contact-form.component';
import { NewsletterSignupComponent } from '../components/newsletter-signup.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  imports: [IonContent, IonIcon, ContactFormComponent, NewsletterSignupComponent],
  standalone: true
})
export class WelcomePage {
  version: string;

  constructor(
    private versionService: VersionService,
    private analyticsService: AnalyticsService
  ) {
    this.version = this.versionService.getVersion();
    this.analyticsService.trackPageView('/welcome').catch(() => {
      // Ignore tracking errors; already logged by service
    });
  }
}
