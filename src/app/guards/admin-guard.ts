import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

        return authService.currentUser$.pipe(
          take(1),
          map(user => {
            if (user && user.isAdmin && user.emailVerified) {
              return true;
            } else {
              // Redirect to home page if not admin or email not verified
              router.navigate(['/home']);
              return false;
            }
          })
        );
};
