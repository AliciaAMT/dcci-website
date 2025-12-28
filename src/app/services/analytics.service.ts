import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly trackUrl = environment.firebaseFunctionsUrl + '/trackPageView';

  constructor(private http: HttpClient) {}

  /**
   * Track a page view for the given path.
   * This call is intentionally fire-and-forget; errors are logged but not surfaced to the user.
   */
  async trackPageView(path: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          this.trackUrl,
          { path },
          {
            headers: new HttpHeaders({
              'Content-Type': 'application/json'
            })
          }
        )
      );
    } catch (error) {
      // Don't break the UX if analytics fails
      console.error('Error tracking page view:', error);
    }
  }
}






