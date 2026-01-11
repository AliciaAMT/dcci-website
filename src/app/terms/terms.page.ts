import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-terms',
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    PageHeaderWithMenuComponent,
    FooterComponent
  ]
})
export class TermsPage {
  version: string;

  constructor(private versionService: VersionService) {
    this.version = this.versionService.getVersion();
  }
}
