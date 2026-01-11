import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';

@Component({
  selector: 'app-content-carousel',
  templateUrl: './content-carousel.component.html',
  styleUrls: ['./content-carousel.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class ContentCarouselComponent implements OnInit, OnDestroy {
  contentItems: Content[] = [];
  currentIndex = 0;
  isLoading = true;
  error: string | null = null;

  constructor(private contentService: ContentService) {}

  async ngOnInit() {
    await this.loadContent();
  }

  ngOnDestroy() {}

  private async loadContent() {
    try {
      this.isLoading = true;
      this.error = null;
      let allContent = await this.contentService.getPublishedContent();

      // Filter out archived content
      this.contentItems = allContent.filter(content => {
        const data = content as any;
        return data.archive !== true;
      });

      // Sort by date (newest first) - should already be sorted, but ensure it
      this.contentItems.sort((a, b) => {
        const aDate = a.publishedAt || a.createdAt;
        const bDate = b.publishedAt || b.createdAt;
        const aTime = this.getTime(aDate);
        const bTime = this.getTime(bDate);
        return bTime - aTime;
      });

      if (this.contentItems.length === 0) {
        this.error = 'No content available';
      }
    } catch (err) {
      console.error('Error loading content:', err);
      this.error = 'Failed to load content';
    } finally {
      this.isLoading = false;
    }
  }

  private getTime(date: Date | any): number {
    if (!date) return 0;
    if (date instanceof Date) return date.getTime();
    if (date && typeof date.toDate === 'function') {
      return date.toDate().getTime();
    }
    return new Date(date).getTime();
  }

  get currentContent(): Content | null {
    if (this.contentItems.length === 0) return null;
    return this.contentItems[this.currentIndex];
  }

  get hasNext(): boolean {
    return this.currentIndex < this.contentItems.length - 1;
  }

  get hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  next() {
    if (this.hasNext) {
      this.currentIndex++;
    }
  }

  previous() {
    if (this.hasPrevious) {
      this.currentIndex--;
    }
  }

  getThumbnailUrl(content: Content): string | null {
    // Check for thumbnailUrl (from YouTube sync) or featuredImage
    const data = content as any;
    return data.thumbnailUrl || content.featuredImage || null;
  }

  getContentLink(content: Content): string | null {
    // Always link to article page if slug exists
    if (content.slug) {
      return `/article/${content.slug}`;
    }
    return null;
  }

  isExcerptTruncated(content: Content): boolean {
    // Check if excerpt exists and is likely truncated (longer than ~120 chars)
    if (!content.excerpt) return false;
    return content.excerpt.length > 120;
  }
}

