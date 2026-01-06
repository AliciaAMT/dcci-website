import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { ContactFormComponent } from '../components/contact-form.component';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    ContactFormComponent,
    PageHeaderWithMenuComponent,
    FooterComponent
  ]
})
export class ContactPage {
  version: string;

  constructor(
    private versionService: VersionService,
    private router: Router
  ) {
    this.version = this.versionService.getVersion();
  }

  async navigateToWelcomeContact() {
    await this.router.navigate(['/welcome']);
    // Scroll to contact form after navigation
    setTimeout(() => {
      const element = document.getElementById('contact-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }
}

