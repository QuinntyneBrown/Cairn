import { ADMIN_TOKEN, OPEN_BALLOT_TOKEN } from '../fixtures/fake-backend';
import { expect, signInAsAdmin, test } from '../fixtures/test';
import { BallotPage } from '../pages/ballot.page';
import { SignInPage } from '../pages/sign-in.page';

/**
 * The public voting route must be COMPLETELY isolated from the admin session.
 *
 * Two things go wrong if it is not, and neither one fails loudly:
 *
 *  1. An admin opens a lead's voting link — to check it works, or because it was
 *     forwarded to them. The auth interceptor attaches THEIR bearer token, and
 *     the server may attribute the vote to them. The tally is now wrong and
 *     nothing says so.
 *
 *  2. A 401 on the public path clears the admin's session out from under them,
 *     and bounces an anonymous voter — someone with no account and no business
 *     having one — to a login screen they can never get past.
 *
 * The mechanism under test is SKIP_AUTH (see skip-auth.context.ts) plus the
 * placement of `/vote/:token` outside the guarded route subtree.
 */
test.describe('public route isolation', () => {
  test('a signed-out voter reaches the ballot and is never sent to sign-in', async ({
    page,
    backend,
  }) => {
    const ballot = new BallotPage(page);
    const signIn = new SignInPage(page);

    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.root).toBeVisible();
    await expect(ballot.status).toHaveText('Open');
    await expect(ballot.title).toHaveText('Buy mosquito nets for the Kitgum clinic');

    // No redirect: still on the voting URL, and the sign-in page never rendered.
    expect(ballot.path()).toBe(`/vote/${OPEN_BALLOT_TOKEN}`);
    await expect(signIn.heading).toHaveCount(0);

    // And the ballot really was fetched, anonymously.
    const requests = backend.ballotRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].authorization).toBeNull();
  });

  test('a signed-in admin opening a voting link sends NO Authorization header', async ({
    page,
    backend,
  }) => {
    await signInAsAdmin(page);

    const ballot = new BallotPage(page);
    const signIn = new SignInPage(page);

    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.root).toBeVisible();
    await expect(ballot.status).toHaveText('Open');

    // THE ASSERTION. The admin's token exists in this browser and must not have
    // travelled with the redemption request.
    const requests = backend.ballotRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].authorization).toBeNull();

    // Wider than the redemption call: the ballot page also fetches comments, and
    // will cast votes, each carrying the ballot's OWN scoped token. Not one of
    // them may carry the admin's. Checking only the first request would let a
    // later leak through unseen.
    expect(backend.requestsCarryingAdminToken()).toEqual([]);

    // Belt and braces: the token must not appear anywhere in any request's
    // headers, not just under the header we thought to check.
    const serialised = JSON.stringify(backend.requests.map((r) => r.headers));
    expect(serialised).not.toContain(ADMIN_TOKEN);

    // No redirect either — the guard must not touch the public route.
    expect(ballot.path()).toBe(`/vote/${OPEN_BALLOT_TOKEN}`);
    await expect(signIn.heading).toHaveCount(0);
  });

  test('the admin session survives a trip to the ballot', async ({ page }) => {
    await signInAsAdmin(page);

    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);
    await expect(ballot.root).toBeVisible();

    // Visiting a public route must not log the admin out.
    const stored = await page.evaluate(() => localStorage.getItem('cairn.auth'));
    expect(stored).toContain('admin-access-token');
  });

  test('an unknown token renders a dead-link ballot rather than a redirect', async ({ page }) => {
    const ballot = new BallotPage(page);
    const signIn = new SignInPage(page);

    await ballot.open('not-a-real-token');

    await expect(ballot.root).toBeVisible();
    await expect(ballot.status).toHaveText('Unavailable');
    expect(ballot.path()).toBe('/vote/not-a-real-token');
    await expect(signIn.heading).toHaveCount(0);
  });

  // The control case. If this one fails the guard is broken, and the tests above
  // would pass for the wrong reason — a guard that never redirects anything.
  test('the admin area still redirects a signed-out visitor to sign-in', async ({ page }) => {
    const signIn = new SignInPage(page);

    await page.goto('/ideas');

    await expect(signIn.heading).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
