import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthStateService } from '@cairn/api';

/**
 * Guards the admin area.
 *
 * This lives in the app rather than in @cairn/api because it knows the route
 * table — `/sign-in` is an app fact, not an API fact. Interceptors go in the
 * library (they only know about HTTP); guards stay here.
 *
 * Note what it is NOT applied to: `/vote/:token`. The public ballot route is
 * outside the guarded subtree entirely, so an anonymous voter never meets it.
 */
export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
