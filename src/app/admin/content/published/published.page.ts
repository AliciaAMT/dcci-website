import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonChip,
  LoadingController,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../../services/auth';
import { ContentService, Content } from '../../../services/content.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-published',
  templateUrl: './published.page.html',
  styleUrls: ['./published.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonChip,
    CommonModule,
    FormsModule
  ]
})
export class PublishedPage implements OnInit, OnDestroy {
  currentUser: AdminUser | null = null;
  published: Content[] = [];
  filteredPublished: Content[] = [];
  isLoading = false;
  searchTerm = '';
  searchType: 'title' | 'content' | 'tags' | 'date' = 'title';
  sortBy: 'date' | 'title' = 'date';

  constructor(
    private router: Router,
    private authService: AuthService,
    private contentService: ContentService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user || !user.isAdmin || !user.emailVerified) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.currentUser = user;
    await this.loadPublished();
  }

  ngOnDestroy() {}

  async loadPublished() {
    this.isLoading = true;
    try {
      this.published = await this.contentService.getPublishedContent();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading published content:', error);
      await this.showToast('Failed to load published content', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onSearch() {
    if (this.searchTerm.trim()) {
      this.isLoading = true;
      try {
        this.filteredPublished = await this.contentService.searchContent(
          'published',
          this.searchTerm,
          this.searchType,
          this.sortBy,
          this.published
        );
      } catch (error) {
        console.error('Error searching published content:', error);
        await this.showToast('Search failed', 'danger');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.applyFilters();
    }
  }

  applyFilters() {
    this.filteredPublished = [...this.published];
    
    // Sort
    if (this.sortBy === 'title') {
      this.filteredPublished.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      this.filteredPublished.sort((a, b) => {
        const aDate = a.publishedAt || a.createdAt;
        const bDate = b.publishedAt || b.createdAt;
        const aTime = aDate instanceof Date ? aDate.getTime() : new Date(aDate as any).getTime();
        const bTime = bDate instanceof Date ? bDate.getTime() : new Date(bDate as any).getTime();
        return bTime - aTime;
      });
    }
  }

  onSortChange() {
    this.applyFilters();
  }

  async editPublished(content: Content) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/edit', content.id]);
  }

  async unpublishContent(content: Content) {
    const alert = await this.alertController.create({
      header: 'Unpublish Article',
      message: `Are you sure you want to unpublish "${content.title}"? It will be moved to drafts.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Unpublish',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Unpublishing...'
            });
            await loading.present();

            try {
              await this.contentService.unpublishContent(content.id!);
              await loading.dismiss();
              await this.showToast('Content unpublished successfully');
              await this.loadPublished();
            } catch (error) {
              await loading.dismiss();
              console.error('Error unpublishing content:', error);
              await this.showToast('Failed to unpublish content', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deletePublished(content: Content) {
    const alert = await this.alertController.create({
      header: 'Delete Article',
      message: `Are you sure you want to delete "${content.title}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting...'
            });
            await loading.present();

            try {
              await this.contentService.deleteContent(content.id!);
              await loading.dismiss();
              await this.showToast('Article deleted successfully');
              await this.loadPublished();
            } catch (error) {
              await loading.dismiss();
              console.error('Error deleting article:', error);
              await this.showToast('Failed to delete article', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  viewPublished(content: Content) {
    // Navigate to view/edit page
    this.router.navigate(['/admin/content/edit', content.id]);
  }

  getDate(date: Date | any): Date {
    if (!date) return new Date();
    if (date instanceof Date) return date;
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    return new Date(date);
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
}

