import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Guard for pages that only full Admins can access (not Moderators)
 * Used for: User Management, Content Creation, Content Management, Site Settings
 */
export const adminOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // Only allow users with Admin role (not Moderator)
      if (user && user.isAdmin && user.emailVerified && user.userRole === 'Admin') {
        return true;
      } else {
        // Redirect to dashboard if not admin or email not verified
        router.navigate(['/admin/dashboard']);
        return false;
      }
    })
  );
};

