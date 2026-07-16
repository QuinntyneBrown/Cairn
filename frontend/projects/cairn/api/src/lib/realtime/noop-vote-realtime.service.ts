import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { IIdeaReportRealtime } from './idea-report-realtime.service.contract';

/**
 * A realtime that never connects.
 *
 * Bound in the Playwright suite, where a WebSocket to a backend that does not exist
 * would otherwise leave every ballot test racing a connection timeout. Reporting
 * `offline` forever is not a degraded mode to apologise for — it is the honest
 * state, and the ballot is required to work in it: the server re-derives the voting
 * window on every write, so the 409 still lands and the guarantee still holds. If a
 * test passes here and fails against the real hub, the bug is in the ballot's
 * dependence on the hub, which is exactly what this makes visible.
 *
 * Implements the wider contract so it can stand in at either token.
 */
@Injectable()
export class NoopVoteRealtimeService implements IIdeaReportRealtime {
  readonly state = signal<'offline'>('offline').asReadonly();

  readonly ideaClosed$: Observable<IdeaResults> = new Subject<IdeaResults>().asObservable();
  readonly commentAdded$: Observable<IdeaComment> = new Subject<IdeaComment>().asObservable();
  readonly resynced$: Observable<string> = new Subject<string>().asObservable();
  readonly voteRecorded$: Observable<IdeaResults> = new Subject<IdeaResults>().asObservable();

  async joinIdea(): Promise<void> {
    // no-op
  }

  async leave(): Promise<void> {
    // no-op
  }
}
