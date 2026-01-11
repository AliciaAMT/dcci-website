import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { WebsiteProblemReportComponent } from '../components/website-problem-report.component';
import { VersionService } from '../services/version.service';
import { ScrollService } from '../services/scroll.service';

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
export class ReportProblemPage implements AfterViewInit {
  @ViewChild(IonContent) content!: IonContent;
  version: string;

  constructor(
    private versionService: VersionService,
    private scrollService: ScrollService
  ) {
    this.version = this.versionService.getVersion();
  }

  async ngAfterViewInit() {
    // Register scroll container for collapsing header
    if (this.content) {
      await this.scrollService.registerScrollContainer(this.content);
    }
  }
}
