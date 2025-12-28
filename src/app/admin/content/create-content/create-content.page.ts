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
  IonButtons
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';

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
    CommonModule,
    FormsModule,
    QuillModule
  ]
})
export class CreateContentPage implements OnInit {
  title: string = '';
  excerpt: string = '';
  content: string = '';

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
    private authService: AuthService
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

  ngOnInit() {
    // Verify user is admin
    this.authService.currentUser$.subscribe(user => {
      if (!user || !user.isAdmin || !user.emailVerified) {
        this.router.navigate(['/admin/dashboard']);
      }
    });
  }

  async saveDraft() {
    // TODO: Implement save as draft functionality
    console.log('Saving draft...', { title: this.title, excerpt: this.excerpt, content: this.content });
  }

  async publish() {
    // TODO: Implement publish functionality
    console.log('Publishing...', { title: this.title, excerpt: this.excerpt, content: this.content });
  }

  cancel() {
    this.router.navigate(['/admin/dashboard']);
  }
}

