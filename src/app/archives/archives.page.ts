import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { PageHeaderComponent } from '../components/page-header.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';
import { ContentService, Content } from '../services/content.service';

@Component({
  selector: 'app-archives',
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonSpinner, PageHeaderComponent, FooterComponent]
})
export class ArchivesPage implements OnInit {
  version: string;
  archivedArticles: Content[] = [];
  isLoading = true;

  constructor(
    private versionService: VersionService,
    private contentService: ContentService,
    private router: Router
  ) {
    this.version = this.versionService.getVersion();
  }

  async ngOnInit() {
    await this.loadArchivedArticles();
  }

  private async loadArchivedArticles() {
    try {
      this.isLoading = true;
      const allArticles = await this.contentService.getPublishedContent();
      // Filter to only show archived articles
      this.archivedArticles = allArticles.filter(article => {
        const data = article as any;
        return data.archive === true;
      });
    } catch (err) {
      console.error('Error loading archived articles:', err);
    } finally {
      this.isLoading = false;
    }
  }

  navigateToArticle(slug: string) {
    this.router.navigate(['/article', slug]);
  }

  getThumbnailUrl(article: Content): string | null {
    const data = article as any;
    return data.thumbnailUrl || article.featuredImage || null;
  }

  getDateString(date: Date | any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}


