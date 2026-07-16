import { BallotStatus } from './ballot-status';
import { Idea } from './idea';
import { VoteAnswer } from './vote-answer';

/**
 * What the ballot page renders — `BallotService`'s reading of
 * `POST /api/vote-sessions`, not that endpoint's response shape.
 *
 * The wire gives back a session (token, expiry, lead, idea, existing vote) or a
 * 410. Both are ballots as far as a voter is concerned, so the service folds them
 * into one type and the page switches on `status` rather than juggling a success
 * path and an error path that mean the same thing on screen.
 *
 * `accessToken` is a SCOPED token — it authorises voting and commenting on this
 * one idea, for up to an hour, and nothing else. It is deliberately NOT stored in
 * `AuthStateService`, never written to localStorage, and never reaches
 * `authInterceptor`; `BallotService` passes it per request. An anonymous voter has
 * no session in the admin sense and must never acquire one — and an admin who
 * opens a lead's link must not have their own session overwritten by it.
 *
 * Everything but `status` is null when the link is dead: a 410 tells us nothing
 * about the idea, and we must not invent it.
 */
export interface Ballot {
  readonly status: BallotStatus;
  readonly accessToken: string | null;
  readonly expiresAt: string | null;
  /** The lead this link was minted for. Free text — used to greet, never to authorise. */
  readonly leadName: string | null;
  readonly idea: Idea | null;
  /** Their existing answer, if they have voted before. Pre-selects the control. */
  readonly myVote: VoteAnswer | null;
}
