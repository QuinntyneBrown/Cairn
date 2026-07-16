import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { RealtimeState } from '../models/realtime-state';

/**
 * The live feed for one idea, over the `/hubs/voting` SignalR hub.
 *
 * TREAT EVERY EVENT AS "SOMETHING CHANGED, GO ASK" — never as a patch to apply.
 * SignalR does not replay messages missed while a connection was down, so a client
 * that reconstructs state by accumulating events drifts silently the moment a
 * message is dropped, and nothing surfaces the drift. That is why `resynced$`
 * exists and why the payloads here are whole projections rather than deltas: a
 * refetch is always correct, an accumulated patch is only usually correct.
 *
 * Scope matters. A vote-scoped token joins a voters-only server group which
 * receives `VotingClosed` and `CommentAdded` but NEVER `VoteRecorded` — hence no
 * tally stream on this contract. Letting a lead watch the tally move while they
 * decide anchors their answer to the crowd's, and the whole point of the exercise
 * is independent judgement. If you need live tallies for the admin dashboard, that
 * is a different group and belongs in a different service.
 *
 * And none of this is the guarantee. The server re-derives the voting window on
 * every read and write, so a voter with no hub connection at all is still safe:
 * they simply learn about a close from a 409 instead of a broadcast. The hub buys
 * immediacy, not correctness.
 */
export interface IVoteRealtime {
  /** Connection health, for an ambient indicator. `offline` is not an error. */
  readonly state: Signal<RealtimeState>;

  /** Voting just stopped. Emits the idea's final results; refetch and lock the ballot. */
  readonly ideaClosed$: Observable<IdeaResults>;

  /** Someone commented on the idea. */
  readonly commentAdded$: Observable<IdeaComment>;

  /**
   * The connection dropped and came back, and we have rejoined. Emits the idea id.
   * Anything that happened during the gap was NOT delivered — refetch everything
   * you care about. Without this, a voter who missed a `VotingClosed` sits looking
   * at an unlocked ballot that will only reject them when they submit.
   */
  readonly resynced$: Observable<string>;

  /**
   * Joins the idea's group, leaving any previous one first. `token` is the
   * vote-session JWT — passed per call and held only in memory, never persisted.
   *
   * Rejects if the token is scoped to a different idea: the hub throws a
   * `HubException` rather than quietly subscribing you to nothing.
   */
  joinIdea(ideaId: string, token: string): Promise<void>;

  /** Leaves the group and closes the connection. Safe to call when not connected. */
  leave(): Promise<void>;
}

export const VOTE_REALTIME = new InjectionToken<IVoteRealtime>('IVoteRealtime');
