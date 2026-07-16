/**
 * Body of `POST /api/ideas/{id}/comments`.
 *
 * Body only. The author is taken from the bearer token's subject, never from the
 * request — a client that could name its own author could sign a comment with
 * someone else's name.
 */
export interface CreateCommentRequest {
  readonly body: string;
}
