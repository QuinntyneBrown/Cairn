import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../services/api-config';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { IIdeaReportRealtime } from './idea-report-realtime.service.contract';
import { IVoteRealtime } from './vote-realtime.service.contract';
import { NoopVoteRealtimeService } from './noop-vote-realtime.service';
import { SignalrVoteRealtimeService } from './signalr-vote-realtime.service';

/**
 * A stand-in for a SignalR `HubConnection`.
 *
 * Hand-rolled rather than mocked loosely, because the behaviour worth testing is
 * all in the callbacks the real connection invokes — reconnects, closes, rejoins.
 * This lets a test drive those directly instead of waiting on a socket that would
 * never exist in a unit test anyway.
 */
class FakeHubConnection {
  readonly handlers = new Map<string, (payload: unknown) => void>();
  readonly invocations: { method: string; arg: unknown }[] = [];

  onreconnectedCallback?: () => Promise<void> | void;
  onreconnectingCallback?: () => void;
  oncloseCallback?: () => void;

  started = false;
  stopped = false;

  /** Set to make the next `invoke` reject — the hub does this for a wrong idea. */
  invokeError?: Error;

  on(method: string, handler: (payload: unknown) => void): void {
    this.handlers.set(method, handler);
  }

  onreconnected(callback: () => Promise<void> | void): void {
    this.onreconnectedCallback = callback;
  }

  onreconnecting(callback: () => void): void {
    this.onreconnectingCallback = callback;
  }

  onclose(callback: () => void): void {
    this.oncloseCallback = callback;
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  async invoke(method: string, arg: unknown): Promise<void> {
    this.invocations.push({ method, arg });
    if (this.invokeError) {
      const error = this.invokeError;
      this.invokeError = undefined;
      throw error;
    }
  }

  /** Pretend the server sent something. */
  emit(method: string, payload: unknown): void {
    this.handlers.get(method)?.(payload);
  }
}

/**
 * Swaps the connection the service builds for the fake.
 *
 * The service constructs its own `HubConnectionBuilder`, which is the right design
 * — the connection is an implementation detail, not a collaborator worth injecting
 * and exposing. So the seam is here instead: reach in once, in the test.
 */
function useFakeConnection(service: SignalrVoteRealtimeService): FakeHubConnection {
  const fake = new FakeHubConnection();
  const internals = service as unknown as { buildConnection: () => FakeHubConnection };
  internals.buildConnection = () => fake;
  return fake;
}

const RESULTS = { ideaId: 'idea-1', title: 'Nets' } as IdeaResults;
const COMMENT = { id: 'c1', ideaId: 'idea-1', body: 'Yes please' } as IdeaComment;

describe('SignalrVoteRealtimeService', () => {
  let service: SignalrVoteRealtimeService;
  let connection: FakeHubConnection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://test.local' },
        SignalrVoteRealtimeService,
      ],
    });
    service = TestBed.inject(SignalrVoteRealtimeService);
    connection = useFakeConnection(service);
  });

  it('starts offline and goes live once it has joined the idea', async () => {
    expect(service.state()).toBe('offline');

    await service.joinIdea('idea-1', 'scoped-token');

    expect(connection.started).toBe(true);
    expect(connection.invocations).toEqual([{ method: 'JoinIdea', arg: 'idea-1' }]);
    expect(service.state()).toBe('live');
  });

  it('emits the results when voting closes', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    const seen: IdeaResults[] = [];
    service.ideaClosed$.subscribe((results) => seen.push(results));
    connection.emit('VotingClosed', RESULTS);

    expect(seen).toEqual([RESULTS]);
  });

  it('emits added comments', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    const seen: IdeaComment[] = [];
    service.commentAdded$.subscribe((comment) => seen.push(comment));
    connection.emit('CommentAdded', COMMENT);

    expect(seen).toEqual([COMMENT]);
  });

  it('emits the tally to report watchers when a vote is recorded', async () => {
    await service.joinIdea('idea-1', 'admin-token');

    const seen: IdeaResults[] = [];
    service.voteRecorded$.subscribe((results) => seen.push(results));
    connection.emit('VoteRecorded', RESULTS);

    expect(seen).toEqual([RESULTS]);
  });

  /*
   * THE BOUNDARY, checked at compile time.
   *
   * One class serves both audiences, so the runtime object always has a
   * `voteRecorded$`. What keeps a live tally off the ballot is therefore not the
   * absence of a handler — it is that the ballot injects VOTE_REALTIME and holds an
   * `IVoteRealtime`, through which the member does not exist. This is the assertion
   * that a voter cannot be shown the crowd's answer while deciding their own.
   *
   * `@ts-expect-error` FAILS THE BUILD IF THE ERROR STOPS HAPPENING — so if someone
   * widens IVoteRealtime to include the tally, this line goes red rather than
   * quietly permitting it.
   */
  it('does not expose the tally through the voter-facing contract', () => {
    const asVoter: IVoteRealtime = service;

    // @ts-expect-error — voteRecorded$ is not on IVoteRealtime, and must never be.
    const leaked = asVoter.voteRecorded$;

    // The wide view still has it: the split is in the type, not the object.
    expect((service as IIdeaReportRealtime).voteRecorded$).toBeDefined();
    expect(leaked).toBeDefined();
  });

  it('reports reconnecting, then rejoins and resyncs on reconnect', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    connection.onreconnectingCallback?.();
    expect(service.state()).toBe('reconnecting');

    const resynced: string[] = [];
    service.resynced$.subscribe((ideaId) => resynced.push(ideaId));
    await connection.onreconnectedCallback?.();

    // A reconnect is a NEW connection with a new id, so the old group membership is
    // gone. Rejoining is mandatory, not a precaution.
    expect(connection.invocations).toEqual([
      { method: 'JoinIdea', arg: 'idea-1' },
      { method: 'JoinIdea', arg: 'idea-1' },
    ]);
    expect(service.state()).toBe('live');
    // SignalR replays nothing missed during the gap, so consumers must be told to
    // refetch. Without this a voter can sit on an unlocked ballot that closed while
    // they were in a tunnel.
    expect(resynced).toEqual(['idea-1']);
  });

  it('goes offline when the connection closes', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    connection.oncloseCallback?.();

    expect(service.state()).toBe('offline');
  });

  it('does not claim to be live if the rejoin fails', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    // The token may have expired while we were away, or the link been revoked.
    connection.invokeError = new Error('token expired');
    await connection.onreconnectedCallback?.();

    expect(service.state()).toBe('offline');
  });

  // The hub throws a HubException when a vote-scoped token asks for an idea other
  // than the one it is confined to. Leaving a connection open but in no group would
  // be the worst outcome: silent, and indistinguishable from a quiet idea.
  it('tears down and rethrows when the hub rejects the join', async () => {
    connection.invokeError = new Error('This voting link is not for that idea.');

    await expect(service.joinIdea('other-idea', 'scoped-token')).rejects.toThrow(
      'This voting link is not for that idea.',
    );

    expect(connection.stopped).toBe(true);
    expect(service.state()).toBe('offline');
  });

  it('leaves the previous idea before joining another', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    const second = new FakeHubConnection();
    (service as unknown as { buildConnection: () => FakeHubConnection }).buildConnection = () =>
      second;
    await service.joinIdea('idea-2', 'other-token');

    expect(connection.invocations).toContainEqual({ method: 'LeaveIdea', arg: 'idea-1' });
    expect(connection.stopped).toBe(true);
    expect(second.invocations).toEqual([{ method: 'JoinIdea', arg: 'idea-2' }]);
  });

  it('leave() is safe when never connected', async () => {
    await expect(service.leave()).resolves.toBeUndefined();
    expect(service.state()).toBe('offline');
  });
});

describe('NoopVoteRealtimeService', () => {
  // The E2E suite binds this. It must satisfy the contract without connecting to
  // anything — the ballot has to be correct with no hub at all.
  it('is permanently offline and never emits', async () => {
    const service = new NoopVoteRealtimeService();

    let emitted = false;
    service.ideaClosed$.subscribe(() => (emitted = true));
    service.commentAdded$.subscribe(() => (emitted = true));
    service.resynced$.subscribe(() => (emitted = true));

    await service.joinIdea();
    await service.leave();

    expect(service.state()).toBe('offline');
    expect(emitted).toBe(false);
  });
});
