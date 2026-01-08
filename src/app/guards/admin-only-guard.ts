import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, switchMap } from 'rxjs';
import { AuthService } from '../services/auth';
import { SiteSettingsService } from '../services/site-settings.service';

/**
 * Guard for pages that only full Admins can access (not Moderators)
 * Used for: User Management, Content Creation, Content Management, Site Settings
 * NOTE: Nuclear lockdown blocks ALL access, including admins
 */
export const adminOnlyGuard: CanActivateFn = (route, state) => {
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
    }),
    take(1)
  );
};

