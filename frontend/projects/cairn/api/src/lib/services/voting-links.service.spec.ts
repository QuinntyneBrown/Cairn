import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { VotingLinksService } from './voting-links.service';
import { VotingLink } from '../models/voting-link';

describe('VotingLinksService', () => {
  let service: VotingLinksService;
  let http: HttpTestingController;
  const baseUrl = 'http://test.local';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        VotingLinksService,
      ],
    });
    service = TestBed.inject(VotingLinksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the links for an idea, and every url comes back null', () => {
    let received: readonly VotingLink[] | undefined;
    service.list('i1').subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/ideas/i1/vote-links`);
    expect(req.request.method).toBe('GET');

    // Verbatim VoteLinkDto as a list returns it: url null, because only the hash
    // is stored. A UI promising to re-show a link is promising a lie.
    req.flush([
      {
        id: 'link-7',
        ideaId: 'i1',
        userId: 'u1',
        displayName: 'Dave',
        email: 'dave@example.org',
        expiresAt: '2026-08-01T00:00:00+00:00',
        createdAt: '2026-07-01T00:00:00+00:00',
        isRevoked: false,
        hasVoted: true,
        url: null,
      },
    ]);

    expect(received?.[0].url).toBeNull();
    expect(received?.[0].hasVoted).toBe(true);
    expect(received?.[0].displayName).toBe('Dave');
  });

  it('mints links for named leads and returns an array with urls populated', () => {
    let received: readonly VotingLink[] | undefined;
    service.create('i1', { userIds: ['u1', 'u2'] }).subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/ideas/i1/vote-links`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userIds: ['u1', 'u2'] });

    req.flush([
      {
        id: 'link-7',
        ideaId: 'i1',
        userId: 'u1',
        displayName: 'Dave',
        email: 'dave@example.org',
        expiresAt: '2026-08-01T00:00:00+00:00',
        createdAt: '2026-07-01T00:00:00+00:00',
        isRevoked: false,
        hasVoted: false,
        url: 'https://cairn.test/vote/raw-token-1',
      },
    ]);

    // The one moment the raw URL exists.
    expect(received?.length).toBe(1);
    expect(received?.[0].url).toBe('https://cairn.test/vote/raw-token-1');
  });

  it('passes an omitted userIds through as-is, which mints for every lead', () => {
    service.create('i1', {}).subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/i1/vote-links`);
    // Deliberate: `{}` is the "invite everyone" gesture server-side, never a no-op.
    expect(req.request.body).toEqual({});
    req.flush([]);
  });

  it('revokes a link', () => {
    service.remove('i1', 'link-7').subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/i1/vote-links/link-7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
