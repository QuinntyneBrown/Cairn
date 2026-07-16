import { Page, Route } from '@playwright/test';

/**
 * A fake Cairn API for the ADMIN surface.
 *
 * Installed on top of `installFakeBackend` rather than inside it: Playwright
 * matches routes in reverse registration order, so registering this second means
 * it answers first and the ballot fake stays untouched. The two surfaces have
 * different owners and almost no overlap; sharing one handler would couple them
 * for no gain.
 *
 * EVERY SHAPE HERE IS COPIED FROM A REAL C# RECORD, and cross-checked against
 * `recorded-api-contract.json`. That discipline is the whole point: the original
 * client was written against an imagined contract and shipped green precisely
 * because its fakes agreed with the imagination. A fake is only worth something if
 * it is the shape the server actually sends.
 */

export const ADMIN_IDEA_ID = 'aa000000-0000-0000-0000-000000000010';
export const OPTIONS_IDEA_ID = 'aa000000-0000-0000-0000-000000000011';
export const SCALE_IDEA_ID = 'aa000000-0000-0000-0000-000000000012';

/** The raw URL the mint endpoint returns. Exists in that response and nowhere else. */
export const MINTED_URL = 'http://localhost:4205/vote/raw-token-aaa';

export interface AdminBackend {
  readonly requests: { path: string; method: string; body: unknown }[];
  /** Bodies POSTed/PUT to a path, for asserting exactly what went on the wire. */
  bodiesFor(path: string, method: string): unknown[];
  /** Make the next idea write fail with a real ValidationProblemDetails. */
  failNextWriteWith(errors: Record<string, string[]>): void;
}

/** Verbatim `IdeaSummaryDto(Id, Title, ResponseType, Status, OpensAt, ClosesAt, VoteCount, InvitedCount)`. */
const SUMMARIES = [
  {
    id: ADMIN_IDEA_ID,
    title: 'Run a Build Night in September',
    responseType: 'YesNo',
    status: 'Open',
    opensAt: '2026-07-01T00:00:00+00:00',
    closesAt: '2026-08-30T00:00:00+00:00',
    voteCount: 6,
    invitedCount: 8,
  },
  {
    id: OPTIONS_IDEA_ID,
    title: 'Which cause should the next hackathon serve?',
    responseType: 'Options',
    status: 'Closed',
    opensAt: '2026-06-01T00:00:00+00:00',
    closesAt: '2026-06-30T00:00:00+00:00',
    voteCount: 7,
    invitedCount: 9,
  },
  {
    id: SCALE_IDEA_ID,
    title: 'How ready are we to host a regional gathering?',
    responseType: 'Scale',
    status: 'Draft',
    opensAt: '2026-09-01T00:00:00+00:00',
    closesAt: '2026-09-30T00:00:00+00:00',
    voteCount: 0,
    invitedCount: 0,
  },
];

/** Verbatim `IdeaDto(Id, Title, Description, ResponseType, Status, OpensAt, ClosesAt, Options)`. */
const IDEAS: Record<string, unknown> = {
  [ADMIN_IDEA_ID]: {
    id: ADMIN_IDEA_ID,
    title: 'Run a Build Night in September',
    description: 'Should we run one before the end of Q3?',
    responseType: 'YesNo',
    status: 'Open',
    opensAt: '2026-07-01T00:00:00+00:00',
    closesAt: '2026-08-30T00:00:00+00:00',
    options: [],
  },
  [OPTIONS_IDEA_ID]: {
    id: OPTIONS_IDEA_ID,
    title: 'Which cause should the next hackathon serve?',
    description: 'Pick the one you would back first.',
    responseType: 'Options',
    status: 'Closed',
    opensAt: '2026-06-01T00:00:00+00:00',
    closesAt: '2026-06-30T00:00:00+00:00',
    options: [
      { id: 'bb000000-0000-0000-0000-000000000001', label: 'Newcomer settlement', sortOrder: 0 },
      { id: 'bb000000-0000-0000-0000-000000000002', label: 'Food bank logistics', sortOrder: 1 },
    ],
  },
  [SCALE_IDEA_ID]: {
    id: SCALE_IDEA_ID,
    title: 'How ready are we to host a regional gathering?',
    description: 'One is not at all; ten is we could start Monday.',
    responseType: 'Scale',
    status: 'Draft',
    opensAt: '2026-09-01T00:00:00+00:00',
    closesAt: '2026-09-30T00:00:00+00:00',
    options: [],
  },
};

/**
 * Verbatim `IdeaResultsDto`. Flat, with only the block matching `responseType`
 * populated and the rest explicitly null — exactly as the server sends it.
 */
const RESULTS: Record<string, unknown> = {
  [ADMIN_IDEA_ID]: {
    ideaId: ADMIN_IDEA_ID,
    title: 'Run a Build Night in September',
    responseType: 'YesNo',
    status: 'Open',
    closesAt: '2026-08-30T00:00:00+00:00',
    totalVotes: 6,
    invitedCount: 8,
    yesCount: 5,
    noCount: 1,
    options: null,
    scale: null,
  },
  [OPTIONS_IDEA_ID]: {
    ideaId: OPTIONS_IDEA_ID,
    title: 'Which cause should the next hackathon serve?',
    responseType: 'Options',
    status: 'Closed',
    closesAt: '2026-06-30T00:00:00+00:00',
    totalVotes: 4,
    invitedCount: 9,
    yesCount: null,
    noCount: null,
    options: [
      { optionId: 'bb000000-0000-0000-0000-000000000001', label: 'Newcomer settlement', count: 4 },
      // Zero is a result: nobody backed this, and the bar must still be drawn.
      { optionId: 'bb000000-0000-0000-0000-000000000002', label: 'Food bank logistics', count: 0 },
    ],
    scale: null,
  },
  [SCALE_IDEA_ID]: {
    ideaId: SCALE_IDEA_ID,
    title: 'How ready are we to host a regional gathering?',
    responseType: 'Scale',
    status: 'Draft',
    closesAt: '2026-09-30T00:00:00+00:00',
    totalVotes: 6,
    invitedCount: 9,
    yesCount: null,
    noCount: null,
    options: null,
    // All ten points, zeros included — the server never omits one.
    scale: {
      average: 7,
      distribution: [
        { value: 1, count: 0 },
        { value: 2, count: 0 },
        { value: 3, count: 0 },
        { value: 4, count: 0 },
        { value: 5, count: 2 },
        { value: 6, count: 0 },
        { value: 7, count: 2 },
        { value: 8, count: 0 },
        { value: 9, count: 2 },
        { value: 10, count: 0 },
      ],
    },
  },
};

/** Verbatim `LeadDto(Id, Email, DisplayName, Role, CanSignIn)`. */
const LEADS = [
  {
    id: 'dd000000-0000-0000-0000-000000000001',
    email: 'ada@faithtech.to',
    displayName: 'Ada Osei',
    role: 'Lead',
    canSignIn: false,
  },
  {
    id: 'dd000000-0000-0000-0000-000000000002',
    email: 'grace@faithtech.to',
    displayName: 'Grace Lim',
    role: 'Lead',
    canSignIn: false,
  },
  {
    id: 'dd000000-0000-0000-0000-000000000003',
    email: 'quinn@faithtech.to',
    displayName: 'Quinn Brown',
    role: 'Admin',
    canSignIn: true,
  },
];

/**
 * Verbatim `VoteLinkDto`. `url` is null on every LISTED link — only the hash is
 * stored server-side, so a GET can never reproduce it. This is the single most
 * important thing this fake gets right: a fake that returned a url here would let
 * a UI promising "copy the link" pass, and that UI cannot work against the real API.
 */
const LISTED_LINKS = [
  {
    id: 'ee000000-0000-0000-0000-000000000001',
    ideaId: ADMIN_IDEA_ID,
    userId: 'dd000000-0000-0000-0000-000000000001',
    displayName: 'Ada Osei',
    email: 'ada@faithtech.to',
    expiresAt: '2026-08-30T00:00:00+00:00',
    createdAt: '2026-07-01T00:00:00+00:00',
    isRevoked: false,
    hasVoted: true,
    url: null,
  },
  {
    id: 'ee000000-0000-0000-0000-000000000002',
    ideaId: ADMIN_IDEA_ID,
    userId: 'dd000000-0000-0000-0000-000000000002',
    displayName: 'Grace Lim',
    email: 'grace@faithtech.to',
    expiresAt: '2026-08-30T00:00:00+00:00',
    createdAt: '2026-07-01T00:00:00+00:00',
    isRevoked: false,
    hasVoted: false,
    url: null,
  },
];

/** The mint response — the one and only time `url` is populated. */
const MINTED_LINKS = [
  {
    ...LISTED_LINKS[1],
    id: 'ee000000-0000-0000-0000-000000000003',
    url: MINTED_URL,
  },
];

export async function installAdminBackend(page: Page): Promise<AdminBackend> {
  const requests: { path: string; method: string; body: unknown }[] = [];
  let nextWriteErrors: Record<string, string[]> | null = null;

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    requests.push({ path, method, body: request.postDataJSON?.() ?? null });

    if (path === '/api/me' && method === 'GET') {
      // Verbatim CurrentUserDto.
      return json(route, {
        id: 'dd000000-0000-0000-0000-000000000003',
        email: 'quinn@faithtech.to',
        displayName: 'Quinn Brown',
        role: 'Admin',
      });
    }

    if (path === '/api/leads' && method === 'GET') {
      return json(route, LEADS);
    }

    if (path === '/api/ideas' && method === 'GET') {
      // The status filter is applied server-side, so the fake applies it too — a
      // fake that ignored it would let a client-side filter pass.
      const status = url.searchParams.get('status');
      return json(route, status ? SUMMARIES.filter((s) => s.status === status) : SUMMARIES);
    }

    if (path === '/api/ideas' && method === 'POST') {
      if (nextWriteErrors) {
        const errors = nextWriteErrors;
        nextWriteErrors = null;
        // Verbatim ValidationProblemDetails, as ExceptionHandlingMiddleware writes it.
        return json(
          route,
          { title: 'One or more validation errors occurred.', status: 400, errors },
          400,
        );
      }
      return json(route, IDEAS[ADMIN_IDEA_ID]);
    }

    const resultsMatch = path.match(/^\/api\/ideas\/([^/]+)\/results$/);
    if (resultsMatch && method === 'GET') {
      return json(route, RESULTS[resultsMatch[1]] ?? RESULTS[ADMIN_IDEA_ID]);
    }

    const linksMatch = path.match(/^\/api\/ideas\/([^/]+)\/vote-links$/);
    if (linksMatch && method === 'GET') {
      return json(route, LISTED_LINKS);
    }
    if (linksMatch && method === 'POST') {
      return json(route, MINTED_LINKS);
    }

    const commentsMatch = path.match(/^\/api\/ideas\/([^/]+)\/comments$/);
    if (commentsMatch && method === 'GET') {
      return json(route, []);
    }

    const ideaMatch = path.match(/^\/api\/ideas\/([^/]+)$/);
    if (ideaMatch && (method === 'GET' || method === 'PUT')) {
      if (method === 'PUT' && nextWriteErrors) {
        const errors = nextWriteErrors;
        nextWriteErrors = null;
        return json(
          route,
          { title: 'One or more validation errors occurred.', status: 400, errors },
          400,
        );
      }
      return json(route, IDEAS[ideaMatch[1]] ?? IDEAS[ADMIN_IDEA_ID]);
    }

    // Anything not handled here falls through to the ballot fake underneath.
    return route.fallback();
  });

  return {
    requests,
    bodiesFor: (path, method) =>
      requests.filter((r) => r.path === path && r.method === method).map((r) => r.body),
    failNextWriteWith: (errors) => {
      nextWriteErrors = errors;
    },
  };
}
