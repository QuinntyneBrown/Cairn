import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { BallotService } from './ballot.service';
import { SKIP_AUTH } from '../auth/skip-auth.context';
import { Ballot } from '../models/ballot';

/** The backend's `IdeaDto`, as it actually arrives. */
const IDEA = {
  id: 'idea-1',
  title: 'Buy mosquito nets for the Kitgum clinic',
  description: 'Should we spend the Q3 surplus on nets?',
  responseType: 'YesNo',
  status: 'Open',
  opensAt: '2026-07-01T00:00:00Z',
  closesAt: '2026-08-01T00:00:00Z',
  options: [],
};

/** The backend's `VoteSessionDto`. Note: no `status`, and nothing nullable but `myVote`. */
const SESSION = {
  accessToken: 'scoped-ballot-token',
  expiresAt: '2026-07-16T19:00:00Z',
  leadName: 'Amara Okafor',
  idea: IDEA,
  myVote: null,
};

describe('BallotService', () => {
  let service: BallotService;
  let http: HttpTestingController;
  const baseUrl = 'http://test.local';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        BallotService,
      ],
    });
    service = TestBed.inject(BallotService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('exchanges a token for a ballot', () => {
    let ballot: Ballot | undefined;
    service.get('tok-123').subscribe((result) => (ballot = result));

    const req = http.expectOne(`${baseUrl}/api/vote-sessions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok-123' });
    req.flush(SESSION);

    expect(ballot?.status).toBe('Open');
    expect(ballot?.accessToken).toBe('scoped-ballot-token');
    expect(ballot?.leadName).toBe('Amara Okafor');
    expect(ballot?.idea?.title).toBe('Buy mosquito nets for the Kitgum clinic');
  });

  // Status is derived here and exists nowhere on the wire — these pin the derivation.
  it('reads the ballot status off the idea, not off a field the server never sends', () => {
    let ballot: Ballot | undefined;
    service.get('t').subscribe((result) => (ballot = result));
    http
      .expectOne(`${baseUrl}/api/vote-sessions`)
      .flush({ ...SESSION, idea: { ...IDEA, status: 'Closed' } });

    expect(ballot?.status).toBe('Closed');
  });

  it("renames the server's 'Draft' to NotYetOpen", () => {
    let ballot: Ballot | undefined;
    service.get('t').subscribe((result) => (ballot = result));
    http
      .expectOne(`${baseUrl}/api/vote-sessions`)
      .flush({ ...SESSION, idea: { ...IDEA, status: 'Draft' } });

    expect(ballot?.status).toBe('NotYetOpen');
  });

  // A dead link is a state of the ballot, not a transport failure — the page must
  // be able to render it without an error branch.
  it('turns a 410 into an Unavailable ballot rather than an error', () => {
    let ballot: Ballot | undefined;
    let errored = false;
    service.get('gone').subscribe({
      next: (result) => (ballot = result),
      error: () => (errored = true),
    });

    http
      .expectOne(`${baseUrl}/api/vote-sessions`)
      .flush({ title: 'Link unavailable' }, { status: 410, statusText: 'Gone' });

    expect(errored).toBe(false);
    expect(ballot?.status).toBe('Unavailable');
    // We were told nothing about the idea, so we must claim nothing about it.
    expect(ballot?.idea).toBeNull();
    expect(ballot?.accessToken).toBeNull();
  });

  // Only the 410 is a ballot state. A 500 is a real failure and must still surface.
  it('still errors on a genuine failure', () => {
    let errored = false;
    service.get('t').subscribe({ next: () => undefined, error: () => (errored = true) });

    http
      .expectOne(`${baseUrl}/api/vote-sessions`)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });

  it('lifts an existing vote out of the flat wire shape into the union', () => {
    let ballot: Ballot | undefined;
    service.get('t').subscribe((result) => (ballot = result));
    http.expectOne(`${baseUrl}/api/vote-sessions`).flush({
      ...SESSION,
      myVote: {
        ideaId: 'idea-1',
        responseType: 'Scale',
        yesNo: null,
        selectedOptionId: null,
        scale: 7,
        updatedAt: '2026-07-10T00:00:00Z',
      },
    });

    expect(ballot?.myVote).toEqual({ kind: 'Scale', value: 7 });
  });

  // A vote that names a type but carries no matching value is malformed. Showing
  // the voter an opinion they never expressed is worse than showing them none —
  // they might well submit it back unread.
  it('treats a vote whose declared type has no value as no vote at all', () => {
    let ballot: Ballot | undefined;
    service.get('t').subscribe((result) => (ballot = result));
    http.expectOne(`${baseUrl}/api/vote-sessions`).flush({
      ...SESSION,
      myVote: {
        ideaId: 'idea-1',
        responseType: 'YesNo',
        yesNo: null,
        selectedOptionId: null,
        scale: 3,
        updatedAt: '2026-07-10T00:00:00Z',
      },
    });

    expect(ballot?.myVote).toBeNull();
  });

  it('sends the ballot scoped token — not the admin session — when casting', () => {
    service.castVote('idea-1', 'scoped-token', { kind: 'YesNo', value: true }).subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/idea-1/votes`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer scoped-token');
    req.flush(null);
  });

  it('flattens each answer kind onto the wire shape', () => {
    service.castVote('i', 't', { kind: 'YesNo', value: false }).subscribe();
    const yesNo = http.expectOne(`${baseUrl}/api/ideas/i/votes`);
    expect(yesNo.request.body).toEqual({ yesNo: false });
    yesNo.flush(null);

    service.castVote('i', 't', { kind: 'Options', optionId: 'opt-9' }).subscribe();
    const options = http.expectOne(`${baseUrl}/api/ideas/i/votes`);
    expect(options.request.body).toEqual({ selectedOptionId: 'opt-9' });
    options.flush(null);

    service.castVote('i', 't', { kind: 'Scale', value: 4 }).subscribe();
    const scale = http.expectOne(`${baseUrl}/api/ideas/i/votes`);
    expect(scale.request.body).toEqual({ scale: 4 });
    scale.flush(null);
  });

  it('posts a comment with the scoped token and no author', () => {
    service.addComment('idea-1', 'scoped-token', 'Nets are cheaper in bulk').subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/idea-1/comments`);
    expect(req.request.method).toBe('POST');
    // Body only. The author comes from the token's subject — a client that could
    // name its own author could sign a comment with someone else's name.
    expect(req.request.body).toEqual({ body: 'Nets are cheaper in bulk' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer scoped-token');
    req.flush({});
  });

  it('lists comments with the scoped token', () => {
    service.listComments('idea-1', 'scoped-token').subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/idea-1/comments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer scoped-token');
    req.flush([]);
  });

  // The whole point of the service. If one of these ever fails, an admin opening
  // a lead's voting link is about to send their own Bearer token with the vote.
  it('sets SKIP_AUTH on every request it makes', () => {
    service.get('tok').subscribe();
    const session = http.expectOne(`${baseUrl}/api/vote-sessions`);
    expect(session.request.context.get(SKIP_AUTH)).toBe(true);
    session.flush(SESSION);

    service.castVote('idea-1', 'scoped', { kind: 'YesNo', value: true }).subscribe();
    const vote = http.expectOne(`${baseUrl}/api/ideas/idea-1/votes`);
    expect(vote.request.context.get(SKIP_AUTH)).toBe(true);
    vote.flush(null);

    service.listComments('idea-1', 'scoped').subscribe();
    const list = http.expectOne(`${baseUrl}/api/ideas/idea-1/comments`);
    expect(list.request.context.get(SKIP_AUTH)).toBe(true);
    list.flush([]);

    service.addComment('idea-1', 'scoped', 'hi').subscribe();
    const add = http.expectOne(`${baseUrl}/api/ideas/idea-1/comments`);
    expect(add.request.context.get(SKIP_AUTH)).toBe(true);
    add.flush({});
  });
});
