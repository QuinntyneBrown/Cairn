import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { IdeaResults } from '../models/idea-results';
import { IVoteRealtime } from './vote-realtime.service.contract';

/**
 * The live feed for an idea as a WATCHER sees it — everything a voter gets, plus
 * the running tally.
 *
 * Same hub, same connection machinery, same implementation class. The only thing
 * that differs is the token you inject, and that is the entire point.
 *
 * WHY THIS IS A SEPARATE CONTRACT RATHER THAN A MEMBER ON `IVoteRealtime`:
 *
 * The server already guarantees a voter cannot receive `VoteRecorded` —
 * `VotingHub.JoinIdea` puts a `scope=vote` connection in the voters group, and
 * `SignalRVotingNotifier.VoteRecordedAsync` sends only to the report group. That is
 * the real enforcement, and no client-side type can add to it.
 *
 * So this split is not defending against the server. It is defending against the
 * ballot page. If `voteRecorded$` were a member of `IVoteRealtime`, the ballot could
 * subscribe to it and render a live tally, and that code would look perfectly
 * reasonable in review and even appear to work — it would sit there quietly doing
 * nothing, because voters are never sent the event. It would only come alive the day
 * someone widened the server group for an unrelated reason, and then a voter would
 * watch the crowd lean one way while deciding, which is exactly the anchoring the
 * two-group design exists to prevent. Splitting the contract means the ballot cannot
 * write that line at all: it holds an `IVoteRealtime`, and the member is not there.
 *
 * One implementation, two views of it. The narrow view is the one handed to the page
 * that must not have the wide one.
 */
export interface IIdeaReportRealtime extends IVoteRealtime {
  /**
   * A vote landed; carries the whole re-projected tally. Report group only.
   *
   * A full projection rather than a delta, deliberately: there are dozens of votes,
   * not millions, so re-sending everything is cheap and it self-heals a client that
   * missed a message. Delta reconciliation would drift silently instead.
   */
  readonly voteRecorded$: Observable<IdeaResults>;
}

export const IDEA_REPORT_REALTIME = new InjectionToken<IIdeaReportRealtime>('IIdeaReportRealtime');
