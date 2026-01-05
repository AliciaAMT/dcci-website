import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { ContentService, Content } from '../services/content.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PageHeaderWithMenuComponent } from '../components/page-header-with-menu.component';

@Component({
  selector: 'app-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner, PageHeaderWithMenuComponent]
})
export class ArticlePage implements OnInit, AfterViewInit {
  @ViewChild('articleContent', { static: false }) articleContent!: ElementRef;
  content: Content | null = null;
  isLoading = true;
  error: string | null = null;
  sanitizedContent: SafeHtml = '';

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
      
      // Process content to make videos responsive
      let processedContent = this.content.content || '';
      
      // Parse HTML to find and wrap iframes
      const doc = new DOMParser().parseFromString(processedContent, 'text/html');
      const iframes = doc.querySelectorAll('iframe');
      
      iframes.forEach((iframe: HTMLIFrameElement) => {
        // Remove fixed width/height
        iframe.removeAttribute('width');
        iframe.removeAttribute('height');
        
        // Ensure proper attributes for video embeds
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
        
        // Normalize YouTube URLs and wrap appropriately
        const src = iframe.getAttribute('src') || '';
        const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
        
        if (isYouTube) {
          let videoId: string | null = null;
          
          // Extract video ID from various YouTube URL patterns
          const watchMatch = src.match(/(?:youtube\.com\/watch\?v=)([^&"'\s]+)/);
          const shortMatch = src.match(/(?:youtu\.be\/)([^?"'\s]+)/);
          const shortsMatch = src.match(/(?:youtube\.com\/shorts\/)([^?"'\s]+)/);
          const embedMatch = src.match(/(?:youtube\.com\/embed\/)([^?"'\s]+)/);
          
          videoId = watchMatch?.[1] || shortMatch?.[1] || shortsMatch?.[1] || embedMatch?.[1] || null;
          
          if (videoId) {
            const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
            embedUrl.searchParams.set('playsinline', '1');
            embedUrl.searchParams.set('rel', '0');
            iframe.setAttribute('src', embedUrl.toString());
          }
          
          // Ensure iframe has full width/height styles
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          
          // Mark iframe as wrapped for CSS targeting
          iframe.setAttribute('data-embed-wrapped', 'true');
          
          // Wrap YouTube iframe in proper structure if not already wrapped
          const existingWrapper = iframe.closest('.video-embed--youtube');
          if (!existingWrapper) {
            // Create outer wrapper
            const videoEmbed = doc.createElement('div');
            videoEmbed.className = 'video-embed video-embed--youtube';
            
            // Create responsive wrapper
            const responsiveWrapper = doc.createElement('div');
            responsiveWrapper.className = 'responsive-video-wrapper';
            
            // Insert wrappers
            if (iframe.parentNode) {
              iframe.parentNode.insertBefore(videoEmbed, iframe);
              videoEmbed.appendChild(responsiveWrapper);
              responsiveWrapper.appendChild(iframe);
            }
          }
        } else {
          // For non-YouTube videos, use simple video-container wrapper
          const parent = iframe.parentElement;
          if (!parent || !parent.classList.contains('video-container')) {
            const wrapper = doc.createElement('div');
            wrapper.className = 'video-container';
            if (iframe.parentNode) {
              iframe.parentNode.insertBefore(wrapper, iframe);
              wrapper.appendChild(iframe);
            }
          }
        }
      });
      
      // Serialize back to HTML
      processedContent = doc.body.innerHTML;
      
      // Sanitize the HTML content
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(processedContent);
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
      // Ensure iframe is wrapped in video-container
      if (!iframe.parentElement?.classList.contains('video-container')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-container';
        iframe.parentNode?.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
      }
    });
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  getThumbnailUrl(content: Content): string | null {
    const data = content as any;
    return data.thumbnailUrl || content.featuredImage || null;
  }
}
