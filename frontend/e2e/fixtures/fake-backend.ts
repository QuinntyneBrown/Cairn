import { Page, Route } from '@playwright/test';
import recording from './recorded-api-contract.json';

/**
 * Every response below is SPREAD FROM A RECORDED ONE — real bytes from a live
 * server against a seeded database — and only the values a scenario cares about are
 * overridden.
 *
 * This is not ceremony. The models in this repo were once written from a prose spec
 * and shipped green, because the fakes were written by the same person holding the
 * same wrong belief: a fake you author agrees with you, not with the server. Typing
 * `{ status: 'Open', ... }` here by hand would reintroduce exactly that, and the
 * suite would go green on fiction again. Spreading a recorded body means a field the
 * server sends cannot be missing here, and a field it does not send cannot be
 * invented. Scenarios still vary — but only in values, never in shape.
 *
 * If an endpoint changes, re-record. Do not hand-edit the JSON.
 */
const RECORDED = recording as Record<string, never>;

/** `VoteSessionDto` as the real API returns it. */
const RECORDED_SESSION: Record<string, unknown> = RECORDED[
  'POST /api/vote-sessions -> 200 (VoteSessionDto)'
];

/** The 410 body, identical for unknown / expired / revoked. */
const RECORDED_GONE: unknown = RECORDED[
  'POST /api/vote-sessions -> 410 (unknown/expired/revoked are IDENTICAL)'
];

/** `CommentDto`. */
const RECORDED_COMMENT: Record<string, unknown> = RECORDED[
  'POST /api/ideas/{id}/comments -> 200'
];

/** `VoteDto` — the flat wire vote, as `myVote` arrives. */
const RECORDED_VOTE: Record<string, unknown> = RECORDED['PUT /api/ideas/{id}/votes -> 200 (VoteDto)'];

const RECORDED_IDEA = RECORDED_SESSION['idea'] as Record<string, unknown>;

/** An open YesNo ballot, not yet answered. */
export const OPEN_BALLOT_TOKEN = 'some-token';

/** An open ballot the lead has already answered — they may still change it. */
export const ALREADY_VOTED_TOKEN = 'voted-token';

/** A link to an idea whose voting window has already shut. */
export const CLOSED_BALLOT_TOKEN = 'closed-token';

/** An open `Scale` ballot. */
export const SCALE_BALLOT_TOKEN = 'scale-token';

/** An open `Options` ballot. */
export const OPTIONS_BALLOT_TOKEN = 'options-token';

/** The admin's access token, as seeded by `signInAsAdmin`. Must never leave the browser. */
export const ADMIN_TOKEN = 'admin-access-token';

/** The scoped token the fake hands back when a link is redeemed. */
export const SCOPED_BALLOT_TOKEN = 'scoped-ballot-token';

/** Records what the app actually put on the wire, headers and all. */
export interface CapturedRequest {
  readonly url: string;
  readonly path: string;
  readonly method: string;
  readonly authorization: string | null;
  readonly headers: Record<string, string>;
  /** Raw body, so a test can assert the exact bytes rather than a paraphrase. */
  readonly postData: string | null;
}

export interface FakeBackend {
  /** Every `/api/**` request the page made, in order. */
  readonly requests: CapturedRequest[];
  /** Requests to the anonymous redemption endpoint. */
  ballotRequests(): CapturedRequest[];
  /** Any request carrying the ADMIN's token. Must always be empty on the voting path. */
  requestsCarryingAdminToken(): CapturedRequest[];
  /**
   * Shut the window server-side, mid-session, as the closure hosted service would.
   * Every subsequent vote or comment gets the same 409 the real API returns — which
   * is the thing that actually stops a late vote, hub connection or not.
   */
  closeVoting(): void;
}

/** A YesNo idea. Recorded `IdeaDto` shape; values chosen to read well in a failure message. */
const IDEA = {
  ...RECORDED_IDEA,
  id: 'aa000000-0000-0000-0000-000000000001',
  title: 'Buy mosquito nets for the Kitgum clinic',
  description: 'Should we spend the Q3 surplus on nets?',
  responseType: 'YesNo',
  status: 'Open',
  // A YesNo idea carries no options — the server sends an empty list, not null.
  options: [],
};

const SCALE_IDEA = {
  ...IDEA,
  id: 'aa000000-0000-0000-0000-000000000002',
  title: 'How ready are we to plant in Kitgum?',
  description: 'One is not at all ready; ten is we could start on Monday.',
  responseType: 'Scale',
};

const OPTIONS_IDEA = {
  ...IDEA,
  id: 'aa000000-0000-0000-0000-000000000003',
  title: 'Where should the Q3 surplus go?',
  description: 'Pick the one you would back first.',
  responseType: 'Options',
  options: [
    { id: 'bb000000-0000-0000-0000-000000000001', label: 'Mosquito nets', sortOrder: 0 },
    { id: 'bb000000-0000-0000-0000-000000000002', label: 'Clean water', sortOrder: 1 },
    { id: 'bb000000-0000-0000-0000-000000000003', label: 'School books', sortOrder: 2 },
  ],
};

/** `VoteSessionDto`, spread from the recorded one so it cannot lose a field. */
function sessionFor(idea: unknown, myVote: unknown = null) {
  return {
    ...RECORDED_SESSION,
    accessToken: SCOPED_BALLOT_TOKEN,
    leadName: 'Pastor Dave',
    idea,
    myVote,
  };
}

/**
 * Which link means what. Anything not here gets a 410 — matching the real API,
 * which answers unknown, expired AND revoked identically so that the endpoint
 * cannot be used to probe which tokens exist.
 */
const SESSIONS: Record<string, unknown> = {
  [OPEN_BALLOT_TOKEN]: sessionFor(IDEA),
  [SCALE_BALLOT_TOKEN]: sessionFor(SCALE_IDEA),
  [OPTIONS_BALLOT_TOKEN]: sessionFor(OPTIONS_IDEA),
  [CLOSED_BALLOT_TOKEN]: sessionFor({ ...IDEA, status: 'Closed' }),
  // An existing vote is NOT a terminal state: the backend upserts, so this ballot
  // comes back Open with the answer pre-filled and the lead may change it.
  [ALREADY_VOTED_TOKEN]: sessionFor(IDEA, {
    ...RECORDED_VOTE,
    ideaId: IDEA.id,
    responseType: 'YesNo',
    yesNo: true,
    selectedOptionId: null,
    scale: null,
  }),
};

/**
 * Installs a fake Cairn API on the page, so no .NET backend or database is
 * needed to run the suite — and, more usefully here, so every request can be
 * inspected before it is answered.
 */
export async function installFakeBackend(page: Page): Promise<FakeBackend> {
  const requests: CapturedRequest[] = [];
  const comments: unknown[] = [];
  let votingClosed = false;

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    const url = new URL(request.url());
    const method = request.method();

    requests.push({
      url: request.url(),
      path: url.pathname,
      method,
      authorization: headers['authorization'] ?? null,
      headers,
      postData: request.postData(),
    });

    // Redeem a voting link. Anonymous — no Authorization expected, ever.
    if (url.pathname === '/api/vote-sessions' && method === 'POST') {
      const body = request.postDataJSON() as { token?: string };
      const session = body?.token ? SESSIONS[body.token] : undefined;

      if (!session) {
        // 410 is what the real API returns for unknown, expired AND revoked links:
        // one indistinguishable answer. The client turns this into `Unavailable`.
        await route.fulfill({
          status: 410,
          contentType: 'application/json',
          body: JSON.stringify(RECORDED_GONE),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
      return;
    }

    // The ballot page reads comments with its own scoped token.
    if (url.pathname.endsWith('/comments') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(comments),
      });
      return;
    }

    if (url.pathname.endsWith('/comments') && method === 'POST') {
      if (votingClosed) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'Voting closed', status: 409 }),
        });
        return;
      }

      const body = request.postDataJSON() as { body?: string };
      const comment = {
        ...RECORDED_COMMENT,
        id: `cc000000-0000-0000-0000-00000000000${comments.length + 1}`,
        ideaId: IDEA.id,
        authorName: 'Pastor Dave',
        body: body?.body ?? '',
      };
      comments.push(comment);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(comment),
      });
      return;
    }

    if (url.pathname.endsWith('/votes') && method === 'PUT') {
      // The real guarantee. The server re-derives the window on every write, so a
      // vote that arrives after close is refused here even if the client never
      // heard the hub say so.
      if (votingClosed) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'Voting closed', status: 409 }),
        });
        return;
      }

      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  return {
    requests,
    ballotRequests: () => requests.filter((r) => r.path === '/api/vote-sessions'),
    requestsCarryingAdminToken: () =>
      requests.filter((r) => (r.authorization ?? '').includes(ADMIN_TOKEN)),
    closeVoting: () => {
      votingClosed = true;
    },
  };
}
