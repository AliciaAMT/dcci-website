import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string; // Honeypot field
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly apiUrl = environment.firebaseFunctionsUrl + '/submitContactForm';

  constructor(private http: HttpClient) {}

  async submitContactForm(formData: ContactFormData): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post(this.apiUrl, formData, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      }));

      if (!response) {
        throw new Error('No response from server');
      }

      console.log('Contact form submitted successfully:', response);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      throw error;
    }
  }

  // Alternative method using Firebase directly if needed
  async submitContactFormDirect(formData: ContactFormData): Promise<void> {
    // This method can be used if you want to call Firebase Functions directly
    // without going through the HTTP client
    try {
      // You can implement direct Firebase Functions call here if needed
      // For now, we'll use the HTTP method above
      return this.submitContactForm(formData);
    } catch (error) {
      console.error('Error submitting contact form directly:', error);
      throw error;
    }
  }
}
