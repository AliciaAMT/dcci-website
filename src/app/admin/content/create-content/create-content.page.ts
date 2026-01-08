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
  IonSpinner,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../../services/auth';
import { ContentService } from '../../../services/content.service';
import { SiteSettingsService } from '../../../services/site-settings.service';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

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
    IonSpinner,
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
  thumbnailUrl: string = '';
  thumbnailFile: File | null = null;
  isUploadingThumbnail: boolean = false;
  readOnlyMode: boolean = false;

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
    private siteSettingsService: SiteSettingsService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private storage: Storage
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
    // Subscribe to read-only mode
    this.siteSettingsService.readOnlyMode$.subscribe(readOnly => {
      this.readOnlyMode = readOnly;
    });

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
        // Load thumbnail URL
        const data = content as any;
        this.thumbnailUrl = data.thumbnailUrl || content.featuredImage || '';
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

  onThumbnailSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select an image file', 'danger');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('Image size must be less than 5MB', 'danger');
        return;
      }
      
      this.thumbnailFile = file;
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.thumbnailUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadThumbnail(): Promise<string | null> {
    // If no new file selected, return existing thumbnail URL (or null)
    if (!this.thumbnailFile) {
      // Return existing thumbnailUrl if it's already a URL (starts with http/https)
      // This preserves existing thumbnails when editing without changing them
      if (this.thumbnailUrl && (this.thumbnailUrl.startsWith('http://') || this.thumbnailUrl.startsWith('https://'))) {
        return this.thumbnailUrl;
      }
      // If thumbnailUrl is empty or was removed, return null
      return null;
    }

    if (!this.currentUser) {
      await this.showToast('User not authenticated', 'danger');
      return null;
    }

    this.isUploadingThumbnail = true;
    
    try {
      // Ensure user is authenticated
      if (!this.currentUser || !this.currentUser.uid) {
        await this.showToast('User not authenticated. Please log in again.', 'danger');
        return null;
      }

      // Create a unique filename with safe characters
      const timestamp = Date.now();
      const sanitizedFileName = this.thumbnailFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `thumbnails/${this.currentUser.uid}/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(this.storage, filename);
      
      // Upload file (metadata is optional and may cause issues if Storage isn't fully configured)
      console.log('[Thumbnail Upload] Starting upload to:', filename);
      console.log('[Thumbnail Upload] File type:', this.thumbnailFile.type);
      console.log('[Thumbnail Upload] File size:', this.thumbnailFile.size, 'bytes');
      
      // Try upload without metadata first (simpler, more compatible)
      await uploadBytes(storageRef, this.thumbnailFile);
      console.log('[Thumbnail Upload] Upload successful');
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('[Thumbnail Upload] Download URL:', downloadURL);
      
      this.thumbnailUrl = downloadURL;
      this.thumbnailFile = null; // Clear file after successful upload
      
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      let errorMessage = 'Failed to upload thumbnail. Please try again.';
      
      // Check for specific error codes
      if (error?.code === 'storage/unauthorized') {
        errorMessage = 'Permission denied. Please ensure you are logged in as an admin.';
      } else if (error?.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please contact support.';
      } else if (error?.code === 'storage/unauthenticated') {
        errorMessage = 'Not authenticated. Please log in again.';
      } else if (error?.message?.includes('CORS') || error?.message?.includes('preflight')) {
        errorMessage = 'Firebase Storage is not enabled. Please enable Storage in Firebase Console and deploy storage rules. See STORAGE_SETUP.md for instructions.';
      } else if (error?.message?.includes('bucket') || error?.code === 'storage/unknown') {
        errorMessage = 'Firebase Storage is not set up. Please enable Storage in Firebase Console.';
      }
      
      // Log full error for debugging
      console.error('[Thumbnail Upload] Full error object:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      await this.showToast(errorMessage, 'danger');
      return null;
    } finally {
      this.isUploadingThumbnail = false;
    }
  }

  removeThumbnail() {
    this.thumbnailUrl = '';
    this.thumbnailFile = null;
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
    // Check if read-only mode is enabled (admins can still write, this is just UI check)
    // Firestore rules are authoritative
    if (this.readOnlyMode) {
      await this.showToast('Site is in read-only mode. Save disabled.', 'danger');
      return;
    }

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
      // Upload thumbnail if a new file was selected
      // Note: If Storage isn't enabled, this will fail gracefully
      const thumbnailUrl = await this.uploadThumbnail();
      
      // If upload failed but we have a file, warn user but continue
      if (this.thumbnailFile && !thumbnailUrl) {
        const continueWithoutThumbnail = confirm(
          'Thumbnail upload failed. This usually means Firebase Storage is not enabled.\n\n' +
          'Would you like to continue publishing without a thumbnail?\n\n' +
          'To fix this:\n' +
          '1. Go to Firebase Console → Storage\n' +
          '2. Click "Get Started" to enable Storage\n' +
          '3. Run: firebase deploy --only storage\n\n' +
          'See STORAGE_SETUP.md for detailed instructions.'
        );
        if (!continueWithoutThumbnail) {
          this.isSaving = false;
          await loading.dismiss();
          return;
        }
      }
      
      const contentData: any = {
        title: this.title.trim(),
        excerpt: this.excerpt.trim(),
        content: this.content.trim(),
        status: 'draft',
        authorId: this.currentUser.uid,
        authorEmail: this.currentUser.email,
        tags: this.tags.length > 0 ? this.tags : undefined
      };
      
      // Add thumbnailUrl (include null to allow clearing)
      contentData.thumbnailUrl = thumbnailUrl || null;

      if (this.savedContentId) {
        // Update existing draft
        console.log('[CreateContent] Updating existing draft, ID:', this.savedContentId);
        console.log('[CreateContent] Current user UID (will be preserved from existing doc):', this.currentUser.uid);
        await this.contentService.updateDraft(this.savedContentId, contentData, this.slug.trim() || undefined);
        await this.showToast('Draft updated successfully');
      } else {
        // Create new draft
        console.log('[CreateContent] Creating new draft');
        console.log('[CreateContent] Current user UID (will be used as authorId):', this.currentUser.uid);
        this.savedContentId = await this.contentService.saveDraft(contentData, this.slug.trim() || undefined);
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
    // Check if read-only mode is enabled (admins can still write, this is just UI check)
    // Firestore rules are authoritative
    const readOnlyMode = await firstValueFrom(this.siteSettingsService.readOnlyMode$);
    if (readOnlyMode) {
      await this.showToast('Site is in read-only mode. Publish disabled.', 'danger');
      return;
    }

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
      // Upload thumbnail if a new file was selected
      // Note: If Storage isn't enabled, this will fail gracefully
      const thumbnailUrl = await this.uploadThumbnail();
      
      // If upload failed but we have a file, warn user but continue
      if (this.thumbnailFile && !thumbnailUrl) {
        const continueWithoutThumbnail = confirm(
          'Thumbnail upload failed. This usually means Firebase Storage is not enabled.\n\n' +
          'Would you like to continue publishing without a thumbnail?\n\n' +
          'To fix this:\n' +
          '1. Go to Firebase Console → Storage\n' +
          '2. Click "Get Started" to enable Storage\n' +
          '3. Run: firebase deploy --only storage\n\n' +
          'See STORAGE_SETUP.md for detailed instructions.'
        );
        if (!continueWithoutThumbnail) {
          this.isPublishing = false;
          await loading.dismiss();
          return;
        }
      }
      
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

      const contentData: any = {
        title: this.title.trim(),
        excerpt: this.excerpt.trim(),
        content: this.content.trim(),
        status: 'published',
        authorId: this.currentUser.uid,
        authorEmail: this.currentUser.email,
        tags: this.tags.length > 0 ? this.tags : undefined
      };
      
      // Add thumbnailUrl (include null to allow clearing)
      contentData.thumbnailUrl = thumbnailUrl || null;

      const contentId = await this.contentService.publish(contentData, this.savedContentId || undefined, this.slug.trim() || undefined);

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

