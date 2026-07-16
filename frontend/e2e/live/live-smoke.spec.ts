import { APIRequestContext, expect, request, test } from '@playwright/test';
import type { BallotStatus } from '../../projects/cairn/api/src/lib/models/ballot-status';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API,
  HOW_TO_START,
  LiveIdea,
  getIdea,
  isApiUp,
  listIdeas,
  listLeads,
  mintRealLink,
  realTally,
  signInAsRealAdmin,
  tokenFromUrl,
} from './fixtures/live-api';

/**
 * THE LIVE SMOKE TEST — real Angular app, real .NET API, real database.
 *
 * This is the only suite in the repo where nothing is faked. Everything else
 * fakes the side it is checking: the unit tests fake HTTP, the default E2E suite
 * fakes the backend, the contract check reads a recording. All three can be green
 * while the two halves disagree today — a whole model layer once was.
 *
 * So this covers the spine and nothing more: sign in, redeem a link, vote, see it
 * counted, and the isolation invariant. Detail belongs in the faked suite, where
 * it is fast and deterministic. Every test added here costs a database.
 */

/**
 * What the ballot shows for a link the server refuses.
 *
 * Typed against the real union rather than written as a bare string: this test
 * originally expected `'Invalid'`, which had been renamed, and a stale literal
 * failed here for a reason that had nothing to do with the live stack. A rename
 * now breaks the compile instead of the run.
 */
const DEAD_LINK_STATUS: BallotStatus = 'Unavailable';

let ctx: APIRequestContext;
let adminToken: string;

test.beforeAll(async () => {
  // Fail fast and legibly. A smoke test whose real dependency is missing must say
  // what to start — never time out mysteriously, and never quietly pass.
  const up = await isApiUp();

  if (!up) {
    // Printed, not just passed to test.skip(). Playwright's reporter shows the
    // skip reason on request but a plain run prints "5 skipped" and nothing else —
    // which is indistinguishable from success at a glance, and would make this
    // suite exactly the kind of green-that-means-nothing it exists to prevent.
    console.error(
      `\n${'='.repeat(72)}\n` +
        `  SKIPPED: the Cairn API is not answering at ${API}.\n` +
        `  These tests prove the real client against the real server, so there is\n` +
        `  nothing to prove without it. Nothing is broken — the stack is not up.\n` +
        `${HOW_TO_START}${'='.repeat(72)}\n`,
    );
  }

  test.skip(!up, `The Cairn API is not answering at ${API}. ${HOW_TO_START}`);

  ctx = await request.newContext();
  adminToken = await signInAsRealAdmin(ctx);
});

test.afterAll(async () => {
  await ctx?.dispose();
});

/** The seeded Options idea — open, and the one we vote on. */
async function openIdea(): Promise<LiveIdea> {
  const ideas = await listIdeas(ctx, adminToken);
  const idea = ideas.find((i) => i.status === 'Open' && i.responseType === 'Options');

  if (!idea) {
    throw new Error(
      'No open Options idea in the database. Re-seed: ' +
        '`dotnet run --project src/Cairn.Cli -- db seed --reset`',
    );
  }

  return idea;
}

async function mintLinkForFirstLead(ideaId: string): Promise<string> {
  const leads = await listLeads(ctx, adminToken);
  return mintRealLink(ctx, adminToken, ideaId, leads[0].id);
}

test('1. the real admin signs in through the UI against the real API', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Landed inside the guarded area, which means the real API issued a real token
  // and the guard accepted it.
  await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });

  // And the session the app stored is a real JWT, not a fixture string.
  const stored = await page.evaluate(() => localStorage.getItem('cairn.auth'));
  const token = JSON.parse(stored ?? '{}').token as string;
  expect(token.split('.')).toHaveLength(3);
});

test('2. a real minted link opens anonymously and yields a real scoped JWT', async ({ page }) => {
  const idea = await openIdea();
  const url = await mintLinkForFirstLead(idea.id);

  // Watch the real redemption go past.
  const redemption = page.waitForResponse(
    (r) => r.url().includes('/api/vote-sessions') && r.request().method() === 'POST',
  );

  await page.goto(url);
  const response = await redemption;

  expect(response.status()).toBe(200);
  await expect(page.getByTestId('ballot-page')).toBeVisible();
  await expect(page.getByTestId('ballot-title')).toHaveText(idea.title);
  await expect(page.getByTestId('ballot-status')).toHaveText('Open');

  // The scoped token is a real JWT whose claims say what they should: this is a
  // vote-scoped session for THIS idea, not a user session.
  const session = await response.json();
  const [, payload] = (session.accessToken as string).split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());

  expect(claims.scope).toBe('vote');
  expect(claims.idea_id).toBe(idea.id);
});

test('3. a real vote through the UI lands in the real tally', async ({ page }) => {
  const idea = await openIdea();
  const detail = await getIdea(ctx, adminToken, idea.id);
  const before = await realTally(ctx, adminToken, idea.id);

  const url = await mintLinkForFirstLead(idea.id);

  // The redemption tells us whether this lead has voted before. That matters:
  // voting is an UPSERT, so a returning voter changes their answer rather than
  // adding one, and the total does not move. The seeded database already carries
  // votes, so assuming +1 would make this test pass or fail on who got seeded —
  // exactly the shared-state trap this suite is most exposed to.
  const redemption = page.waitForResponse(
    (r) => r.url().includes('/api/vote-sessions') && r.request().method() === 'POST',
  );

  await page.goto(url);
  const session = await (await redemption).json();
  const hadVotedAlready = session.myVote !== null;

  await expect(page.getByTestId('ballot-page')).toBeVisible();

  // Answer through the real control. The radio itself is `sr-only` — a styled
  // label is what a person actually clicks, so that is what we click.
  const choice = detail.options[0];
  await page.getByText(choice.label, { exact: true }).click();

  const cast = page.waitForResponse(
    (r) => r.url().includes('/votes') && r.request().method() === 'PUT',
  );
  await page.getByTestId('ballot-submit').click();

  expect((await cast).status()).toBeLessThan(300);
  await expect(page.getByTestId('ballot-thanks')).toBeVisible();

  // The real server counted it. This is the assertion no fake can make.
  const after = await realTally(ctx, adminToken, idea.id);
  expect(after.totalVotes).toBe(before.totalVotes + (hadVotedAlready ? 0 : 1));

  // And it counted it against the option we actually picked.
  const tallied = (after.options ?? []).find(
    (o) => (o as { optionId: string }).optionId === choice.id,
  ) as { count: number } | undefined;
  expect(tallied?.count ?? 0).toBeGreaterThan(0);
});

/**
 * 4. THE ISOLATION INVARIANT, FOR REAL.
 *
 * We have proven this against a fake backend since the first day of the frontend.
 * This is the first time it is proven against the real one: a real admin session
 * in localStorage, a real minted link, a real server that would happily read a
 * Bearer token if one arrived.
 *
 * If SKIP_AUTH ever regresses, the admin's own token rides along with the ballot
 * request and the server may attribute a lead's vote to them — a wrong tally that
 * nothing announces.
 */
test('4. a signed-in admin opening a lead link sends NO Authorization header', async ({ page }) => {
  const idea = await openIdea();
  const url = await mintLinkForFirstLead(idea.id);

  // A REAL admin session, not a fabricated one.
  await page.addInitScript((token) => {
    localStorage.setItem(
      'cairn.auth',
      JSON.stringify({
        token,
        refreshToken: 'unused-here',
        user: { id: 'x', email: 'admin@faithtech.to', displayName: 'Admin', role: 'Admin' },
      }),
    );
  }, adminToken);

  const seen: { url: string; auth: string | null }[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) {
      seen.push({ url: r.url(), auth: r.headers()['authorization'] ?? null });
    }
  });

  await page.goto(url);
  await expect(page.getByTestId('ballot-page')).toBeVisible();
  await expect(page.getByTestId('ballot-status')).toHaveText('Open');

  const redemptions = seen.filter((r) => r.url.includes('/api/vote-sessions'));
  expect(redemptions).toHaveLength(1);
  expect(redemptions[0].auth).toBeNull();

  // Nothing on the whole voting path may carry the admin's token — the ballot
  // also fetches comments, with its own scoped token. Checking only the first
  // request would let a later leak through.
  const leaked = seen.filter((r) => (r.auth ?? '').includes(adminToken));
  expect(leaked, `these requests carried the admin's token: ${JSON.stringify(leaked)}`).toEqual([]);

  // And the admin was not bounced to sign-in by the public route.
  expect(new URL(page.url()).pathname).toContain('/vote/');
});

test('5. a dead link gets the real 410 and renders a terminal state', async ({ page }) => {
  const dead = page.waitForResponse((r) => r.url().includes('/api/vote-sessions'));

  await page.goto('/vote/not-a-real-token-at-all');

  // The real 410 — the same answer the server gives for unknown, expired and
  // revoked links alike, so the endpoint cannot be used to probe which tokens
  // exist. The client turns that one fact into one state.
  expect((await dead).status()).toBe(410);

  await expect(page.getByTestId('ballot-page')).toBeVisible();
  await expect(page.getByTestId('ballot-status')).toHaveText(DEAD_LINK_STATUS);

  // Still no redirect: a stranger with a dead link is not sent to a login screen
  // they could never get past.
  expect(new URL(page.url()).pathname).toContain('/vote/');
});
