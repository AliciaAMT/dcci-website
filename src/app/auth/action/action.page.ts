import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-action',
  templateUrl: './action.page.html',
  styleUrls: ['./action.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    CommonModule
  ]
})
export class ActionPage implements OnInit {
  status: 'loading' | 'success' | 'error' | 'already-verified' = 'loading';
  message = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get all query params to debug
    const allParams = this.route.snapshot.queryParams;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    // Also capture uid that we added to the continue URL when sending verification
    const uidFromQuery = allParams['uid'] || urlParams.get('uid') || hashParams.get('uid') || null;
    
    // Check referrer for action code (Firebase might redirect from there)
    const referrer = document.referrer;
    let referrerParams: { [key: string]: string } = {};
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const refParams = new URLSearchParams(referrerUrl.search);
        refParams.forEach((value, key) => { referrerParams[key] = value; });
      } catch (e) {
        // Referrer might not be a valid URL
      }
    }
    
    // Convert URLSearchParams to object (compatible with older TypeScript)
    const urlParamsObj: { [key: string]: string } = {};
    urlParams.forEach((value, key) => { urlParamsObj[key] = value; });
    const hashParamsObj: { [key: string]: string } = {};
    hashParams.forEach((value, key) => { hashParamsObj[key] = value; });
    
    console.log('🔍 All query params:', allParams);
    console.log('🔍 URLSearchParams from search:', urlParamsObj);
    console.log('🔍 URLSearchParams from hash:', hashParamsObj);
    console.log('🔍 Referrer:', referrer);
    console.log('🔍 Referrer params:', referrerParams);
    console.log('🔍 Full URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);
    
    // Try different parameter name variations from query, hash, referrer, or URL params
    const mode = allParams['mode'] || allParams['Mode'] || allParams['MODE'] || 
                 urlParams.get('mode') || hashParams.get('mode') ||
                 referrerParams['mode'];
    const oobCode = allParams['oobCode'] || allParams['oobcode'] || allParams['oob_code'] || allParams['code'] ||
                    urlParams.get('oobCode') || urlParams.get('oobcode') || urlParams.get('code') ||
                    hashParams.get('oobCode') || hashParams.get('oobcode') || hashParams.get('code') ||
                    referrerParams['oobCode'] || referrerParams['oobcode'] || referrerParams['code'];
    
    console.log('🔍 Mode:', mode);
    console.log('🔍 OobCode:', oobCode ? 'Present' : 'Missing');
    console.log('🔍 UID:', uidFromQuery || '(none)');

    if (mode === 'verifyEmail' && oobCode) {
      this.handleEmailVerification(oobCode, uidFromQuery || undefined);
    } else {
      console.error('❌ Invalid verification link:', {
        mode,
        hasOobCode: !!oobCode,
        allParams,
        urlSearchParams: urlParamsObj,
        hashParams: hashParamsObj,
        referrerParams
      });
      this.status = 'error';
      this.errorMessage = 'Invalid verification link. Please check your email and try again.';
    }
  }

  async handleEmailVerification(actionCode: string, uid?: string) {
    try {
      this.status = 'loading';
      const result = await this.authService.verifyEmail(actionCode, uid);

      if (result.success) {
        // Show success message with button to go to sign in (NO auto-redirect)
        this.status = 'success';
        this.message = 'Thank you for verifying your email!';
        // Focus the success heading for accessibility
        setTimeout(() => {
          const successHeading = document.querySelector('[aria-live="polite"]') as HTMLElement;
          if (successHeading) {
            successHeading.focus();
          }
        }, 100);
      } else {
        this.status = 'error';
        this.errorMessage = result.message || 'Verification failed. Please try again.';
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      this.status = 'error';
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    }
  }

  goToSignIn() {
    this.router.navigate(['/admin/login'], { queryParams: { verified: '1' } });
  }
}

