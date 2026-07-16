import { Injectable, Injector, inject, signal } from '@angular/core';
import { IIdeaReportRealtime, IdeaComment, IdeaResults, RealtimeState } from '@cairn/api';
import { Observable, Subject, Subscription } from 'rxjs';
import { loadSignalrRealtime } from './signalr-realtime.loader';

/**
 * The realtime the app actually injects: a façade that fetches the SignalR client
 * on first use and forwards to it.
 *
 * WHY THE INDIRECTION. `@microsoft/signalr` is ~40kB gzipped, and a provider naming
 * `SignalrVoteRealtimeService` statically puts all of it in the main bundle — paid
 * for by the sign-in page, which never opens a hub, and paid for BEFORE the ballot
 * renders. The ballot's premise is a lead opening a link on a phone, on the subway,
 * with five seconds. Forty kilobytes of nice-to-have does not belong in front of the
 * question they came to answer.
 *
 * AND IT IS ONLY A NICE-TO-HAVE — that is what makes this safe to defer so
 * aggressively. The 409 on a late vote is the guarantee: the server re-derives the
 * voting window against its own clock on every write, so a vote cannot land late
 * whether or not this class ever loads a line of SignalR. `ideaClosed$` buys the
 * instant lock and nothing else. So when the chunk fails — dead tunnel, blocked CDN,
 * anything — the honest response is to report `offline` and carry on, NOT to surface
 * an error to someone who only wants to answer a question. A voter with no live
 * connection is still a voter whose ballot works correctly.
 *
 * Everything below is deliberately synchronous at the edges: `state` and the three
 * streams exist and are subscribable from the first tick, long before any chunk has
 * arrived. Consumers cannot tell the difference, which is the point — the laziness
 * is invisible to the ballot page.
 */
@Injectable()
export class LazyVoteRealtimeService implements IIdeaReportRealtime {
  private readonly injector = inject(Injector);

  private readonly _state = signal<RealtimeState>('offline');
  readonly state = this._state.asReadonly();

  private readonly ideaClosed = new Subject<IdeaResults>();
  private readonly commentAdded = new Subject<IdeaComment>();
  private readonly resynced = new Subject<string>();
  private readonly voteRecorded = new Subject<IdeaResults>();

  readonly ideaClosed$: Observable<IdeaResults> = this.ideaClosed.asObservable();
  readonly commentAdded$: Observable<IdeaComment> = this.commentAdded.asObservable();
  readonly resynced$: Observable<string> = this.resynced.asObservable();
  readonly voteRecorded$: Observable<IdeaResults> = this.voteRecorded.asObservable();

  private inner?: IIdeaReportRealtime;
  private forwarding = new Subscription();
  private polling?: ReturnType<typeof setInterval>;

  /** Seam. Overridden in tests so the failure path can be driven without a bundler. */
  protected load(): Promise<IIdeaReportRealtime> {
    return loadSignalrRealtime(this.injector);
  }

  async joinIdea(ideaId: string, token: string): Promise<void> {
    await this.leave();
    this._state.set('connecting');

    let inner: IIdeaReportRealtime;
    try {
      inner = await this.load();
    } catch {
      // The chunk did not arrive. Say so and stop — do not retry, do not throw. The
      // ballot is required to work in exactly this state, and the 409 sees to that.
      this._state.set('offline');
      return;
    }

    this.inner = inner;

    // Forward, rather than re-expose the inner streams: consumers subscribed before
    // the chunk landed are holding THESE subjects, and swapping the observable out
    // from under them would silently strand every one of those subscriptions.
    this.forwarding = new Subscription();
    this.forwarding.add(inner.ideaClosed$.subscribe((r) => this.ideaClosed.next(r)));
    this.forwarding.add(inner.commentAdded$.subscribe((c) => this.commentAdded.next(c)));
    this.forwarding.add(inner.resynced$.subscribe((id) => this.resynced.next(id)));
    this.forwarding.add(inner.voteRecorded$.subscribe((r) => this.voteRecorded.next(r)));

    this.mirrorState(inner);

    try {
      await inner.joinIdea(ideaId, token);
    } finally {
      // Whether the join succeeded or the hub rejected it, the inner service has
      // already set the truthful state; copy it rather than assert our own.
      this._state.set(inner.state());
    }
  }

  async leave(): Promise<void> {
    this.forwarding.unsubscribe();
    this.stopMirroring();

    const inner = this.inner;
    this.inner = undefined;

    if (inner) {
      await inner.leave();
    }

    this._state.set('offline');
  }

  /**
   * Mirror the inner service's state signal onto ours.
   *
   * A polled read rather than an `effect`, and that is not laziness. The state
   * changes here originate in SignalR callbacks — `onreconnecting`, `onclose` — which
   * fire outside Angular's zone and outside any injection context. An effect created
   * here would also outlive `leave()` unless separately tracked and destroyed. A
   * cheap interval that is cleared on `leave()` has a lifetime that is obvious from
   * reading it, and this is a once-per-page connection, not a hot path.
   */
  private mirrorState(inner: IIdeaReportRealtime): void {
    this.stopMirroring();
    this.polling = setInterval(() => {
      if (this.inner === inner) {
        this._state.set(inner.state());
      }
    }, 500);
  }

  private stopMirroring(): void {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = undefined;
    }
  }
}
