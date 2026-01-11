import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-accessibility',
  templateUrl: './accessibility.page.html',
  styleUrls: ['./accessibility.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    PageHeaderWithMenuComponent,
    FooterComponent
  ]
})
export class AccessibilityPage {
  version: string;

  constructor(private versionService: VersionService) {
    this.version = this.versionService.getVersion();
  }
}
