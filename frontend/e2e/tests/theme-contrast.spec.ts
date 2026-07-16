import { expect, test } from '../fixtures/test';

/**
 * The theme's contrast rule, checked against what the browser actually paints
 * rather than against the hexes we think we wrote.
 *
 * This is the gate for the theme: `--text-on-fill` must clear WCAG AA (4.5:1) on
 * every saturated fill in the palette. It reads the computed styles off the
 * throwaway design-system page and recomputes the ratios from the rendered rgb()
 * values, so a token edit that quietly breaks legibility fails here.
 *
 * If ./pages/design-system is deleted, delete this spec with it.
 */

const FILLS = ['accent', 'positive', 'negative', 'warn', 'info', 'grey'] as const;

/** WCAG 2.1 relative luminance from an `rgb(r, g, b)` string. */
function luminance(rgb: string): number {
  const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('theme contrast', () => {
  test('the design-system page renders the type scale and every fill', async ({ page }) => {
    await page.goto('/design-system');

    await expect(page.getByTestId('design-system-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cairn design system' })).toBeVisible();
    await expect(page.locator('.ds__fill')).toHaveCount(FILLS.length);
  });

  // THE RULE. Dark text on every fill must clear AA.
  for (const fill of FILLS) {
    test(`--text-on-fill clears AA on --${fill}`, async ({ page }) => {
      await page.goto('/design-system');

      const swatch = page.locator(`.ds__fill--${fill}`);
      await expect(swatch).toBeVisible();

      const { background, text } = await swatch.evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, text: style.color };
      });

      const ratio = contrast(background, text);
      expect(ratio, `${fill}: ${text} on ${background} is ${ratio.toFixed(2)}:1`).toBeGreaterThan(
        4.5,
      );
    });
  }

  // The counter-example, asserted rather than assumed: this is why the rule
  // exists, and it must stay true or the rule is folklore.
  test('toronto yellow as text on white really is unreadable', async ({ page }) => {
    await page.goto('/design-system');

    const wrong = page.locator('.ds__wrong');
    const { background, text } = await wrong.evaluate((el) => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, text: style.color };
    });

    expect(contrast(background, text)).toBeLessThan(1.5);
  });

  test('white on --positive fails AA, which is why --text-on-fill is dark', async ({ page }) => {
    await page.goto('/design-system');

    const { background, text } = await page.locator('.ds__wrong-green').evaluate((el) => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, text: style.color };
    });

    expect(contrast(background, text)).toBeLessThan(4.5);
  });
});
