import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from '@angular/fire/firestore';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

export interface EmergencySiteSettings {
  maintenanceMode: boolean;
  disableRegistrations: boolean;
  disableComments: boolean;
  disableContactForms: boolean;
  disableProblemReports: boolean;
  readOnlyMode: boolean;
  nuclearLockdown: boolean; // Nuclear option: blocks ALL access including admins. Only reversible via Firestore.
  updatedAt?: any;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SiteSettingsService {
  private readonly SETTINGS_DOC_PATH = 'siteSettings/emergency';
  
  // Default settings (fail-safe: if document doesn't exist, act as normal)
  private defaultSettings: EmergencySiteSettings = {
    maintenanceMode: false,
    disableRegistrations: false,
    disableComments: false,
    disableContactForms: false,
    disableProblemReports: false,
    readOnlyMode: false,
    nuclearLockdown: false
  };

  private settingsSubject = new BehaviorSubject<EmergencySiteSettings>(this.defaultSettings);
  public settings$: Observable<EmergencySiteSettings> = this.settingsSubject.asObservable();

  // Convenience observables for specific flags
  public maintenanceMode$: Observable<boolean>;
  public disableRegistrations$: Observable<boolean>;
  public disableComments$: Observable<boolean>;
  public disableContactForms$: Observable<boolean>;
  public disableProblemReports$: Observable<boolean>;
  public readOnlyMode$: Observable<boolean>;
  public nuclearLockdown$: Observable<boolean>;

  private unsubscribe?: () => void;

  constructor(
    private firestore: Firestore,
    private auth: FirebaseAuth,
    private injector: Injector
  ) {
    // Create derived observables
    this.maintenanceMode$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.maintenanceMode));
    });
    
    this.disableRegistrations$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.disableRegistrations));
    });
    
    this.disableComments$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.disableComments));
    });
    
    this.disableContactForms$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.disableContactForms));
    });
    
    this.disableProblemReports$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.disableProblemReports));
    });
    
    this.readOnlyMode$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.readOnlyMode));
    });
    
    this.nuclearLockdown$ = new Observable(subscriber => {
      this.settings$.subscribe(settings => subscriber.next(settings.nuclearLockdown));
    });
  }

  /**
   * Initialize and subscribe to site settings
   * Should be called once on app startup
   */
  initialize(): void {
    if (this.unsubscribe) {
      // Already initialized
      return;
    }

    runInInjectionContext(this.injector, () => {
      const settingsRef = doc(this.firestore, this.SETTINGS_DOC_PATH);
      
      // Subscribe to real-time updates
      this.unsubscribe = onSnapshot(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as EmergencySiteSettings;
            // Ensure all boolean fields are set (fail-safe)
            const settings: EmergencySiteSettings = {
              maintenanceMode: data.maintenanceMode === true,
              disableRegistrations: data.disableRegistrations === true,
              disableComments: data.disableComments === true,
              disableContactForms: data.disableContactForms === true,
              disableProblemReports: data.disableProblemReports === true,
              readOnlyMode: data.readOnlyMode === true,
              nuclearLockdown: data.nuclearLockdown === true,
              updatedAt: data.updatedAt,
              updatedBy: data.updatedBy
            };
            this.settingsSubject.next(settings);
          } else {
            // Document doesn't exist yet - use defaults (fail-safe: behave as normal)
            this.settingsSubject.next(this.defaultSettings);
          }
        },
        (error) => {
          console.error('Error loading site settings:', error);
          // On error, use defaults (fail-safe: behave as normal)
          this.settingsSubject.next(this.defaultSettings);
        }
      );
    });
  }

  /**
   * Get current settings synchronously
   */
  getCurrentSettings(): EmergencySiteSettings {
    return this.settingsSubject.value;
  }

  /**
   * Check if maintenance mode is active
   */
  isMaintenanceMode(): boolean {
    return this.settingsSubject.value.maintenanceMode === true;
  }

  /**
   * Check if registrations are disabled
   */
  areRegistrationsDisabled(): boolean {
    return this.settingsSubject.value.disableRegistrations === true;
  }

  /**
   * Check if comments are disabled
   */
  areCommentsDisabled(): boolean {
    return this.settingsSubject.value.disableComments === true;
  }

  /**
   * Check if contact forms are disabled
   */
  areContactFormsDisabled(): boolean {
    return this.settingsSubject.value.disableContactForms === true;
  }

  /**
   * Check if read-only mode is active
   */
  isReadOnlyMode(): boolean {
    return this.settingsSubject.value.readOnlyMode === true;
  }

  /**
   * Check if nuclear lockdown is active
   * This blocks ALL access including admins
   */
  isNuclearLockdown(): boolean {
    return this.settingsSubject.value.nuclearLockdown === true;
  }

  /**
   * Update emergency site settings (admin only)
   */
  async updateSettings(settings: Partial<EmergencySiteSettings>): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    return await runInInjectionContext(this.injector, async () => {
      const settingsRef = doc(this.firestore, this.SETTINGS_DOC_PATH);
      
      // Get current settings
      const currentSnapshot = await getDoc(settingsRef);
      const currentData = currentSnapshot.exists() 
        ? (currentSnapshot.data() as EmergencySiteSettings)
        : this.defaultSettings;

      // Merge with new settings
      const updatedSettings: Partial<EmergencySiteSettings> = {
        ...currentData,
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      await setDoc(settingsRef, updatedSettings, { merge: true });
    });
  }

  /**
   * Cleanup subscription
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

