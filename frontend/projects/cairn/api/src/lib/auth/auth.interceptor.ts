import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';
import { SKIP_AUTH } from './skip-auth.context';

/**
 * Attaches the signed-in admin's Bearer token.
 *
 * The SKIP_AUTH bail-out is the first line on purpose: the anonymous voting flow
 * must never carry an admin's credentials, even when an admin is the one holding
 * the link open. See `skip-auth.context.ts`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = inject(AuthStateService).token();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
