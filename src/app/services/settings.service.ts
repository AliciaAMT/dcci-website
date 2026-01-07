import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface YouTubeSettings {
  automaticArticlesEnabled: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_DOC_ID = 'youtubeSettings';

  constructor(
    private firestore: Firestore,
    private injector: Injector
  ) {}

  /**
   * Get YouTube settings from Firestore
   */
  async getYouTubeSettings(): Promise<YouTubeSettings> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const settingsDoc = await getDoc(doc(this.firestore, 'settings', this.SETTINGS_DOC_ID));
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as any;
          return {
            automaticArticlesEnabled: data.automaticArticlesEnabled ?? true, // Default to enabled
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            updatedBy: data.updatedBy
          };
        } else {
          // Return default settings if document doesn't exist
          return {
            automaticArticlesEnabled: true // Default to enabled
          };
        }
      } catch (error) {
        console.error('Error getting YouTube settings:', error);
        // Return default settings on error
        return {
          automaticArticlesEnabled: true
        };
      }
    });
  }

  /**
   * Get YouTube settings as Observable
   */
  getYouTubeSettings$(): Observable<YouTubeSettings> {
    return from(this.getYouTubeSettings());
  }

  /**
   * Update YouTube settings
   */
  async updateYouTubeSettings(settings: Partial<YouTubeSettings>, updatedBy?: string): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const settingsRef = doc(this.firestore, 'settings', this.SETTINGS_DOC_ID);
        
        // Get current settings directly (avoid nested injection context)
        let currentData: any = {};
        try {
          const currentDoc = await getDoc(settingsRef);
          if (currentDoc.exists()) {
            currentData = currentDoc.data();
          }
        } catch (e) {
          // If document doesn't exist, use defaults
          console.log('Settings document does not exist yet, using defaults');
        }
        
        await setDoc(settingsRef, {
          automaticArticlesEnabled: settings.automaticArticlesEnabled ?? currentData.automaticArticlesEnabled ?? true,
          updatedAt: serverTimestamp(),
          updatedBy: updatedBy || null
        }, { merge: true });
      } catch (error) {
        console.error('Error updating YouTube settings:', error);
        throw error;
      }
    });
  }

  /**
   * Check if automatic YouTube articles are enabled
   * This is a convenience method for the Cloud Function
   */
  async isAutomaticArticlesEnabled(): Promise<boolean> {
    const settings = await this.getYouTubeSettings();
    return settings.automaticArticlesEnabled ?? true;
  }
}

