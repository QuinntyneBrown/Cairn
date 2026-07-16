import { ChangeDetectionStrategy, Component } from '@angular/core';

interface FillSwatch {
  readonly token: string;
  readonly hex: string;
  readonly onDark: string;
  readonly onWhite: string;
  readonly clazz: string;
}

/**
 * THROWAWAY — the verification gate for the theme, not a product page.
 *
 * It renders the type scale and every saturated fill with `--text-on-fill` on it,
 * so the contrast rule in styles/_tokens.scss can be checked by eye rather than
 * taken on trust. The ratios below are WCAG 2.1 values computed from the tier-1
 * hexes; they are printed on the page so the claim and the evidence sit together.
 *
 * Delete this page and its route once the design is settled.
 */
@Component({
  selector: 'cai-design-system-page',
  templateUrl: './design-system.page.html',
  styleUrl: './design-system.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignSystemPage {
  /**
   * Every fill in the palette. `onDark` is the ratio against --text-on-fill
   * (#16160C) — all pass AA. `onWhite` is what we would have shipped had we put
   * white text on them instead; three of the six fail outright.
   */
  protected readonly fills: readonly FillSwatch[] = [
    { token: '--accent', hex: '#FFF737', onDark: '16.13:1', onWhite: '1.13:1', clazz: 'accent' },
    { token: '--positive', hex: '#32A432', onDark: '5.62:1', onWhite: '3.23:1', clazz: 'positive' },
    { token: '--negative', hex: '#F05228', onDark: '5.15:1', onWhite: '3.53:1', clazz: 'negative' },
    { token: '--warn', hex: '#FFB300', onDark: '10.14:1', onWhite: '1.79:1', clazz: 'warn' },
    { token: '--info', hex: '#1D8FB9', onDark: '4.92:1', onWhite: '3.70:1', clazz: 'info' },
    { token: '--ft-grey-200', hex: '#E9E7E4', onDark: '14.74:1', onWhite: '1.23:1', clazz: 'grey' },
  ];
}
