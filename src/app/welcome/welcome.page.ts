import { Component } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonButton
} from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular/standalone';
import { VersionService } from '../services/version.service';
import { AnalyticsService } from '../services/analytics.service';
import { ContactFormComponent } from '../components/contact-form.component';
import { NewsletterSignupComponent } from '../components/newsletter-signup.component';
import { ContentCarouselComponent } from '../components/content-carousel.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  imports: [IonContent, IonIcon, IonButton, ContactFormComponent, NewsletterSignupComponent, ContentCarouselComponent],
  standalone: true
})
export class WelcomePage {
  version: string;

  constructor(
    private versionService: VersionService,
    private analyticsService: AnalyticsService,
    private menuController: MenuController
  ) {
    this.version = this.versionService.getVersion();
    this.analyticsService.trackPageView('/welcome').catch(() => {
      // Ignore tracking errors; already logged by service
    });
  }

  async openMenu() {
    try {
      await this.menuController.enable(true, 'main-menu');
      await this.menuController.open('main-menu');
    } catch (error) {
      console.error('Error opening menu:', error);
    }
  }
}
