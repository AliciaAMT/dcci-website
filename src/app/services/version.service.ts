import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VersionService {

  constructor() { }

  /**
   * Get the current app version
   */
  getVersion(): string {
    return environment.version;
  }

  /**
   * Get the full version info including production status
   */
  getVersionInfo(): { version: string; production: boolean } {
    return {
      version: environment.version,
      production: environment.production
    };
  }

  /**
   * Check if this is a production build
   */
  isProduction(): boolean {
    return environment.production;
  }

  /**
   * Get formatted version string for display
   */
  getDisplayVersion(): string {
    return `v${environment.version}`;
  }
}
