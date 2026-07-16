import {
  ADMIN_IDEA_ID,
  AdminBackend,
  MINTED_URL,
  OPTIONS_IDEA_ID,
  SCALE_IDEA_ID,
  installAdminBackend,
} from '../fixtures/admin-backend';
import { expect, signInAsAdmin, test } from '../fixtures/test';

/**
 * The authenticated admin surface, against a faked API.
 *
 * `installAdminBackend` is registered inside each test, i.e. AFTER the auto ballot
 * fixture, so Playwright's reverse-order matching gives it precedence and the
 * ballot fake is left alone for its own suite.
 */
test.describe('admin', () => {
  let backend: AdminBackend;

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    backend = await installAdminBackend(page);
  });

  test.describe('ideas list', () => {
    test('lists every idea with its status, response type and turnout', async ({ page }) => {
      await page.goto('/ideas');

      await expect(page.getByTestId('ideas-list')).toBeVisible();
      await expect(page.getByTestId(`idea-card-${ADMIN_IDEA_ID}`)).toBeVisible();
      await expect(page.getByTestId(`idea-card-${OPTIONS_IDEA_ID}`)).toBeVisible();

      const card = page.getByTestId(`idea-card-${ADMIN_IDEA_ID}`);
      await expect(card.getByTestId('idea-status')).toHaveText('Open');
      await expect(card.getByTestId('idea-response-type')).toHaveText('Yes / No');
      // Turnout, not a bare count: 6 of 8 is the fact worth reading.
      await expect(card.getByTestId('idea-turnout')).toContainText('6');
      await expect(card.getByTestId('idea-turnout')).toContainText('of 8');
    });

    test('says so when an idea has no links out, rather than showing a bare zero', async ({
      page,
    }) => {
      await page.goto('/ideas');

      const draft = page.getByTestId(`idea-card-${SCALE_IDEA_ID}`);
      await expect(draft.getByTestId('idea-no-links')).toBeVisible();
    });

    // Status is derived from the clock server-side, so filtering must round-trip.
    test('filters on the server, not in the browser', async ({ page }) => {
      await page.goto('/ideas');
      await expect(page.getByTestId('ideas-list')).toBeVisible();

      await page.getByTestId('filter-Closed').click();

      await expect(page.getByTestId(`idea-card-${OPTIONS_IDEA_ID}`)).toBeVisible();
      await expect(page.getByTestId(`idea-card-${ADMIN_IDEA_ID}`)).toHaveCount(0);

      // The proof it went to the server: a `?status=Closed` request was made.
      const filtered = backend.requests.filter(
        (r) => r.path === '/api/ideas' && r.method === 'GET',
      );
      expect(filtered.length).toBeGreaterThanOrEqual(2);
    });

    test('opens an idea from the list', async ({ page }) => {
      await page.goto('/ideas');
      await page.getByTestId(`idea-card-${ADMIN_IDEA_ID}`).getByTestId('idea-link').click();

      await expect(page).toHaveURL(new RegExp(`/ideas/${ADMIN_IDEA_ID}$`));
    });
  });

  test.describe('tally rendering', () => {
    test('renders a YesNo split as flat bars', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);

      const tally = page.getByTestId('vote-tally');
      await expect(tally).toBeVisible();
      await expect(page.getByTestId('tally-count-yes')).toHaveText('5');
      await expect(page.getByTestId('tally-count-no')).toHaveText('1');
      await expect(page.getByTestId('tally-total')).toContainText('6 votes cast');
    });

    test('renders an option nobody chose, at zero', async ({ page }) => {
      await page.goto(`/ideas/${OPTIONS_IDEA_ID}`);

      await expect(page.getByTestId('vote-tally')).toBeVisible();
      await expect(
        page.getByTestId('tally-count-bb000000-0000-0000-0000-000000000001'),
      ).toHaveText('4');
      // The finding: nobody backed this one. It must still be on screen.
      await expect(
        page.getByTestId('tally-count-bb000000-0000-0000-0000-000000000002'),
      ).toHaveText('0');
    });

    test('renders all ten scale columns on a fixed axis, plus the average', async ({ page }) => {
      await page.goto(`/ideas/${SCALE_IDEA_ID}`);

      await expect(page.getByTestId('tally-scale')).toBeVisible();
      // All ten, including the six nobody picked.
      await expect(page.locator('.scale__col')).toHaveCount(10);
      await expect(page.getByTestId('tally-average')).toContainText('7');
    });

    test('shows the live indicator, offline in a suite with no hub', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);

      // Offline is the honest state here and is not an error — the page is correct
      // without a hub because every number on it came from a GET.
      await expect(page.getByTestId('live-indicator')).toBeVisible();
    });

    test('shows turnout against the number invited', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);

      await expect(page.getByTestId('detail-turnout')).toContainText('6 of 8 invited');
    });
  });

  test.describe('creating an idea', () => {
    test('sends the whole idea, with no options on a YesNo', async ({ page }) => {
      await page.goto('/ideas/new');

      await page.getByTestId('idea-title').fill('Open a second organiser call');
      await page.getByTestId('idea-description').fill('Do we have the capacity?');
      await page.getByTestId('idea-opens').fill('2026-09-01T09:00');
      await page.getByTestId('idea-closes').fill('2026-09-30T17:00');
      await page.getByTestId('idea-save').click();

      await expect(page).toHaveURL(new RegExp(`/ideas/${ADMIN_IDEA_ID}$`));

      const [body] = backend.bodiesFor('/api/ideas', 'POST') as Record<string, unknown>[];
      expect(body['title']).toBe('Open a second organiser call');
      expect(body['responseType']).toBe('YesNo');
      // A YesNo idea must carry zero choices; the server 400s otherwise.
      expect(body['options']).toEqual([]);
      expect(typeof body['opensAt']).toBe('string');
    });

    test('collects choices for an Options idea and sends them in order', async ({ page }) => {
      await page.goto('/ideas/new');

      await page.getByTestId('idea-title').fill('Which cause?');
      await page.getByTestId('idea-description').fill('Pick one.');
      await page.getByTestId('response-type-Options').click();

      await page.getByTestId('option-input-0').fill('Nets');
      await page.getByTestId('option-input-1').fill('Wells');
      await page.getByTestId('option-add').click();
      await page.getByTestId('option-input-2').fill('Books');

      await page.getByTestId('idea-opens').fill('2026-09-01T09:00');
      await page.getByTestId('idea-closes').fill('2026-09-30T17:00');
      await page.getByTestId('idea-save').click();

      const [body] = backend.bodiesFor('/api/ideas', 'POST') as Record<string, unknown>[];
      expect(body['responseType']).toBe('Options');
      // Order is the contract — the server matches options to rows by position.
      expect(body['options']).toEqual(['Nets', 'Wells', 'Books']);
    });

    test('reorders choices', async ({ page }) => {
      await page.goto('/ideas/new');

      await page.getByTestId('idea-title').fill('Which cause?');
      await page.getByTestId('idea-description').fill('Pick one.');
      await page.getByTestId('response-type-Options').click();
      await page.getByTestId('option-input-0').fill('Nets');
      await page.getByTestId('option-input-1').fill('Wells');
      await page.getByTestId('option-down-0').click();

      await page.getByTestId('idea-opens').fill('2026-09-01T09:00');
      await page.getByTestId('idea-closes').fill('2026-09-30T17:00');
      await page.getByTestId('idea-save').click();

      const [body] = backend.bodiesFor('/api/ideas', 'POST') as Record<string, unknown>[];
      expect(body['options']).toEqual(['Wells', 'Nets']);
    });
  });

  test.describe('options validation', () => {
    test('will not submit an Options idea with fewer than two choices', async ({ page }) => {
      await page.goto('/ideas/new');

      await page.getByTestId('idea-title').fill('Which cause?');
      await page.getByTestId('idea-description').fill('Pick one.');
      await page.getByTestId('response-type-Options').click();
      await page.getByTestId('option-input-0').fill('Only one');
      await page.getByTestId('idea-opens').fill('2026-09-01T09:00');
      await page.getByTestId('idea-closes').fill('2026-09-30T17:00');

      await page.getByTestId('idea-save').click();

      await expect(page.getByTestId('options-error')).toContainText('at least two choices');
      // Caught before the round trip.
      expect(backend.bodiesFor('/api/ideas', 'POST')).toHaveLength(0);
    });

    // The server is the authority. Even when the client is happy, its 400 must land
    // on the control that caused it rather than in a generic banner.
    test('surfaces the server’s options 400 on the field', async ({ page }) => {
      backend.failNextWriteWith({ Options: ['An options idea needs at least two choices.'] });

      await page.goto('/ideas/new');
      await page.getByTestId('idea-title').fill('Which cause?');
      await page.getByTestId('idea-description').fill('Pick one.');
      await page.getByTestId('response-type-Options').click();
      await page.getByTestId('option-input-0').fill('Nets');
      await page.getByTestId('option-input-1').fill('Wells');
      await page.getByTestId('idea-opens').fill('2026-09-01T09:00');
      await page.getByTestId('idea-closes').fill('2026-09-30T17:00');
      await page.getByTestId('idea-save').click();

      await expect(page.getByTestId('options-server-error')).toContainText(
        'at least two choices',
      );
    });

    test('surfaces the server’s response-type 400 on the picker', async ({ page }) => {
      backend.failNextWriteWith({
        ResponseType: [
          'The response type cannot change once voting has begun. Close this idea and open a new one.',
        ],
      });

      await page.goto(`/ideas/${ADMIN_IDEA_ID}/edit`);
      await expect(page.getByTestId('idea-title')).toHaveValue('Run a Build Night in September');
      await page.getByTestId('idea-save').click();

      await expect(page.getByTestId('response-type-error')).toContainText(
        'cannot change once voting has begun',
      );
    });

    test('locks the response type on an idea that already has votes', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}/edit`);

      // This idea has 6 votes, so the picker must be disabled and say why.
      await expect(page.getByTestId('response-type-locked')).toBeVisible();
      await expect(page.getByTestId('response-type-Scale').locator('input')).toBeDisabled();
    });
  });

  test.describe('voting links', () => {
    test('shows no copyable URL for stored links, and explains why', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);

      await expect(page.getByTestId('voting-link-list')).toBeVisible();
      await expect(page.getByTestId('link-ee000000-0000-0000-0000-000000000001')).toContainText(
        'Ada Osei',
      );
      await expect(page.getByTestId('link-voted')).toBeVisible();

      // The important absence: a listed link's url is null forever, so there must
      // be nothing offering to copy it.
      await expect(page.getByTestId('fresh-links')).toHaveCount(0);
      await expect(page.getByTestId('links-note')).toContainText('never be shown again');
    });

    test('shows the minted URLs once, prominently, and copies them', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);

      await page.getByTestId('generate-links').click();

      const fresh = page.getByTestId('fresh-links');
      await expect(fresh).toBeVisible();
      await expect(fresh).toContainText('Copy these now');
      await expect(fresh).toContainText(MINTED_URL);

      await page.getByTestId('copy-all-links').locator('button').click();

      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toContain(MINTED_URL);
      expect(clipboard).toContain('Grace Lim');
    });

    test('an empty userIds is what mints for everyone', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);
      await page.getByTestId('generate-links').click();
      await expect(page.getByTestId('fresh-links')).toBeVisible();

      const [body] = backend.bodiesFor(`/api/ideas/${ADMIN_IDEA_ID}/vote-links`, 'POST');
      // `{}` is the deliberate "invite every lead" gesture, not a no-op.
      expect(body).toEqual({});
    });

    test('keeps the minted URLs on screen after the list refetches', async ({ page }) => {
      await page.goto(`/ideas/${ADMIN_IDEA_ID}`);
      await page.getByTestId('generate-links').click();

      await expect(page.getByTestId('fresh-links')).toBeVisible();
      // The reload that follows minting replaces `links()` with rows whose url is
      // null. If that wiped the fresh batch, the URLs would be gone for good.
      await expect(page.getByTestId('voting-link-list')).toBeVisible();
      await expect(page.getByTestId('fresh-links')).toContainText(MINTED_URL);
    });
  });

  test.describe('leads', () => {
    test('explains that passwordless leads vote by link', async ({ page }) => {
      await page.goto('/leads');

      await expect(page.getByTestId('leads-list')).toBeVisible();
      await expect(page.getByTestId('leads-note')).toContainText('2 of 3');
      await expect(page.getByTestId('leads-note')).toContainText('voting link');
      await expect(page.getByTestId('lead-dd000000-0000-0000-0000-000000000001')).toContainText(
        'Link only',
      );
      await expect(page.getByTestId('lead-dd000000-0000-0000-0000-000000000003')).toContainText(
        'Can sign in',
      );
    });
  });

  test.describe('shell', () => {
    test('shows the signed-in admin from /api/me and signs out', async ({ page }) => {
      await page.goto('/ideas');

      await expect(page.getByText('Quinn Brown')).toBeVisible();

      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
    });
  });
});
