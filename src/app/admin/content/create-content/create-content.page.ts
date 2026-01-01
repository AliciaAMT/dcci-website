import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonLabel,
  IonItem,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonChip,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../../services/auth';
import { ContentService } from '../../../services/content.service';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-create-content',
  templateUrl: './create-content.page.html',
  styleUrls: ['./create-content.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonLabel,
    IonItem,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonBackButton,
    IonButtons,
    IonChip,
    CommonModule,
    FormsModule,
    QuillModule
  ],
  providers: [ContentService]
})
export class CreateContentPage implements OnInit {
  title: string = '';
  excerpt: string = '';
  content: string = '';
  tagsInput: string = '';
  tags: string[] = [];
  slug: string = '';
  showSlugField: boolean = false;
  currentUser: AdminUser | null = null;
  isSaving: boolean = false;
  isPublishing: boolean = false;
  savedContentId: string | null = null;
  isEditMode: boolean = false;

  // Quill editor configuration
  quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{
        'font': [
          'arial',
          'helvetica',
          'times-new-roman',
          'courier-new',
          'georgia',
          'verdana',
          'trebuchet-ms',
          'comic-sans-ms',
          'impact',
          'lucida-console',
          'tahoma',
          'palatino',
          'garamond',
          'bookman',
          'roboto',
          'open-sans',
          'lato',
          'montserrat',
          'raleway',
          'merriweather',
          'playfair-display',
          'source-sans-pro',
          'poppins',
          'oswald',
          'ubuntu'
        ]
      }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ]
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    public contentService: ContentService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Configure Quill fonts
    this.configureQuillFonts();
    // Register custom video handler for YouTube/Vimeo
    this.registerVideoHandler();
  }

  private configureQuillFonts() {
    // Quill 2.x requires fonts to be whitelisted
    const Font = Quill.import('formats/font') as any;
    if (Font && Font.whitelist) {
      Font.whitelist = [
        'arial',
        'helvetica',
        'times-new-roman',
        'courier-new',
        'georgia',
        'verdana',
        'trebuchet-ms',
        'comic-sans-ms',
        'impact',
        'lucida-console',
        'tahoma',
        'palatino',
        'garamond',
        'bookman',
        'roboto',
        'open-sans',
        'lato',
        'montserrat',
        'raleway',
        'merriweather',
        'playfair-display',
        'source-sans-pro',
        'poppins',
        'oswald',
        'ubuntu'
      ];
      Quill.register(Font, true);
    }
  }

  private registerVideoHandler() {
    // This will be called when the editor is created
    // We'll handle video embedding in onEditorCreated
  }

  onEditorCreated(quill: any) {
    // Custom video button handler for YouTube/Vimeo support
    const toolbar = quill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('video', () => {
        const url = prompt('Enter video URL (YouTube, Vimeo, or direct video link):');
        if (url) {
          // Parse YouTube URL
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          const youtubeMatch = url.match(youtubeRegex);

          // Parse Vimeo URL
          const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
          const vimeoMatch = url.match(vimeoRegex);

          const range = quill.getSelection(true);

          if (youtubeMatch) {
            // Insert YouTube iframe
            const embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
            const iframe = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen width="100%" height="400" style="max-width: 100%;"></iframe>`;
            quill.clipboard.dangerouslyPasteHTML(range.index, `<div class="ql-video-wrapper">${iframe}</div>`);
          } else if (vimeoMatch) {
            // Insert Vimeo iframe
            const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            const iframe = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen width="100%" height="400" style="max-width: 100%;"></iframe>`;
            quill.clipboard.dangerouslyPasteHTML(range.index, `<div class="ql-video-wrapper">${iframe}</div>`);
          } else {
            // Use default video embed for direct video URLs
            quill.insertEmbed(range.index, 'video', url, 'user');
          }

          quill.setSelection(range.index + 1, 'silent');
        }
      });
    }
  }

  async ngOnInit() {
    // Verify user is admin and load user data
    // Wait for non-null user (filter out null values to ensure auth is ready)
    const user = await firstValueFrom(
      this.authService.currentUser$.pipe(
        filter(u => u !== null),
        take(1)
      )
    );
    if (!user || !user.isAdmin || !user.emailVerified) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.currentUser = user;

    // Check if we're editing an existing content
    const url = this.router.url;
    if (url.includes('/edit/')) {
      const contentId = url.split('/edit/')[1];
      if (contentId) {
        await this.loadContentForEdit(contentId);
      }
    }
  }

  async loadContentForEdit(contentId: string) {
    try {
      const content = await this.contentService.getContent(contentId);
      if (content) {
        this.isEditMode = true;
        this.savedContentId = content.id || null;
        this.title = content.title;
        this.excerpt = content.excerpt || '';
        this.content = content.content;
        this.tags = content.tags || [];
        this.tagsInput = this.tags.map(tag => tag.replace(/^#/, '')).join(', ');
        this.slug = content.slug || '';
        this.showSlugField = true; // Show slug field when editing
      }
    } catch (error) {
      console.error('Error loading content for edit:', error);
      await this.showToast('Failed to load content', 'danger');
    }
  }

  onTagsInput() {
    // Parse tags from input - split by comma and clean up
    this.tags = this.tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => {
        // Add # if not present
        if (tag.startsWith('#')) {
          return tag;
        }
        return '#' + tag;
      });
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  private validateForm(): boolean {
    if (!this.title.trim()) {
      this.showToast('Please enter a title', 'danger');
      return false;
    }
    if (!this.content.trim()) {
      this.showToast('Please enter content', 'danger');
      return false;
    }
    return true;
  }

  async saveDraft() {
    if (!this.validateForm()) {
      return;
    }

    // Ensure auth is ready before writing
    if (!this.currentUser) {
      // Wait for user to load if not ready
      const user = await firstValueFrom(
        this.authService.currentUser$.pipe(
          filter(u => u !== null),
          take(1)
        )
      );
      if (!user || !user.isAdmin) {
        this.showToast('User not authenticated or not an admin', 'danger');
        return;
      }
      this.currentUser = user;
    }

    // Debug: Check admin status
    if (!this.currentUser.isAdmin) {
      console.error('[CreateContent] User is not an admin:', this.currentUser);
      this.showToast('You do not have admin privileges', 'danger');
      return;
    }

    // Debug logging
    console.log('[CreateContent] Current user:', {
      uid: this.currentUser.uid,
      email: this.currentUser.email,
      isAdmin: this.currentUser.isAdmin,
      emailVerified: this.currentUser.emailVerified
    });
    console.log('[CreateContent] Admin check: User should have adminUsers/' + this.currentUser.uid + ' with isAdmin=true');

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Saving draft...'
    });
    await loading.present();

    try {
      if (this.savedContentId) {
        // Update existing draft
        console.log('[CreateContent] Updating existing draft, ID:', this.savedContentId);
        console.log('[CreateContent] Current user UID (will be preserved from existing doc):', this.currentUser.uid);
        await this.contentService.updateDraft(this.savedContentId, {
          title: this.title.trim(),
          excerpt: this.excerpt.trim(),
          content: this.content.trim(),
          status: 'draft',
          // Note: authorId/authorEmail passed here will be overridden by service to preserve original values
          authorId: this.currentUser.uid,
          authorEmail: this.currentUser.email,
          tags: this.tags.length > 0 ? this.tags : undefined
        }, this.slug.trim() || undefined);
        await this.showToast('Draft updated successfully');
      } else {
        // Create new draft
        console.log('[CreateContent] Creating new draft');
        console.log('[CreateContent] Current user UID (will be used as authorId):', this.currentUser.uid);
        this.savedContentId = await this.contentService.saveDraft({
          title: this.title.trim(),
          excerpt: this.excerpt.trim(),
          content: this.content.trim(),
          status: 'draft',
          authorId: this.currentUser.uid,
          authorEmail: this.currentUser.email,
          tags: this.tags.length > 0 ? this.tags : undefined
        }, this.slug.trim() || undefined);
        await this.showToast('Draft saved successfully');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      await this.showToast('Failed to save draft. Please try again.', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }

  async publish() {
    if (!this.validateForm()) {
      return;
    }

    // Ensure auth is ready before writing
    if (!this.currentUser) {
      // Wait for user to load if not ready
      const user = await firstValueFrom(
        this.authService.currentUser$.pipe(
          filter(u => u !== null),
          take(1)
        )
      );
      if (!user || !user.isAdmin) {
        this.showToast('User not authenticated or not an admin', 'danger');
        return;
      }
      this.currentUser = user;
    }

    this.isPublishing = true;
    const loading = await this.loadingController.create({
      message: 'Publishing content...'
    });
    await loading.present();

    try {
      const isUpdate = !!this.savedContentId;
      console.log('[CreateContent] Publishing content');
      console.log('[CreateContent] Operation:', isUpdate ? 'UPDATE (existing document)' : 'CREATE (new document)');
      console.log('[CreateContent] Document ID:', this.savedContentId || '(new document)');
      console.log('[CreateContent] Current user UID:', this.currentUser.uid);
      if (isUpdate) {
        console.log('[CreateContent] Note: authorId will be preserved from existing document (immutable)');
      } else {
        console.log('[CreateContent] Note: authorId will be set to current user (new document)');
      }
      
      const contentId = await this.contentService.publish({
        title: this.title.trim(),
        excerpt: this.excerpt.trim(),
        content: this.content.trim(),
        status: 'published',
        // Note: For updates, authorId will be preserved from existing doc by service
        // For creates, this authorId will be used
        authorId: this.currentUser.uid,
        authorEmail: this.currentUser.email,
        tags: this.tags.length > 0 ? this.tags : undefined
      }, this.savedContentId || undefined, this.slug.trim() || undefined);

      this.savedContentId = contentId;
      await this.showToast('Content published successfully!');

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        this.router.navigate(['/admin/dashboard']);
      }, 1500);
    } catch (error) {
      console.error('Error publishing content:', error);
      await this.showToast('Failed to publish content. Please try again.', 'danger');
    } finally {
      this.isPublishing = false;
      await loading.dismiss();
    }
  }

  cancel() {
    this.router.navigate(['/admin/dashboard']);
  }
}

