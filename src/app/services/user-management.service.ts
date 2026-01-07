import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, doc, getDocs, getDoc, updateDoc, query, orderBy } from '@angular/fire/firestore';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { AuthService, AdminUser } from './auth';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  // Allowed emails for user management access (extra security layer)
  private readonly ALLOWED_EMAILS = ['Maecheenoi3@gmail.com', 'Aliciataylorguitar@gmail.com', 'Hatun']; // Add Hatun email later

  constructor(
    private firestore: Firestore,
    private injector: Injector,
    private authService: AuthService,
    private auth: FirebaseAuth
  ) {}

  /**
   * Check if current user is allowed to access user management
   */
  async isAllowedToManageUsers(): Promise<boolean> {
    const user = await firstValueFrom(this.authService.currentUser$);
    if (!user || !user.isAdmin) {
      return false;
    }
    
    // Extra security: only specific emails can access
    return this.ALLOWED_EMAILS.includes(user.email);
  }

  /**
   * Get all users from Firestore
   */
  async getAllUsers(): Promise<AdminUser[]> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const usersRef = collection(this.firestore, 'adminUsers');
        // Try to order by createdAt, but handle case where it might not exist
        let q;
        try {
          q = query(usersRef, orderBy('createdAt', 'desc'));
        } catch (e) {
          // If orderBy fails (e.g., no index), just get all users
          q = query(usersRef);
        }
        const querySnapshot = await getDocs(q);
        
        const users: AdminUser[] = [];
        const currentUser = this.auth.currentUser;
        
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data() as any;
          let createdAt: Date;
          if (data.createdAt) {
            if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAt = data.createdAt;
            } else {
              createdAt = new Date(data.createdAt);
            }
          } else {
            createdAt = new Date();
          }
          
          let lastLoginAt: Date | undefined;
          if (data.lastLoginAt) {
            if (data.lastLoginAt.toDate && typeof data.lastLoginAt.toDate === 'function') {
              lastLoginAt = data.lastLoginAt.toDate();
            } else if (data.lastLoginAt instanceof Date) {
              lastLoginAt = data.lastLoginAt;
            } else {
              lastLoginAt = new Date(data.lastLoginAt);
            }
          }
          
          // Get emailVerified from Firebase Auth if available (for current user only)
          // Otherwise use Firestore value
          let emailVerified = data.emailVerified === true;
          if (currentUser && currentUser.email === data.email) {
            emailVerified = currentUser.emailVerified;
            // Sync current user's verified status to Firestore
            if (currentUser.emailVerified && !data.emailVerified) {
              updateDoc(doc(this.firestore, 'adminUsers', docSnapshot.id), {
                emailVerified: true
              }).catch(err => console.error('Error syncing emailVerified:', err));
            }
          }
          
          const user: AdminUser = {
            uid: docSnapshot.id,
            email: data.email,
            isAdmin: data.isAdmin === true,
            userRole: data.userRole !== undefined && data.userRole !== null ? data.userRole : null,
            emailVerified,
            createdAt,
            lastLoginAt
          };
          users.push(user);
        });
        
        // Sort by createdAt if orderBy didn't work
        users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        return users;
      } catch (error) {
        console.error('Error getting users:', error);
        throw error;
      }
    });
  }

  /**
   * Update user role
   * When setting role to "Admin", updates both isAdmin and userRole
   */
  async updateUserRole(userId: string, role: 'Pending' | 'Admin' | null): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      try {
        const userRef = doc(this.firestore, 'adminUsers', userId);
        
        // If role is "Admin", set both isAdmin and userRole
        // If role is "Pending" or null, set isAdmin to false and update userRole
        const updateData: any = {
          userRole: role
        };
        
        if (role === 'Admin') {
          updateData.isAdmin = true;
        } else {
          updateData.isAdmin = false;
        }
        
        await updateDoc(userRef, updateData);
      } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
      }
    });
  }
}
