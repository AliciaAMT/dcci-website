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
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  AlertController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SiteSettingsService, EmergencySiteSettings } from '../../services/site-settings.service';
import { AuthService } from '../../services/auth';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-emergency-controls',
  templateUrl: './emergency-controls.page.html',
  styleUrls: ['./emergency-controls.page.scss'],
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
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    CommonModule,
    FormsModule
  ]
})
export class EmergencyControlsPage implements OnInit, OnDestroy {
  settings: EmergencySiteSettings = {
    maintenanceMode: false,
    disableRegistrations: false,
    disableComments: false,
    disableContactForms: false,
    readOnlyMode: false,
    nuclearLockdown: false
  };
  isLoading = false;
  isSaving = false;
  private settingsSubscription: Subscription = new Subscription();

  constructor(
    private siteSettingsService: SiteSettingsService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Subscribe to current settings
    this.settingsSubscription = this.siteSettingsService.settings$.subscribe(settings => {
      this.settings = { ...settings };
    });
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  async onToggleChange(field: keyof EmergencySiteSettings, event?: any) {
    // Get the new value from the event or from the current settings (ngModel already updated it)
    const newValue = event?.detail?.checked !== undefined ? event.detail.checked : this.settings[field];

    // Show confirmation for critical settings
    if ((field === 'maintenanceMode' || field === 'readOnlyMode') && newValue) {
      const confirmed = await this.confirmCriticalChange(field);
      if (!confirmed) {
        // Reset toggle to previous value
        this.settings[field] = !newValue;
        return;
      }
    }

    // Nuclear lockdown requires special confirmation
    if (field === 'nuclearLockdown') {
      if (newValue) {
        // Enabling nuclear lockdown - extreme warning
        const confirmed = await this.confirmNuclearLockdown();
        if (!confirmed) {
          this.settings[field] = false;
          return;
        }
        // Save first, then redirect - user will be locked out
        await this.saveSettings();
        // Small delay to ensure settings are saved, then redirect
        setTimeout(() => {
          this.router.navigate(['/admin/maintenance']);
        }, 500);
        return;
      } else {
        // Trying to disable nuclear lockdown - this should NOT be possible from UI
        // But if they somehow get here, prevent it
        await this.showToast('Nuclear lockdown can only be disabled via Firestore console', 'danger');
        this.settings[field] = true; // Force back to true
        return;
      }
    }

    // Save immediately when toggled
    await this.saveSettings();
  }

  async confirmCriticalChange(field: 'maintenanceMode' | 'readOnlyMode'): Promise<boolean> {
    const fieldName = field === 'maintenanceMode' ? 'Maintenance Mode' : 'Read-Only Mode';
    const alert = await this.alertController.create({
      header: `⚠️ Enable ${fieldName}?`,
      message: `Are you sure you want to enable ${fieldName}? This will ${field === 'maintenanceMode' ? 'lock out all non-admin users' : 'prevent all writes by non-admin users'}.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Enable',
          role: 'destructive',
          handler: () => {
            return true;
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== 'cancel';
  }

  async confirmNuclearLockdown(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: '🚨 NUCLEAR LOCKDOWN - LAST RESORT ONLY',
      message: `⚠️ EXTREME WARNING ⚠️

This will IMMEDIATELY block ALL access to the site, including admins. 

The ONLY way to turn this off is by manually editing Firestore and setting nuclearLockdown to false. This requires developer access.

ONLY use this if:
- Site is under active attack
- Severe security breach detected
- You have confirmed with developer they can access Firestore

This action cannot be reversed from the admin panel. Are you ABSOLUTELY certain?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'I UNDERSTAND - ENABLE LOCKDOWN',
          role: 'destructive',
          cssClass: 'danger-button',
          handler: () => {
            return true;
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== 'cancel';
  }

  async confirmDisableNuclearLockdown(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: '⚠️ Disable Nuclear Lockdown?',
      message: `Warning: This setting should only be disabled via Firestore console by a developer. 

If you're seeing this, nuclear lockdown may have been disabled in Firestore. Do you want to confirm the current state?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            return true;
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== 'cancel';
  }

  async saveSettings() {
    if (this.isSaving) return;

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Saving settings...'
    });
    await loading.present();

    try {
      await this.siteSettingsService.updateSettings({
        maintenanceMode: this.settings.maintenanceMode,
        disableRegistrations: this.settings.disableRegistrations,
        disableComments: this.settings.disableComments,
        disableContactForms: this.settings.disableContactForms,
        readOnlyMode: this.settings.readOnlyMode,
        nuclearLockdown: this.settings.nuclearLockdown
      });

      await loading.dismiss();
      await this.showToast('Settings saved successfully', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving settings:', error);
      await this.showToast('Failed to save settings', 'danger');
      // Revert to saved settings on error
      const currentSettings = this.siteSettingsService.getCurrentSettings();
      this.settings = { ...currentSettings };
    } finally {
      this.isSaving = false;
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

