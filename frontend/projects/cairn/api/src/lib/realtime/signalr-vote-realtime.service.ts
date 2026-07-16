import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { RealtimeState } from '../models/realtime-state';
import { API_BASE_URL } from '../services/api-config';
import { IIdeaReportRealtime } from './idea-report-realtime.service.contract';

/**
 * Backoff schedule for automatic reconnects, in milliseconds: immediately, then
 * 2s, 5s, 10s, 30s. The first `0` matters more than the rest — the common failure
 * on a phone is a two-second tunnel or a wifi-to-cellular handover, and retrying
 * at once turns that into something the voter never notices.
 */
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/**
 * The one client for `/hubs/voting`, serving both audiences.
 *
 * It implements the WIDER contract (`IIdeaReportRealtime`), and which audience you
 * are is decided entirely by the token you inject it through:
 *
 *   VOTE_REALTIME        -> IVoteRealtime        — the ballot. No tally member exists.
 *   IDEA_REPORT_REALTIME -> IIdeaReportRealtime  — the dashboard. Tally included.
 *
 * Two classes were the obvious alternative and would have been ~95% identical:
 * the reconnect schedule, the rejoin-then-resync dance, the teardown on a rejected
 * join. Duplicating that is how two copies of a subtle state machine drift, and the
 * half that drifts is always the one with fewer eyes on it. The boundary that
 * actually matters is the contract, and that is where it lives — see
 * `idea-report-realtime.service.contract.ts`.
 *
 * The scope of the connection follows the TOKEN, not the class: pass a vote-session
 * JWT and the hub puts you in the voters group; pass an admin's `scope=user` bearer
 * and it puts you in the report group. The `VoteRecorded` handler below is
 * registered either way, and for a voter it simply never fires — the server never
 * sends it to that group.
 */
@Injectable()
export class SignalrVoteRealtimeService implements IIdeaReportRealtime {
  private readonly baseUrl = inject(API_BASE_URL);

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

  private connection?: HubConnection;
  private ideaId?: string;

  /**
   * The vote-session JWT, in memory only. It is read through a factory rather than
   * captured at build time because a reconnect re-runs it — and because it must
   * never be written anywhere `AuthStateService` or another tab could see it.
   */
  private token?: string;

  /**
   * The hub connection is an implementation detail, not a collaborator — injecting
   * it would put SignalR in the constructor of everything that wants a realtime.
   * So it is built here, and this method is the seam a test overrides.
   */
  protected buildConnection(): HubConnection {
    return new HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/hubs/voting`, {
        // A WebSocket handshake cannot carry an Authorization header, so SignalR
        // puts this on the query string. The server lifts `?access_token=` into
        // the auth context for `/hubs` paths only — never for the REST surface.
        //
        // A factory, not a captured value: a reconnect re-runs it, and the token
        // must be read from memory each time rather than pinned into a closure.
        accessTokenFactory: () => this.token ?? '',
      })
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(LogLevel.Warning)
      .build();
  }

  async joinIdea(ideaId: string, token: string): Promise<void> {
    await this.leave();

    this.ideaId = ideaId;
    this.token = token;
    this._state.set('connecting');

    const connection = this.buildConnection();

    connection.on('VotingClosed', (results: IdeaResults) => this.ideaClosed.next(results));
    connection.on('CommentAdded', (comment: IdeaComment) => this.commentAdded.next(comment));
    // Report group only. A vote-scoped connection never sees this fire — the server
    // does not send it to the voters group — so registering it here costs a voter
    // nothing and the ballot cannot reach it anyway: it holds an IVoteRealtime.
    connection.on('VoteRecorded', (results: IdeaResults) => this.voteRecorded.next(results));

    connection.onreconnecting(() => this._state.set('reconnecting'));
    connection.onclose(() => this._state.set('offline'));

    // A reconnect is a NEW connection with a new connection id, so the server-side
    // group membership from before is gone — rejoining is mandatory, not a
    // precaution. Only then is it honest to say we are live again, and only then
    // can a consumer usefully refetch what it missed.
    connection.onreconnected(async () => {
      try {
        await connection.invoke('JoinIdea', this.ideaId);
        this._state.set('live');
        if (this.ideaId) {
          this.resynced.next(this.ideaId);
        }
      } catch {
        // The token may have expired while we were away, or the link been revoked.
        // Either way we are attached to nothing; say so rather than claim to be live.
        this._state.set('offline');
      }
    });

    try {
      await connection.start();
      await connection.invoke('JoinIdea', ideaId);
    } catch (error) {
      // Includes the HubException thrown when this token is scoped to a different
      // idea. Nothing is salvageable, so tear down rather than leave a connection
      // that is open but in no group.
      this._state.set('offline');
      this.connection = undefined;
      await connection.stop().catch(() => undefined);
      throw error;
    }

    this.connection = connection;
    this._state.set('live');
  }

  async leave(): Promise<void> {
    const connection = this.connection;
    if (!connection) {
      return;
    }

    const ideaId = this.ideaId;
    this.connection = undefined;
    this.ideaId = undefined;
    this.token = undefined;

    try {
      if (ideaId) {
        await connection.invoke('LeaveIdea', ideaId);
      }
    } catch {
      // Already closing or dropped — stopping below achieves the same thing.
    }

    await connection.stop().catch(() => undefined);
    this._state.set('offline');
  }
}
