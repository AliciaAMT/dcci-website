import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Guard for pages that Admins and Moderators can access
 * Used for: Dashboard, YouTube Settings, Comments Settings (eventually)
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // Allow users with Admin or Moderator role
      if (user && user.isAdmin && user.emailVerified && 
          (user.userRole === 'Admin' || user.userRole === 'Moderator')) {
        return true;
      } else {
        // Redirect to home page if not admin/moderator or email not verified
        router.navigate(['/home']);
        return false;
      }
    })
  );
};
