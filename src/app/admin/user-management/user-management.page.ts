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
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonSpinner,
    IonChip,
    ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, AdminUser } from '../../services/auth';
import { UserManagementService } from '../../services/user-management.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.page.html',
  styleUrls: ['./user-management.page.scss'],
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
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonSpinner,
    IonChip,
    CommonModule,
    FormsModule
  ]
})
export class UserManagementPage implements OnInit, OnDestroy {
  currentUser: AdminUser | null = null;
  users: AdminUser[] = [];
  isLoading = false;
  isSaving = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userManagementService: UserManagementService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    const user = await firstValueFrom(this.authService.currentUser$);
    
    // Check if user exists
    if (!user) {
      await this.showToast('You must be logged in to access this page.', 'danger');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    
    // Check if user is admin
    if (!user.isAdmin) {
      await this.showToast('Access denied. Admin privileges required.', 'danger');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      await this.showToast('Access denied. Please verify your email address before accessing user management.', 'danger');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    
    // Extra security check: only allowed emails can access
    const isAllowed = await this.userManagementService.isAllowedToManageUsers();
    if (!isAllowed) {
      await this.showToast('Access denied. You do not have permission to manage users.', 'danger');
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    
    this.currentUser = user;
    await this.loadUsers();
  }

  ngOnDestroy() {}

  async loadUsers() {
    this.isLoading = true;
    try {
      this.users = await this.userManagementService.getAllUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      await this.showToast('Failed to load users', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onRoleChange(user: AdminUser, newRole: 'Pending' | 'Admin' | null) {
    // Prevent changing your own role
    if (user.uid === this.currentUser?.uid) {
      await this.showToast('You cannot change your own role', 'warning');
      // Reset the dropdown value
      const userIndex = this.users.findIndex(u => u.uid === user.uid);
      if (userIndex !== -1) {
        this.users[userIndex].userRole = this.users[userIndex].userRole || 'Pending';
      }
      return;
    }

    // Don't update if role hasn't changed
    if (user.userRole === newRole) {
      return;
    }

    // Show confirmation for Admin role assignment
    if (newRole === 'Admin') {
      const alert = await this.alertController.create({
        header: 'Assign Admin Role',
        message: `Are you sure you want to assign Admin role to ${user.email}? This will grant full administrative access.`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              // Reset dropdown to previous value on cancel
              const userIndex = this.users.findIndex(u => u.uid === user.uid);
              if (userIndex !== -1) {
                this.users[userIndex].userRole = user.userRole || 'Pending';
              }
            }
          },
          {
            text: 'Assign Admin',
            handler: async () => {
              await this.updateUserRole(user, newRole);
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.updateUserRole(user, newRole);
    }
  }

  async updateUserRole(user: AdminUser, role: 'Pending' | 'Admin' | null) {
    if (this.isSaving) return;

    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: 'Updating user role...'
    });
    await loading.present();

    try {
      await this.userManagementService.updateUserRole(user.uid, role);
      await loading.dismiss();
      
      // Reload users to get fresh data from Firestore
      await this.loadUsers();
      
      await this.showToast('User role updated successfully', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error updating user role:', error);
      await this.showToast('Failed to update user role', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  getRoleDisplayName(role: 'Pending' | 'Admin' | null | undefined): string {
    if (!role) return 'Pending';
    return role;
  }

  getRoleColor(role: 'Pending' | 'Admin' | null | undefined): string {
    if (role === 'Admin') return 'success';
    return 'medium';
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

