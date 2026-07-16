import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks a request as belonging to the anonymous voting flow, so `authInterceptor`
 * leaves it alone.
 *
 * This is a context token rather than a URL check in the interceptor, and that
 * choice is load-bearing. A regex like `/^\/api\/vote-/` couples the security
 * boundary to a string that lives somewhere else: rename the endpoint and the
 * regex silently stops matching, the interceptor silently starts attaching the
 * admin's Bearer token to ballot requests, and nothing fails — not a test, not a
 * build. The damage shows up in production as votes attributed to whoever
 * happened to open the link. Here the caller declares intent at the call site,
 * in the type system, and a rename cannot break it.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** Convenience for `{ context: skipAuth() }` on an outgoing request. */
export const skipAuth = () => new HttpContext().set(SKIP_AUTH, true);
