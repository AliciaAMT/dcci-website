import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, collection, doc, getDoc, setDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Auth as FirebaseAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { SanitizationService } from './sanitization';

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  public currentUser$: Observable<AdminUser | null> = this.currentUserSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private auth: FirebaseAuth,
    private router: Router,
    private sanitization: SanitizationService,
    private ngZone: NgZone
  ) {
    // Listen for auth state changes
    this.auth.onAuthStateChanged(async (user: User | null) => {
      this.ngZone.run(async () => {
        if (user) {
          await this.loadUserData(user.uid);
        } else {
          this.currentUserSubject.next(null);
        }
      });
    });
  }

  /**
   * Sign up a new admin user
   */
  async signUp(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Sanitize inputs
      const sanitizedEmail = this.sanitization.sanitizeEmail(email);
      const sanitizedPassword = this.sanitization.sanitizePassword(password);

      // Validate inputs
      if (!this.sanitization.isValidEmail(sanitizedEmail)) {
        return { success: false, message: 'Please enter a valid email address.' };
      }

      if (!this.sanitization.isValidPassword(sanitizedPassword)) {
        return { success: false, message: 'Password must be at least 8 characters long and contain both letters and numbers.' };
      }

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;

      // Create user document in Firestore
      const userData: AdminUser = {
        uid: user.uid,
        email: sanitizedEmail,
        isAdmin: false, // Will be set to true manually in Firestore
        createdAt: new Date()
      };

      await setDoc(doc(this.firestore, 'adminUsers', user.uid), userData);

      return { success: true, message: 'Account created successfully. Admin privileges will be granted manually.' };
    } catch (error: any) {
      console.error('Sign up error:', error);

      // Handle specific error cases
      if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'An account with this email already exists. Please try signing in instead, or use a different email address.'
        };
      }

      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Sign in an existing admin user
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Sanitize inputs
      const sanitizedEmail = this.sanitization.sanitizeEmail(email);
      const sanitizedPassword = this.sanitization.sanitizePassword(password);

      // Validate inputs
      if (!this.sanitization.isValidEmail(sanitizedEmail)) {
        return { success: false, message: 'Please enter a valid email address.' };
      }

      if (!sanitizedPassword) {
        return { success: false, message: 'Please enter a password.' };
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(this.auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;

      // Load user data from Firestore
      const userData = await this.loadUserData(user.uid);

      if (userData && userData.isAdmin) {
        // Update last login time
        await setDoc(doc(this.firestore, 'adminUsers', user.uid), {
          lastLoginAt: new Date()
        }, { merge: true });

        return { success: true, message: 'Login successful!' };
      } else {
        // User exists but is not an admin - sign them out and redirect
        await this.signOut();
        return { success: false, message: 'Access denied. Admin privileges required.' };
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, message: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Load user data from Firestore
   */
  private async loadUserData(uid: string): Promise<AdminUser | null> {
    try {
      const userDoc = await this.ngZone.run(async () => {
        return await getDoc(doc(this.firestore, 'adminUsers', uid));
      });

      if (userDoc.exists()) {
        const userData = userDoc.data() as AdminUser;
        this.currentUserSubject.next(userData);
        return userData;
      } else {
        this.currentUserSubject.next(null);
        return null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.currentUserSubject.next(null);
      return null;
    }
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    const currentUser = this.currentUserSubject.value;
    return currentUser ? currentUser.isAdmin : false;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}
