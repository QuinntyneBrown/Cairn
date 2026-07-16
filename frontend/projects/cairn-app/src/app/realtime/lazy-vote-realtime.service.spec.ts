import { TestBed } from '@angular/core/testing';
import { IIdeaReportRealtime, IdeaComment, IdeaResults, RealtimeState } from '@cairn/api';
import { Observable, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { LazyVoteRealtimeService } from './lazy-vote-realtime.service';

/** Stands in for the SignalR client the real loader would fetch. */
class FakeRealtime implements IIdeaReportRealtime {
  readonly _state = signal<RealtimeState>('offline');
  readonly state = this._state.asReadonly();

  readonly ideaClosed = new Subject<IdeaResults>();
  readonly commentAdded = new Subject<IdeaComment>();
  readonly resynced = new Subject<string>();
  readonly voteRecorded = new Subject<IdeaResults>();

  readonly ideaClosed$: Observable<IdeaResults> = this.ideaClosed.asObservable();
  readonly commentAdded$: Observable<IdeaComment> = this.commentAdded.asObservable();
  readonly resynced$: Observable<string> = this.resynced.asObservable();
  readonly voteRecorded$: Observable<IdeaResults> = this.voteRecorded.asObservable();

  joined: { ideaId: string; token: string } | null = null;
  left = false;

  async joinIdea(ideaId: string, token: string): Promise<void> {
    this.joined = { ideaId, token };
    this._state.set('live');
  }

  async leave(): Promise<void> {
    this.left = true;
    this._state.set('offline');
  }
}

/** Replaces the dynamic import with something a unit test can control. */
class TestLazyRealtime extends LazyVoteRealtimeService {
  loader: () => Promise<IIdeaReportRealtime> = async () => new FakeRealtime();

  protected override load(): Promise<IIdeaReportRealtime> {
    return this.loader();
  }
}

const RESULTS = { ideaId: 'idea-1' } as IdeaResults;
const COMMENT = { id: 'c1' } as IdeaComment;

describe('LazyVoteRealtimeService', () => {
  let service: TestLazyRealtime;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TestLazyRealtime] });
    service = TestBed.inject(TestLazyRealtime);
  });

  afterEach(async () => await service.leave());

  it('is offline before anything is loaded', () => {
    expect(service.state()).toBe('offline');
  });

  /*
   * THE PROPERTY THAT MAKES DEFERRING THIS SAFE.
   *
   * The chunk is fetched over the same flaky connection as everything else — a dead
   * tunnel, a blocked CDN, an evicted cache. When it never arrives, the ballot must
   * carry on working: the 409 on a late vote is the guarantee, and SignalR only ever
   * bought the instant lock. So a failed load is reported as `offline` and swallowed.
   * It must NOT reject, because the ballot calls this without awaiting, and it must
   * not surface anything to a voter who only wants to answer a question.
   */
  it('stays offline and does not throw when the chunk never arrives', async () => {
    service.loader = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

    await expect(service.joinIdea('idea-1', 'scoped-token')).resolves.toBeUndefined();

    expect(service.state()).toBe('offline');
  });

  it('reports live once the chunk lands and the join succeeds', async () => {
    await service.joinIdea('idea-1', 'scoped-token');

    expect(service.state()).toBe('live');
  });

  it('passes the idea and the scoped token through to the real client', async () => {
    const inner = new FakeRealtime();
    service.loader = async () => inner;

    await service.joinIdea('idea-7', 'scoped-token');

    expect(inner.joined).toEqual({ ideaId: 'idea-7', token: 'scoped-token' });
  });

  /*
   * The subscriptions exist before the implementation does — the ballot page
   * subscribes in its constructor, long before any chunk is fetched. If this façade
   * re-exposed the inner observables instead of forwarding onto its own subjects,
   * every one of those early subscriptions would be silently stranded on a dead
   * stream, and a voter would never hear that voting closed.
   */
  it('delivers events to consumers who subscribed before the chunk loaded', async () => {
    const closed: IdeaResults[] = [];
    const comments: IdeaComment[] = [];
    const resyncs: string[] = [];
    service.ideaClosed$.subscribe((r) => closed.push(r));
    service.commentAdded$.subscribe((c) => comments.push(c));
    service.resynced$.subscribe((id) => resyncs.push(id));

    const inner = new FakeRealtime();
    service.loader = async () => inner;
    await service.joinIdea('idea-1', 'scoped-token');

    inner.ideaClosed.next(RESULTS);
    inner.commentAdded.next(COMMENT);
    inner.resynced.next('idea-1');

    expect(closed).toEqual([RESULTS]);
    expect(comments).toEqual([COMMENT]);
    expect(resyncs).toEqual(['idea-1']);
  });

  it('stops forwarding once it has left', async () => {
    const inner = new FakeRealtime();
    service.loader = async () => inner;
    await service.joinIdea('idea-1', 'scoped-token');

    const closed: IdeaResults[] = [];
    service.ideaClosed$.subscribe((r) => closed.push(r));

    await service.leave();
    inner.ideaClosed.next(RESULTS);

    expect(inner.left).toBe(true);
    expect(closed).toEqual([]);
    expect(service.state()).toBe('offline');
  });

  it('leave() is safe before anything has loaded', async () => {
    await expect(service.leave()).resolves.toBeUndefined();
  });
});
