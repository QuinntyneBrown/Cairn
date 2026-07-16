import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { IdeasService } from './ideas.service';
import { SKIP_AUTH } from '../auth/skip-auth.context';
import { IdeaResults } from '../models/idea-results';
import { IdeaSummary } from '../models/idea-summary';

/**
 * These specs assert PAYLOAD SHAPE, not just URLs.
 *
 * An earlier version of this suite checked only the method and path and flushed
 * `[]`, which is why it stayed green while the models here described an API the
 * backend does not serve. Every response fixture below is a claim about a real
 * DTO in `Cairn.Application`; if one drifts, this suite must fail.
 */
describe('IdeasService', () => {
  let service: IdeasService;
  let http: HttpTestingController;
  const baseUrl = 'http://test.local';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        IdeasService,
      ],
    });
    service = TestBed.inject(IdeasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists ideas and reads the summary shape the backend sends', () => {
    let received: readonly IdeaSummary[] | undefined;
    service.list().subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/ideas`);
    expect(req.request.method).toBe('GET');

    // Verbatim IdeaSummaryDto.
    req.flush([
      {
        id: 'i1',
        title: 'Buy mosquito nets',
        responseType: 'YesNo',
        status: 'Open',
        opensAt: '2026-07-01T00:00:00+00:00',
        closesAt: '2026-07-30T00:00:00+00:00',
        voteCount: 3,
        invitedCount: 8,
      },
    ]);

    expect(received?.[0].status).toBe('Open');
    expect(received?.[0].voteCount).toBe(3);
    expect(received?.[0].invitedCount).toBe(8);
  });

  it('omits the status param entirely when no filter is given', () => {
    service.list().subscribe();

    // Not `?status=` — an empty value binds as an invalid enum, not as "all".
    const req = http.expectOne((r) => r.url === `${baseUrl}/api/ideas`);
    expect(req.request.params.has('status')).toBe(false);
    req.flush([]);
  });

  it('sends the status filter as a query param when given', () => {
    service.list('Closed').subscribe();

    const req = http.expectOne((r) => r.url === `${baseUrl}/api/ideas`);
    expect(req.request.params.get('status')).toBe('Closed');
    req.flush([]);
  });

  it('creates an idea with the full backend body', () => {
    service
      .create({
        title: 'Nets',
        description: 'Buy nets',
        responseType: 'Options',
        opensAt: '2026-07-01T00:00:00.000Z',
        closesAt: '2026-07-30T00:00:00.000Z',
        options: ['Nets', 'Wells'],
      })
      .subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Nets',
      description: 'Buy nets',
      responseType: 'Options',
      opensAt: '2026-07-01T00:00:00.000Z',
      closesAt: '2026-07-30T00:00:00.000Z',
      options: ['Nets', 'Wells'],
    });
    req.flush({});
  });

  it('updates an idea with a full replacement body, not a patch', () => {
    service
      .update('i1', {
        title: 'T',
        description: 'D',
        responseType: 'YesNo',
        opensAt: '2026-07-01T00:00:00.000Z',
        closesAt: '2026-07-30T00:00:00.000Z',
        options: [],
      })
      .subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/i1`);
    expect(req.request.method).toBe('PUT');
    // responseType and options MUST travel: omitting them rewrites, not preserves.
    expect(req.request.body).toEqual({
      title: 'T',
      description: 'D',
      responseType: 'YesNo',
      opensAt: '2026-07-01T00:00:00.000Z',
      closesAt: '2026-07-30T00:00:00.000Z',
      options: [],
    });
    req.flush({});
  });

  it('deletes an idea', () => {
    service.remove('i1').subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas/i1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('reads the flat results shape, with only the block matching the response type', () => {
    let received: IdeaResults | undefined;
    service.getTally('i1').subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/ideas/i1/results`);
    expect(req.request.method).toBe('GET');

    // Verbatim IdeaResultsDto for a Scale idea: yes/no and options come back null.
    req.flush({
      ideaId: 'i1',
      title: 'How urgent?',
      responseType: 'Scale',
      status: 'Open',
      closesAt: '2026-07-30T00:00:00+00:00',
      totalVotes: 2,
      invitedCount: 5,
      yesCount: null,
      noCount: null,
      options: null,
      scale: {
        average: 7.5,
        distribution: [
          { value: 1, count: 0 },
          { value: 2, count: 0 },
          { value: 3, count: 0 },
          { value: 4, count: 0 },
          { value: 5, count: 0 },
          { value: 6, count: 0 },
          { value: 7, count: 1 },
          { value: 8, count: 1 },
          { value: 9, count: 0 },
          { value: 10, count: 0 },
        ],
      },
    });

    expect(received?.scale?.average).toBe(7.5);
    // All ten points always arrive, zeros included — the axis is fixed.
    expect(received?.scale?.distribution.length).toBe(10);
    expect(received?.yesCount).toBeNull();
    expect(received?.options).toBeNull();
  });

  it('gets and adds comments', () => {
    service.getComments('i1').subscribe();
    http.expectOne(`${baseUrl}/api/ideas/i1/comments`).flush([]);

    service.addComment('i1', { body: 'Yes' }).subscribe();
    const post = http.expectOne(`${baseUrl}/api/ideas/i1/comments`);
    expect(post.request.method).toBe('POST');
    // Body only — the author comes from the token's subject, never the client.
    expect(post.request.body).toEqual({ body: 'Yes' });
    post.flush({});
  });

  // The mirror image of the BallotService test: the admin services must NOT skip
  // auth, or every authenticated call would go out anonymous and 401.
  it('does not set SKIP_AUTH — these are admin calls and need the bearer token', () => {
    service.list().subscribe();

    const req = http.expectOne(`${baseUrl}/api/ideas`);
    expect(req.request.context.get(SKIP_AUTH)).toBe(false);
    req.flush([]);
  });
});
