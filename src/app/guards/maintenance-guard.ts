import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take, switchMap, of } from 'rxjs';
import { SiteSettingsService } from '../services/site-settings.service';
import { AuthService } from '../services/auth';

/**
 * Guard that redirects non-admin users to maintenance page if maintenance mode is enabled
 * Admin users can still access all pages (they see normal UI, not maintenance page)
 * Auth routes (login, forgot-password, etc.) are always accessible so admins can log in
 * EXCEPT during nuclear lockdown - which blocks EVERYTHING including admins and auth routes
 */
export const maintenanceGuard: CanActivateFn = (route, state) => {
  const siteSettingsService = inject(SiteSettingsService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check nuclear lockdown FIRST - this blocks EVERYONE including admins and auth routes
  return siteSettingsService.settings$.pipe(
    take(1),
    switchMap(settings => {
      // NUCLEAR LOCKDOWN: Blocks ALL access, including admins and auth routes
      // Only way to disable is via Firestore console
      // Exception: Allow access to maintenance page itself so users see the message
      if (settings.nuclearLockdown) {
        // Normalize URL for comparison (remove query params, ensure leading slash)
        const normalizedUrl = state.url.split('?')[0];
        const maintenancePath = '/admin/maintenance';
        
        if (normalizedUrl === maintenancePath || normalizedUrl.startsWith(maintenancePath + '/')) {
          return of(true); // Allow maintenance page
        }
        // Block everything else - redirect to maintenance
        router.navigate(['/admin/maintenance'], { replaceUrl: true });
        return of(false);
      }

      // Always allow access to auth-related routes (login, password reset, email verification, etc.)
      // This ensures admins can always log in to turn off maintenance mode
      const authRoutes = [
        '/admin/login',
        '/admin/forgot-password',
        '/admin/reset-password',
        '/admin/verify-email',
        '/admin/verification-required',
        '/auth/action',
        '/admin/maintenance' // Allow access to maintenance page itself
      ];
      
      if (authRoutes.some(authRoute => state.url.startsWith(authRoute))) {
        return of(true);
      }

      // If maintenance mode is NOT enabled, allow access
      if (!settings.maintenanceMode) {
        return of(true);
      }

      // Maintenance mode IS enabled - check if user is admin
      // Admins can still access (they see normal UI)
      return authService.currentUser$.pipe(
        take(1),
        map(user => {
          if (user && user.isAdmin && user.emailVerified) {
            // Admin user - allow access
            return true;
          } else {
            // Non-admin user - redirect to maintenance page
            router.navigate(['/admin/maintenance'], { replaceUrl: true });
            return false;
          }
        })
      );
    }),
    take(1)
  );
};

