/**
 * Response of `POST /api/auth/sign-in` (and `/register`, `/refresh`).
 *
 * Mirrors the backend `AuthResult(AccessToken, RefreshToken, UserId, Email,
 * DisplayName, Role)` — FLAT. The user's fields sit alongside the tokens rather
 * than under a nested `user`.
 *
 * Deliberately NOT composed from `CurrentUser` despite the overlap: this is a
 * different wire shape from a different endpoint, and it names the id `userId`
 * where `/api/me` names it `id`. Modelling one in terms of the other is what put
 * a `user` object here that the server has never sent. `AuthStateService` owns
 * the mapping between the two.
 */
export interface AuthResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
}
