import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../services/auth';
import { SettingsService, YouTubeSettings } from '../../services/settings.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-youtube-settings',
  templateUrl: './youtube-settings.page.html',
  styleUrls: ['./youtube-settings.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonIcon,
    IonSpinner,
    CommonModule,
    FormsModule
  ]
})
export class YouTubeSettingsPage implements OnInit, OnDestroy {
  currentUser: AdminUser | null = null;
  settings: YouTubeSettings = {
    automaticArticlesEnabled: true
  };
  isLoading = false;
  isSaving = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private settingsService: SettingsService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user || !user.isAdmin || !user.emailVerified) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.currentUser = user;
    await this.loadSettings();
  }

  ngOnDestroy() {}

  async loadSettings() {
    this.isLoading = true;
    try {
      this.settings = await this.settingsService.getYouTubeSettings();
    } catch (error) {
      console.error('Error loading YouTube settings:', error);
      await this.showToast('Failed to load settings', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onToggleChange() {
    // Don't save immediately on toggle - wait for save button
  }

  async saveSettings() {
    if (this.isSaving) return;

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Saving settings...'
    });
    await loading.present();

    try {
      await this.settingsService.updateYouTubeSettings(
        {
          automaticArticlesEnabled: this.settings.automaticArticlesEnabled
        },
        this.currentUser?.email || undefined
      );

      await loading.dismiss();
      await this.showToast('Settings saved successfully', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving settings:', error);
      await this.showToast('Failed to save settings', 'danger');
    } finally {
      this.isSaving = false;
    }
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

