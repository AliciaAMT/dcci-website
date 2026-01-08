import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, switchMap } from 'rxjs';
import { AuthService } from '../services/auth';
import { SiteSettingsService } from '../services/site-settings.service';

/**
 * Guard for pages that Admins and Moderators can access
 * Used for: Dashboard, YouTube Settings, Comments Settings (eventually)
 * NOTE: Nuclear lockdown blocks ALL access, including admins
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const siteSettingsService = inject(SiteSettingsService);
  const router = inject(Router);

  // Check nuclear lockdown FIRST - this blocks EVERYONE including admins
  return siteSettingsService.settings$.pipe(
    take(1),
    switchMap(settings => {
      // NUCLEAR LOCKDOWN: Blocks ALL access, including admins
      if (settings.nuclearLockdown) {
        router.navigate(['/admin/maintenance']);
        return [false];
      }

      // Check admin status
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
    }),
    take(1)
  );
};
