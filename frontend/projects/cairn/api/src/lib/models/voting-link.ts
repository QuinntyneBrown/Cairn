/**
 * One issued voting link, minted for a known lead. Mirrors the backend `VoteLinkDto`.
 *
 * `url` IS THE WHOLE LINK AND IT EXISTS EXACTLY ONCE. It is populated only in the
 * response to creating or regenerating a link; the server stores only a hash, so
 * every later `GET` returns it as null and the original cannot be recovered by
 * anyone, including us. A UI that shows these must get the copy moment right —
 * once the response is discarded, the only remedy is regeneration, and
 * regenerating rotates the token and kills the link already sent out.
 */
export interface VotingLink {
  readonly id: string;
  readonly ideaId: string;
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly isRevoked: boolean;
  readonly hasVoted: boolean;
  /** Non-null only in a create/regenerate response. Null on every list. */
  readonly url: string | null;
}
