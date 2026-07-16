/**
 * The signed-in admin, as returned by `GET /api/me`.
 *
 * Mirrors the backend `CurrentUserDto(Id, Email, DisplayName, Role)`.
 */
export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
}
