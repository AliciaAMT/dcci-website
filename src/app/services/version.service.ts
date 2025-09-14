import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  
  constructor() { }
  
  getVersion(): string {
    // Try to get version from environment first
    if (environment.version) {
      return environment.version;
    }
    
    // Fallback to a default version if not set
    return '0.0.1';
  }
  
  getFullVersionInfo(): string {
    const version = this.getVersion();
    const env = environment.production ? 'Production' : 'Development';
    return `v${version} (${env})`;
  }
} 