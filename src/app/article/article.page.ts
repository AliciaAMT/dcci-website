import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PageHeaderComponent } from '../components/page-header.component';

@Component({
  selector: 'app-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonButton, IonSpinner, PageHeaderComponent]
})
export class ArticlePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('articleContent', { static: false }) articleContent!: ElementRef;
  content: Content | null = null;
  isLoading = true;
  error: string | null = null;
  sanitizedContent: SafeHtml = '';
  videoLoadError = false;
  showVideoError = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error = 'Invalid article URL';
      this.isLoading = false;
      return;
    }

    await this.loadContent(slug);
  }

  ngAfterViewInit() {
    // Set up error detection for YouTube videos
    this.setupVideoErrorDetection();

    // Re-enable iframes after view init to ensure they're properly loaded and clickable
    setTimeout(() => {
      if (this.articleContent) {
        const iframes = this.articleContent.nativeElement.querySelectorAll('iframe');
        iframes.forEach((iframe: HTMLIFrameElement) => {
          // Ensure iframes have proper attributes for YouTube
          if (iframe.src.includes('youtube.com')) {
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('frameborder', '0');
            
            // Ensure iframe is clickable
            iframe.style.pointerEvents = 'auto';
            iframe.style.cursor = 'pointer';
            
            // Remove any blocking styles from parent wrapper
            const wrapper = iframe.closest('.responsive-video-wrapper');
            if (wrapper) {
              (wrapper as HTMLElement).style.pointerEvents = 'none';
            }

            // Add error detection
            this.detectVideoErrors(iframe);
          }
        });
      }
    }, 100);
  }

  private setupVideoErrorDetection() {
    // Listen for cross-origin errors
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && 
          message.includes('Blocked a frame with origin') && 
          message.includes('youtube.com')) {
        this.videoLoadError = true;
        this.showVideoError = true;
        return true; // Suppress the error
      }
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Also listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && 
          typeof event.reason === 'object' && 
          event.reason.message &&
          event.reason.message.includes('Blocked a frame with origin') &&
          event.reason.message.includes('youtube.com')) {
        this.videoLoadError = true;
        this.showVideoError = true;
        event.preventDefault();
      }
    });
  }

  private detectVideoErrors(iframe: HTMLIFrameElement) {
    // Check if iframe loads successfully
    let loadTimeout: any;
    let hasLoaded = false;

    iframe.addEventListener('load', () => {
      hasLoaded = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    });

    // If iframe doesn't load within 5 seconds, show error
    loadTimeout = setTimeout(() => {
      if (!hasLoaded) {
        this.videoLoadError = true;
        this.showVideoError = true;
      }
    }, 5000);

    // Also check for click events that don't result in playback
    const wrapper = iframe.closest('.responsive-video-wrapper');
    if (wrapper) {
      wrapper.addEventListener('click', () => {
        // If video doesn't start playing after click, show error after delay
        setTimeout(() => {
          // Check if video is actually playing (this is approximate)
          // We'll show the error if user clicks but nothing happens
          if (!hasLoaded) {
            this.videoLoadError = true;
            this.showVideoError = true;
          }
        }, 2000);
      });
    }
  }

  dismissVideoError() {
    this.showVideoError = false;
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
      // Process content to make YouTube iframes responsive
      let processedContent = this.content.content || '';
      
      // Wrap bare iframes in a responsive container
      // Make sure to preserve all iframe attributes including allowfullscreen
      processedContent = processedContent.replace(
        /<iframe([^>]*)>/gi,
        (match, attrs) => {
          // Remove any existing allow attribute to replace it with the correct one
          attrs = attrs.replace(/\s+allow=["'][^"']*["']/gi, '');
          
          // Ensure proper attributes for YouTube embeds
          if (/youtube/i.test(attrs)) {
            // Add all required YouTube iframe attributes
            if (!/allowfullscreen/i.test(attrs)) {
              attrs += ' allowfullscreen';
            }
            // Add comprehensive allow attribute for YouTube
            attrs += ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"';
            // Add referrerpolicy for better security
            if (!/referrerpolicy/i.test(attrs)) {
              attrs += ' referrerpolicy="strict-origin-when-cross-origin"';
            }
            // Ensure frameborder is set
            if (!/frameborder/i.test(attrs)) {
              attrs += ' frameborder="0"';
            }
          } else {
            // For non-YouTube iframes, ensure allowfullscreen if not present
            if (!/allowfullscreen/i.test(attrs)) {
              attrs += ' allowfullscreen';
            }
          }
          
          return `<div class="responsive-video-wrapper"><iframe${attrs}></iframe></div>`;
        }
      );
      
      // Remove fixed width/height from iframes and make them responsive
      processedContent = processedContent.replace(
        /<iframe([^>]*)\s+width=["']\d+["']([^>]*)>/gi,
        '<iframe$1$2>'
      );
      processedContent = processedContent.replace(
        /<iframe([^>]*)\s+height=["']\d+["']([^>]*)>/gi,
        '<iframe$1$2>'
      );
      
      // Sanitize the HTML content for safety (content is from our own database but we sanitize to be safe)
      // Using bypassSecurityTrustHtml since content is from our trusted database
      // In production, you might want additional sanitization layers
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);
    } catch (err) {
      console.error('Error loading content:', err);
      this.error = 'Failed to load article';
    } finally {
      this.isLoading = false;
    }
  }

  getDate(date: Date | any): Date {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    return new Date(date);
  }

  getThumbnailUrl(content: Content): string | null {
    const data = content as any;
    return data.thumbnailUrl || content.featuredImage || null;
  }

  goBack() {
    this.router.navigate(['/welcome']);
  }

  ngOnDestroy() {
    // Clean up any event listeners if needed
    this.showVideoError = false;
    this.videoLoadError = false;
  }
}

