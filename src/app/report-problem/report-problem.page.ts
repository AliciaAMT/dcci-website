import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { WebsiteProblemReportComponent } from '../components/website-problem-report.component';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-report-problem',
  templateUrl: './report-problem.page.html',
  styleUrls: ['./report-problem.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    PageHeaderWithMenuComponent,
    FooterComponent,
    WebsiteProblemReportComponent
  ]
})
export class ReportProblemPage {
  version: string;

  constructor(private versionService: VersionService) {
    this.version = this.versionService.getVersion();
  }
}
