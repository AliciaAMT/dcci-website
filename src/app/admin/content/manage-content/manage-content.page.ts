import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../../services/auth';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-manage-content',
  templateUrl: './manage-content.page.html',
  styleUrls: ['./manage-content.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    CommonModule
  ]
})
export class ManageContentPage implements OnInit {
  currentUser: AdminUser | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Verify user is admin and load user data
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user || !user.isAdmin || !user.emailVerified) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    this.currentUser = user;
  }

  navigateToDrafts() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/drafts']);
  }

  navigateToPublished() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.router.navigate(['/admin/content/published']);
  }
}

