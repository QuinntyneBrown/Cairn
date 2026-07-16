import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Ballot } from '../models/ballot';
import { IdeaComment } from '../models/idea-comment';
import { VoteAnswer } from '../models/vote-answer';

/**
 * The anonymous voting flow. Every call this service makes is marked SKIP_AUTH,
 * so it is the ONLY service that is safe to use while signed out — and, more to
 * the point, the only one that behaves identically whether or not an admin
 * happens to be signed in on the same browser.
 *
 * Every method after `get` takes `ballotToken` explicitly rather than reading it
 * from anywhere. That is the design, not an inconvenience: the scoped token lives
 * in the ballot page's memory for the life of the page and is passed down, so
 * there is no ambient store for it to leak out of, and no way for a caller to
 * reach for the admin's token by habit.
 */
export interface IBallotService {
  /**
   * Exchanges a voting-link token for a ballot. Anonymous.
   *
   * Does not error on a dead link — a 410 becomes `{ status: 'Unavailable' }`, because
   * to a voter a revoked link is a state of the ballot, not a network failure.
   * Genuine failures (offline, 500) still error.
   */
  get(token: string): Observable<Ballot>;

  /**
   * Casts the vote using the ballot's own scoped token — not the admin session's.
   * `ballotToken` comes from `Ballot.accessToken`.
   *
   * Errors with 409 once the idea has closed. That 409 — not any hub event — is
   * what actually stops a late vote: the server re-derives the window against its
   * own clock on every write.
   */
  castVote(ideaId: string, ballotToken: string, answer: VoteAnswer): Observable<void>;

  listComments(ideaId: string, ballotToken: string): Observable<readonly IdeaComment[]>;

  /** The author comes from the token's subject and is never sent. */
  addComment(ideaId: string, ballotToken: string, body: string): Observable<IdeaComment>;
}

export const BALLOT_SERVICE = new InjectionToken<IBallotService>('IBallotService');
