/**
 * A comment left on an idea. Mirrors the backend `CommentDto`.
 *
 * `authorName` is the display name of the account behind the token — resolved
 * server-side, not supplied by the client. Voters reach an idea anonymously, but
 * their link was minted for a known lead, so their comments are attributed.
 */
export interface IdeaComment {
  readonly id: string;
  readonly ideaId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: string;
}
