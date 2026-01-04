import { Component } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon
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
  imports: [IonContent, IonButton, IonIcon, ContactFormComponent, NewsletterSignupComponent, ContentCarouselComponent],
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
      // Ensure menu is enabled
      await this.menuController.enable(true, 'main-menu');

      // Wait a bit for the menu to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to open the menu
      const isOpen = await this.menuController.isOpen('main-menu');
      if (!isOpen) {
        const result = await this.menuController.open('main-menu');
        console.log('Menu open result:', result);
        if (!result) {
          // If open() didn't work, try toggle
          await this.menuController.toggle('main-menu');
        }
      } else {
        // If already open, close it
        await this.menuController.close('main-menu');
      }
    } catch (error) {
      console.error('Error opening menu:', error);
      // Last resort: try toggle
      try {
        await this.menuController.toggle('main-menu');
      } catch (toggleError) {
        console.error('Toggle also failed:', toggleError);
      }
    }
  }
}
