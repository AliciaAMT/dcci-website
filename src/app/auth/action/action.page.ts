import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-action',
  templateUrl: './action.page.html',
  styleUrls: ['./action.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    CommonModule
  ]
})
export class ActionPage implements OnInit {
  status: 'success' = 'success';
  message = 'Email verified. You can now sign in.';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    // Firebase's /__/auth/action handler already verified the email
    // Get uid from query params and update Firestore via Cloud Function
    const uid = this.route.snapshot.queryParams['uid'];
    
    if (uid) {
      try {
        await firstValueFrom(
          this.http.post<{ success: boolean; message: string }>(
            `${environment.firebaseFunctionsUrl}/updateEmailVerified`,
            { uid },
            { headers: { 'Content-Type': 'application/json' } }
          )
        );
        console.log('✅ Firestore updated for uid:', uid);
      } catch (error: any) {
        console.error('⚠️ Failed to update Firestore:', error);
        // Don't show error to user - Firestore will be updated during sign-in
      }
    }
    
    // Focus the success heading for accessibility
    setTimeout(() => {
      const successHeading = document.querySelector('[aria-live="polite"]') as HTMLElement;
      if (successHeading) {
        successHeading.focus();
      }
    }, 100);
  }

  goToSignIn() {
    this.router.navigate(['/admin/login'], { queryParams: { verified: '1' } });
  }
}

