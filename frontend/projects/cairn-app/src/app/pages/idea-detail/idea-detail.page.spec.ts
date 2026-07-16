import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AuthStateService,
  IDEA_REPORT_REALTIME,
  IIdeaReportRealtime,
  IIdeasService,
  IVotingLinksService,
  IDEAS_SERVICE,
  Idea,
  IdeaResults,
  VOTING_LINKS_SERVICE,
  VotingLink,
} from '@cairn/api';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { IdeaDetailPage } from './idea-detail.page';

const IDEA: Idea = {
  id: 'i1',
  title: 'Run a Build Night',
  description: 'Should we?',
  responseType: 'YesNo',
  status: 'Open',
  opensAt: '2026-07-01T00:00:00+00:00',
  closesAt: '2026-08-30T00:00:00+00:00',
  options: [],
};

function results(totalVotes: number): IdeaResults {
  return {
    ideaId: 'i1',
    title: IDEA.title,
    responseType: 'YesNo',
    status: 'Open',
    closesAt: IDEA.closesAt,
    totalVotes,
    invitedCount: 8,
    yesCount: totalVotes,
    noCount: 0,
    options: null,
    scale: null,
  };
}

const LINK: VotingLink = {
  id: 'l1',
  ideaId: 'i1',
  userId: 'u1',
  displayName: 'Ada',
  email: 'ada@example.org',
  expiresAt: '2026-08-30T00:00:00+00:00',
  createdAt: '2026-07-01T00:00:00+00:00',
  isRevoked: false,
  hasVoted: false,
  url: null,
};

describe('IdeaDetailPage', () => {
  let fixture: ComponentFixture<IdeaDetailPage>;
  let tallyCalls: number;
  let votes: number;
  let minted: readonly VotingLink[];
  let createCalls: unknown[];

  const voteRecorded = new Subject<IdeaResults>();
  const resynced = new Subject<string>();
  const ideaClosed = new Subject<IdeaResults>();
  const commentAdded = new Subject<never>();

  const realtime: IIdeaReportRealtime = {
    state: signal('live' as const).asReadonly(),
    voteRecorded$: voteRecorded.asObservable(),
    resynced$: resynced.asObservable(),
    ideaClosed$: ideaClosed.asObservable(),
    commentAdded$: commentAdded.asObservable(),
    joinIdea: () => Promise.resolve(),
    leave: () => Promise.resolve(),
  };

  const ideas: Partial<IIdeasService> = {
    get: () => of(IDEA),
    getTally: () => {
      tallyCalls++;
      return of(results(votes));
    },
    getComments: () => of([]),
  };

  const links: Partial<IVotingLinksService> = {
    list: () => of([LINK]),
    create: (_id, request) => {
      createCalls.push(request);
      return of(minted);
    },
  };

  function create(): void {
    fixture = TestBed.createComponent(IdeaDetailPage);
    fixture.componentRef.setInput('id', 'i1');
    fixture.detectChanges();
  }

  function el(testid: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  }

  beforeEach(() => {
    tallyCalls = 0;
    votes = 3;
    createCalls = [];
    minted = [{ ...LINK, id: 'l2', url: 'https://cairn.test/vote/raw' }];

    TestBed.configureTestingModule({
      imports: [IdeaDetailPage],
      providers: [
        provideRouter([{ path: 'ideas', children: [] }]),
        { provide: IDEAS_SERVICE, useValue: ideas },
        { provide: VOTING_LINKS_SERVICE, useValue: links },
        { provide: IDEA_REPORT_REALTIME, useValue: realtime },
      ],
    });
    TestBed.inject(AuthStateService);
  });

  it('loads the idea, results, links and comments together', () => {
    create();

    expect(el('vote-tally')).not.toBeNull();
    expect(el('voting-link-list')).not.toBeNull();
    expect(el('detail-turnout')?.textContent).toContain('3 of 8 invited');
  });

  // The heart of it: an event is a nudge to go and ask, never a patch to apply.
  // SignalR does not replay what was missed, so a page that accumulated payloads
  // would drift silently the moment one was dropped.
  it('refetches when a vote is recorded, rather than patching from the payload', () => {
    create();
    const before = tallyCalls;

    votes = 4;
    voteRecorded.next(results(99));
    fixture.detectChanges();

    expect(tallyCalls).toBe(before + 1);
    // 4 from the refetch — NOT the 99 carried on the event.
    expect(el('detail-turnout')?.textContent).toContain('4 of 8 invited');
  });

  it('refetches on resync, because the gap was never replayed', () => {
    create();
    const before = tallyCalls;

    resynced.next('i1');

    expect(tallyCalls).toBe(before + 1);
  });

  it('refetches when the idea closes', () => {
    create();
    const before = tallyCalls;

    ideaClosed.next(results(4));

    expect(tallyCalls).toBe(before + 1);
  });

  it('shows the live indicator driven by the connection state', () => {
    create();

    expect(el('live-indicator')?.getAttribute('data-state')).toBe('live');
  });

  it('mints links for every lead with an empty body, and keeps the urls on screen', () => {
    create();

    (el('generate-links') as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();

    // `{}` is the deliberate "invite everyone" gesture.
    expect(createCalls).toEqual([{}]);
    // The refetch that follows replaces the list with url-less rows; the minted
    // batch must survive it, because those URLs cannot be fetched again.
    expect(el('fresh-links')?.textContent).toContain('https://cairn.test/vote/raw');
  });
});
