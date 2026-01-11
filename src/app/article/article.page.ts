import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';
import { FooterComponent } from '../components/footer.component';
import { VersionService } from '../services/version.service';
import { ScrollService } from '../services/scroll.service';

@Component({
  selector: 'app-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner, IonIcon, PageHeaderWithMenuComponent, FooterComponent]
})
export class ArticlePage implements OnInit, AfterViewInit {
  @ViewChild(IonContent) ionContent!: IonContent;
  @ViewChild('articleContent', { static: false }) articleContent!: ElementRef;
  content: Content | null = null;
  isLoading = true;
  error: string | null = null;
  sanitizedContent: SafeHtml = '';
  version: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private sanitizer: DomSanitizer,
    private versionService: VersionService,
    private scrollService: ScrollService
  ) {
    this.version = this.versionService.getVersion();
  }

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error = 'Invalid article URL';
      this.isLoading = false;
      return;
    }

    await this.loadContent(slug);
  }

  async ngAfterViewInit() {
    // Register scroll container for collapsing header
    if (this.ionContent) {
      await this.scrollService.registerScrollContainer(this.ionContent);
    }

    // Make videos responsive after view init
    setTimeout(() => this.makeVideosResponsive(), 100);
  }

  private async loadContent(slug: string) {
    try {
      this.isLoading = true;
      this.error = null;

      const loadedContent = await this.contentService.getContentBySlug(slug);

      if (!loadedContent) {
        this.error = 'Article not found';
        this.isLoading = false;
        return;
      }

      // Check if this is an old slug - if so, redirect to new slug
      if (loadedContent.oldSlugs?.includes(slug) && loadedContent.slug && loadedContent.slug !== slug) {
        this.router.navigate(['/article', loadedContent.slug], { replaceUrl: true });
        return;
      }

      this.content = loadedContent;

      // Sanitize the HTML content
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.content.content || '');

      // Make videos responsive after content is set and DOM updates
      setTimeout(() => this.makeVideosResponsive(), 0);
    } catch (err) {
      console.error('Error loading content:', err);
      this.error = 'Failed to load article';
    } finally {
      this.isLoading = false;
    }
  }

  private makeVideosResponsive() {
    if (!this.articleContent) return;

    const container = this.articleContent.nativeElement;
    const iframes = container.querySelectorAll('iframe');

    iframes.forEach((iframe: HTMLIFrameElement) => {
      const src = iframe.getAttribute('src') || '';

      // Detect YouTube embeds
      const isYouTube = src.includes('youtube.com/embed') ||
                       src.includes('youtube-nocookie.com/embed') ||
                       src.includes('youtu.be');

      if (isYouTube) {
        // Remove fixed width/height attributes
        iframe.removeAttribute('width');
        iframe.removeAttribute('height');

        // Add class and data attribute
        iframe.classList.add('responsive-video-iframe');
        iframe.setAttribute('data-yt-embed', 'true');

        // Set iframe styles
        iframe.style.width = '100%';
        iframe.style.height = '100%';

        // Wrap in responsive-video-wrapper if not already wrapped
        const existingWrapper = iframe.closest('.responsive-video-wrapper');
        if (!existingWrapper) {
          const wrapper = document.createElement('div');
          wrapper.className = 'responsive-video-wrapper';
          iframe.parentNode?.insertBefore(wrapper, iframe);
          wrapper.appendChild(iframe);
        }
      }
    });
  }

  goHome() {
    this.router.navigate(['/welcome']);
  }

  getThumbnailUrl(content: Content): string | null {
    const data = content as any;
    return data.thumbnailUrl || content.featuredImage || null;
  }

  isArchived(content: Content): boolean {
    const data = content as any;
    return data.archive === true;
  }

  getOriginalDate(content: Content): Date | null {
    if (!this.isArchived(content)) return null;
    const data = content as any;
    if (!data.originalDate) return null;

    // Handle Firestore Timestamp or Date
    if (data.originalDate instanceof Date) {
      return data.originalDate;
    } else if (data.originalDate && typeof (data.originalDate as any).toDate === 'function') {
      return (data.originalDate as any).toDate();
    } else if (data.originalDate) {
      return new Date(data.originalDate);
    }
    return null;
  }

  formatOriginalDate(content: Content): string | null {
    const date = this.getOriginalDate(content);
    if (!date) return null;

    try {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }

  getOriginalAuthor(content: Content): string | null {
    if (!this.isArchived(content)) return null;
    const data = content as any;
    return data.originalAuthor || null;
  }

  getArchiveSource(content: Content): string | null {
    if (!this.isArchived(content)) return null;
    const data = content as any;
    return data.archiveSource || 'wayback machine';
  }

  onTagClick(tag: string) {
    this.router.navigate(['/articles'], { queryParams: { tag: tag } });
  }
}
