import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-disclaimer',
  templateUrl: './disclaimer.page.html',
  styleUrls: ['./disclaimer.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    PageHeaderWithMenuComponent,
    FooterComponent
  ]
})
export class DisclaimerPage {
  version: string;

  constructor(private versionService: VersionService) {
    this.version = this.versionService.getVersion();
  }
}
