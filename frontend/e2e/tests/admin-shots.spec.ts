import {
  ADMIN_IDEA_ID,
  OPTIONS_IDEA_ID,
  SCALE_IDEA_ID,
  installAdminBackend,
} from '../fixtures/admin-backend';
import { expect, signInAsAdmin, test } from '../fixtures/test';

/**
 * Screenshots for eyeballing the admin pages at both ends of the range, plus the
 * one thing a screenshot cannot show: whether the page scrolls sideways.
 *
 * A horizontal scrollbar on a phone is the classic failure of a "responsive"
 * layout that was only ever looked at on a laptop, and it is invisible in a
 * full-page capture — so it is asserted rather than admired.
 */
const SIZES = [
  { name: '360', width: 360, height: 780 },
  { name: '1280', width: 1280, height: 900 },
];

const PAGES = [
  { name: 'ideas', path: '/ideas', ready: 'ideas-list' },
  { name: 'idea-detail', path: `/ideas/${ADMIN_IDEA_ID}`, ready: 'vote-tally' },
  { name: 'idea-detail-scale', path: `/ideas/${SCALE_IDEA_ID}`, ready: 'tally-scale' },
  // The long-label case: option labels and a person's name both compete for a
  // half-width panel here, which is where a collapsing column shows up.
  { name: 'idea-detail-options', path: `/ideas/${OPTIONS_IDEA_ID}`, ready: 'vote-tally' },
  { name: 'idea-edit', path: `/ideas/${ADMIN_IDEA_ID}/edit`, ready: 'idea-form' },
  { name: 'idea-new', path: '/ideas/new', ready: 'idea-form' },
  { name: 'leads', path: '/leads', ready: 'leads-list' },
];

test.describe('admin screenshots', () => {
  for (const size of SIZES) {
    for (const target of PAGES) {
      test(`${target.name} at ${size.name}px`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await signInAsAdmin(page);
        await installAdminBackend(page);

        await page.goto(target.path);
        await expect(page.getByTestId(target.ready)).toBeVisible();

        await page.screenshot({
          path: `.screenshots/${target.name}-${size.name}.png`,
          fullPage: true,
        });

        // The assertion a picture cannot make. `documentElement.scrollWidth`
        // exceeding the viewport means something is forcing the page wide — a long
        // token, an un-wrapped email, a fixed-width table.
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflows, `${target.name} scrolls horizontally at ${size.name}px`).toBe(false);
      });
    }
  }

  // Minted URLs are the longest strings the admin ever sees, and they land in the
  // narrowest box on the page.
  test('the minted-link panel does not blow out a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signInAsAdmin(page);
    await installAdminBackend(page);

    await page.goto(`/ideas/${ADMIN_IDEA_ID}`);
    await page.getByTestId('generate-links').click();
    await expect(page.getByTestId('fresh-links')).toBeVisible();

    await page.screenshot({ path: '.screenshots/fresh-links-360.png', fullPage: true });

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, 'the minted-link panel scrolls horizontally at 360px').toBe(false);
  });
});
