import {
  ALREADY_VOTED_TOKEN,
  CLOSED_BALLOT_TOKEN,
  OPEN_BALLOT_TOKEN,
  OPTIONS_BALLOT_TOKEN,
  SCALE_BALLOT_TOKEN,
  SCOPED_BALLOT_TOKEN,
} from '../fixtures/fake-backend';
import { expect, test } from '../fixtures/test';
import { BallotPage } from '../pages/ballot.page';

/**
 * The voting ballot, end to end, against a faked API.
 *
 * Every test here runs with NO realtime connection (see the E2E flag in
 * fixtures/test.ts). That is deliberate and it is the point: the hub only ever
 * buys immediacy, never correctness, so a ballot that needs one to behave is
 * broken. The close case below proves the 409 alone is enough.
 */
test.describe('ballot', () => {
  test('a lead opens a link, answers, and is told it landed', async ({ page, backend }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.title).toHaveText('Buy mosquito nets for the Kitgum clinic');
    await expect(ballot.status).toHaveText('Open');

    // Nothing chosen yet — there is nothing to send.
    await expect(ballot.submit).toBeDisabled();

    await ballot.chooseYes();
    await expect(ballot.submit).toBeEnabled();
    await ballot.submit.click();

    await expect(ballot.thanks).toBeVisible();

    const vote = backend.requests.find((r) => r.method === 'PUT' && r.path.endsWith('/votes'));
    // Exactly one field, chosen by the idea's response type. The client never
    // states the type — the server reads it from the idea.
    expect(vote).toBeDefined();
    // The ballot's own scoped token, never the admin's.
    expect(vote?.authorization).toBe(`Bearer ${SCOPED_BALLOT_TOKEN}`);
  });

  test('sends exactly one answer field, and never the response type', async ({ page, backend }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);
    await ballot.chooseNo();
    await ballot.submit.click();
    await expect(ballot.thanks).toBeVisible();

    const vote = backend.requests.find((r) => r.method === 'PUT' && r.path.endsWith('/votes'));

    // Exactly this, and nothing more. The client stating a response type would let
    // it claim a shape the idea never asked for; the server reads that from the
    // idea instead. `false` must survive as a value, not be dropped as falsy.
    expect(JSON.parse(vote?.postData ?? '{}')).toEqual({ yesNo: false });
  });

  // Voting is an upsert: "already voted" is a pre-selected control, not a dead end.
  test('a lead who already voted sees their answer and can change it', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(ALREADY_VOTED_TOKEN);

    await expect(ballot.status).toHaveText('Open');
    await expect(ballot.yes).toBeChecked();
    await expect(ballot.no).not.toBeChecked();
    // The label admits they are amending, not answering fresh.
    await expect(ballot.submit).toHaveText(/Update my answer/);

    await ballot.chooseNo();
    await expect(ballot.no).toBeChecked();
    await ballot.submit.click();

    await expect(ballot.thanks).toBeVisible();
  });

  test('a scale ballot offers ten points and submits the one chosen', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(SCALE_BALLOT_TOKEN);

    await expect(page.locator('input[type=radio]')).toHaveCount(10);

    await ballot.chooseScale(7);
    await expect(ballot.scalePoint(7)).toBeChecked();
    await ballot.submit.click();

    await expect(ballot.thanks).toBeVisible();
  });

  test('an options ballot lists the idea options', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPTIONS_BALLOT_TOKEN);

    await expect(page.getByText('Mosquito nets')).toBeVisible();
    await expect(page.getByText('Clean water')).toBeVisible();

    await ballot.chooseOption('bb000000-0000-0000-0000-000000000002');
    await ballot.submit.click();

    await expect(ballot.thanks).toBeVisible();
  });

  test('a closed idea shows a notice and no way to answer', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(CLOSED_BALLOT_TOKEN);

    await expect(ballot.status).toHaveText('Closed');
    await expect(ballot.notice).toBeVisible();
    await expect(ballot.notice).toContainText('Voting has closed');
    await expect(ballot.submit).toHaveCount(0);
    await expect(ballot.yes).toHaveCount(0);

    // Still unmistakably Cairn: the question is on screen, not an error page.
    await expect(ballot.title).toHaveText('Buy mosquito nets for the Kitgum clinic');
  });

  test('a dead link reads as Cairn, not as an error page', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open('not-a-real-token');

    await expect(ballot.status).toHaveText('Unavailable');
    await expect(ballot.notice).toContainText('This link is no longer available');
    // Expired, revoked and unknown are one 410 with one message, so the copy must
    // not claim to know which — it says "may have expired", never "has expired".
    await expect(ballot.notice).toContainText('may have expired');
    await expect(ballot.submit).toHaveCount(0);
  });

  /*
   * THE RACE, and the reason the 409 exists.
   *
   * The window shuts server-side while the page sits open. With no hub connection
   * the ballot has no way to know — it still looks answerable, and it should, since
   * the client is not the authority here. The proof is that the vote still cannot
   * land: the server re-derives the window on every write and refuses it. The page
   * must then tell the truth rather than flash a thanks it has not earned.
   */
  test('a vote that arrives after close is refused by the 409, with no hub involved', async ({
    page,
    backend,
  }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.status).toHaveText('Open');
    await ballot.chooseYes();

    // The idea closes underneath them.
    backend.closeVoting();
    await ballot.submit.click();

    // Never a false confirmation...
    await expect(ballot.thanks).toHaveCount(0);
    // ...and the ballot locks itself on the server's word.
    await expect(ballot.status).toHaveText('Closed');
    await expect(ballot.notice).toContainText('Voting has closed');
    await expect(ballot.submit).toHaveCount(0);
  });

  /*
   * The realtime client is fetched lazily, over the same connection as everything
   * else — so on a bad one it may simply never arrive. This drives the REAL lazy
   * loader (opting out of the no-op binding every other test uses) and kills the
   * chunk in flight.
   *
   * The ballot must not care. SignalR buys the instant lock and nothing else; the
   * 409 is the guarantee. A voter whose chunk died is still a voter whose ballot
   * works, and they should never learn that anything went missing.
   */
  test('the ballot still works when the realtime chunk never arrives', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>)['__cairnE2E'];
    });

    const aborted: string[] = [];

    // Matched by CONTENT, not by filename — the chunk's name is a build hash and a
    // test pinned to it would rot on the next build. Scoped to `chunk-*.js` rather
    // than every script: each match is re-fetched through Playwright, and doing that
    // for the whole bundle slows the shared dev server enough to make its own
    // flakiness elsewhere in the suite.
    await page.route('**/chunk-*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();

      if (body.includes('HubConnectionBuilder')) {
        aborted.push(route.request().url());
        await route.abort();
        return;
      }

      await route.fulfill({ response, body });
    });

    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.title).toHaveText('Buy mosquito nets for the Kitgum clinic');
    await expect(ballot.status).toHaveText('Open');

    await ballot.chooseYes();
    await ballot.submit.click();

    // The vote lands. No error, no mention of the hub that never loaded.
    await expect(ballot.thanks).toBeVisible();

    // Without this the test is a fraud. If the loader stopped being lazy, or the
    // chunk were renamed out of the glob, nothing would ever be aborted and every
    // assertion above would still pass — proving only that the ballot works when
    // SignalR loads fine, which is the case we were not worried about.
    expect(aborted).not.toHaveLength(0);
  });

  test('a lead can leave a comment and see it appear', async ({ page, backend }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);

    await expect(ballot.commentSubmit).toBeDisabled();

    await ballot.commentInput.fill('Nets are cheaper in bulk — worth asking the clinic.');
    await expect(ballot.commentSubmit).toBeEnabled();
    await ballot.commentSubmit.click();

    await expect(ballot.comments).toContainText('Nets are cheaper in bulk');
    // The field clears, so a second thought does not append to the first.
    await expect(ballot.commentInput).toHaveValue('');

    const posted = backend.requests.find(
      (r) => r.method === 'POST' && r.path.endsWith('/comments'),
    );
    expect(posted?.authorization).toBe(`Bearer ${SCOPED_BALLOT_TOKEN}`);
  });

  test('a closed ballot shows the discussion but no comment form', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(CLOSED_BALLOT_TOKEN);

    await expect(ballot.status).toHaveText('Closed');
    // Commenting follows the same window as voting: once closed, the record of what
    // people thought at the time stops changing.
    await expect(ballot.commentInput).toHaveCount(0);
  });

  /*
   * The scoped token is the security core. It authorises voting on ONE idea for up
   * to an hour, and it must live only in the page's memory. If it ever reaches
   * localStorage — and above all the `cairn.auth` key — then an admin who opens a
   * lead's link on their own phone has their session silently replaced by a token
   * that can do nothing but vote on one idea.
   */
  test('the scoped vote token never touches storage', async ({ page }) => {
    const ballot = new BallotPage(page);
    await ballot.open(OPEN_BALLOT_TOKEN);
    await ballot.chooseYes();
    await ballot.submit.click();
    await expect(ballot.thanks).toBeVisible();

    const storage = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));

    expect(storage.local).not.toContain(SCOPED_BALLOT_TOKEN);
    expect(storage.session).not.toContain(SCOPED_BALLOT_TOKEN);
    expect(await page.evaluate(() => localStorage.getItem('cairn.auth'))).toBeNull();
  });
});
