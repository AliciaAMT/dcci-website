import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonSpinner, IonCheckbox } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';

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
    IonCheckbox,
    PageHeaderWithMenuComponent,
    FooterComponent
  ]
})
export class ArticlesPage implements OnInit, OnDestroy {
  articles: Content[] = [];
  filteredArticles: Content[] = [];
  isLoading = true;
  searchTerm = '';
  searchType: 'all' | 'title' | 'content' | 'tags' | 'date' = 'all';
  showYouTubeArticles = true; // Default to showing YouTube articles
  sortOption: 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' = 'date-desc'; // Default: newest first
  activeTag: string | null = null;
  version: string;

  constructor(
    private contentService: ContentService,
    private router: Router,
    private route: ActivatedRoute,
    private versionService: VersionService
  ) {
    this.version = this.versionService.getVersion();
  }

  async ngOnInit() {
    // Check for tag filter in query params (check snapshot first for initial load)
    const tagParam = this.route.snapshot.queryParams['tag'];
    if (tagParam) {
      this.activeTag = tagParam;
      this.searchTerm = tagParam;
      this.searchType = 'tags';
    }

    // Subscribe to query param changes
    this.route.queryParams.subscribe(params => {
      if (params['tag']) {
        this.activeTag = params['tag'];
        this.searchTerm = params['tag'];
        this.searchType = 'tags';
      } else {
        this.activeTag = null;
        if (!this.searchTerm) {
          this.searchType = 'all';
        }
      }
      // Re-filter when query params change
      if (this.articles.length > 0) {
        this.filterArticles();
      }
    });
    
    await this.loadArticles();
  }

  ngOnDestroy() {}

  private async loadArticles() {
    try {
      this.isLoading = true;
      this.articles = await this.contentService.getPublishedContent();
      this.filterArticles(); // Apply filtering and sorting
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

  onYouTubeFilterChange() {
    this.filterArticles();
  }

  onSortChange() {
    this.filterArticles();
  }

  private isYouTubeArticle(article: Content): boolean {
    const data = article as any;
    return data.type === 'youtube' || !!data.youtubeVideoId || !!data.youtubeUrl;
  }

  private filterArticles() {
    let filtered = [...this.articles];

    // Filter by YouTube status first
    if (!this.showYouTubeArticles) {
      filtered = filtered.filter(article => !this.isYouTubeArticle(article));
    }

    // Filter by tag if activeTag is set (exact match)
    if (this.activeTag) {
      const tagLower = this.activeTag.toLowerCase();
      filtered = filtered.filter(article => {
        return article.tags?.some(tag => tag.toLowerCase() === tagLower);
      });
    }

    // Then filter by search term if provided (and no active tag)
    if (this.searchTerm.trim() && !this.activeTag) {
      const searchLower = this.searchTerm.toLowerCase().trim();

      filtered = filtered.filter(article => {
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

    // Apply sorting
    this.filteredArticles = this.sortArticles(filtered);
  }

  clearTagFilter() {
    this.activeTag = null;
    this.searchTerm = '';
    this.searchType = 'all';
    this.router.navigate(['/articles'], { queryParams: {} });
    this.filterArticles();
  }

  private sortArticles(articles: Content[]): Content[] {
    const sorted = [...articles];

    switch (this.sortOption) {
      case 'date-desc': // Newest first
        return sorted.sort((a, b) => {
          const dateA = this.getDate(a.publishedAt || a.createdAt);
          const dateB = this.getDate(b.publishedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      case 'date-asc': // Oldest first
        return sorted.sort((a, b) => {
          const dateA = this.getDate(a.publishedAt || a.createdAt);
          const dateB = this.getDate(b.publishedAt || b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });

      case 'title-asc': // A-Z
        return sorted.sort((a, b) => {
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });

      case 'title-desc': // Z-A
        return sorted.sort((a, b) => {
          return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
        });

      default:
        return sorted;
    }
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

