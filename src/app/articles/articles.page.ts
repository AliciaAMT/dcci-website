import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';
import { PageHeaderComponent } from '../components/page-header.component';

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner,
    PageHeaderComponent
  ]
})
export class ArticlesPage implements OnInit, OnDestroy {
  articles: Content[] = [];
  filteredArticles: Content[] = [];
  isLoading = true;
  searchTerm = '';
  searchType: 'all' | 'title' | 'content' | 'tags' | 'date' = 'all';

  constructor(
    private contentService: ContentService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadArticles();
  }

  ngOnDestroy() {}

  private async loadArticles() {
    try {
      this.isLoading = true;
      this.articles = await this.contentService.getPublishedContent();
      this.filteredArticles = [...this.articles];
    } catch (err) {
      console.error('Error loading articles:', err);
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange() {
    this.filterArticles();
  }

  onSearchTypeChange() {
    this.filterArticles();
  }

  private filterArticles() {
    if (!this.searchTerm.trim()) {
      this.filteredArticles = [...this.articles];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();

    this.filteredArticles = this.articles.filter(article => {
      if (this.searchType === 'all' || this.searchType === 'title') {
        if (article.title.toLowerCase().includes(searchLower)) return true;
      }
      
      if (this.searchType === 'all' || this.searchType === 'content') {
        const contentText = article.content?.replace(/<[^>]*>/g, '').toLowerCase() || '';
        if (contentText.includes(searchLower)) return true;
        if (article.excerpt?.toLowerCase().includes(searchLower)) return true;
      }
      
      if (this.searchType === 'all' || this.searchType === 'tags') {
        if (article.tags?.some(tag => tag.toLowerCase().includes(searchLower))) return true;
      }
      
      if (this.searchType === 'date') {
        const dateStr = this.getDateString(article.publishedAt || article.createdAt);
        if (dateStr.includes(searchLower)) return true;
      }
      
      return false;
    });
  }

  getDateString(date: Date | any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getDate(date: Date | any): Date {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    return new Date(date);
  }

  navigateToArticle(slug: string) {
    this.router.navigate(['/article', slug]);
  }

  getThumbnailUrl(article: Content): string | null {
    const data = article as any;
    return data.thumbnailUrl || article.featuredImage || null;
  }
}

