# Branding

Cairn uses FaithTech's real design tokens, extracted from their live stylesheet rather than
guessed. There is no public FaithTech brand guide — `/brand`, `/style-guide` and `/media-kit`
all 404 — so these values come from the CSS the site actually renders.

## Palette

| Token | Value | Notes |
| --- | --- | --- |
| `--ft-dark` | `#16160C` | Warm near-black. **The** dominant brand colour — not true black |
| `--ft-light` | `#FFFFFF` | |
| `--ft-toronto` | `#FFF737` | FaithTech **Toronto**'s assigned city colour. Cairn's accent |
| `--ft-orange-100` | `#FFB300` | |
| `--ft-orange-200` | `#F05228` | |
| `--ft-green-200` | `#32A432` | |
| `--ft-blue-200` | `#1D8FB9` | |
| `--ft-grey-100` / `-200` / `-300` | `#F5F0F0` / `#E9E7E4` / `#E4E0D8` | Warm greys, not cool |

Every FaithTech chapter is assigned a colour from the same palette rather than inventing one —
Waterloo is `#BAE386`, Vancouver `#8ADFFF`, Toronto `#FFF737`.

> **`#C6FB50` is a trap.** It appears in FaithTech's CSS as `--swatch--brand` but is referenced
> exactly once, while real brand colours are used 75–120+ times. It is leftover Webflow
> template boilerplate. If a scraping tool ever reports it as "primary", it is wrong. The
> primary is `#16160C`.

## The contrast rule

This is the one thing that will silently wreck the design.

- `#FFF737` on white is **~1.1:1**. Toronto yellow can never be text on light, and never a
  thin border carrying meaning.
- White on `--positive` `#32A432` is **~3.0:1** and **fails AA**.

So saturated colours are only ever **large flat fills**, and everything on top of one uses
`--text-on-fill` — the warm off-black. `#16160C` on `#32A432` is ~5.1:1; on `#FFF737` it is
~17:1.

FaithTech's own aesthetic (one saturated accent per context, deployed as large flat fills) and
the accessibility constraint happen to agree. `e2e/tests/theme-contrast.spec.ts` asserts this
computationally rather than trusting it — including a test proving yellow-on-white really is
unreadable, so the rule cannot be quietly relaxed.

## Two tiers

Components reference **only** tier-2 semantic tokens — `--accent`, `--surface`,
`--text-on-fill`, `--positive` — never `--ft-*` directly. A re-skin touches one block in
`_tokens.scss`.

Tokens are CSS custom properties in `:root`, not SCSS variables. That is the only approach
that crosses the ng-packagr library boundary for free: a library's `.scss` just writes
`var(--accent)` with no `@use` and no per-library `includePaths`.

## Aesthetic

Light-default, warm, flat, confidently minimal. No `box-shadow`, no gradients — elevation is
`1px solid var(--line)`, and selection is a flat fill swap. Generous corner radii and a
repeating rounded-square motif that echoes the logo. High contrast, lots of whitespace; closer
to a modern dev-tool brand than to typical ministry branding.

The scale selector renders that motif literally: ten `aspect-ratio: 1` rounded squares, five
across on a phone, ten across from 48rem.

## Fonts — an open procurement item

FaithTech's display face **Noi Grotesk** and its accent face **Avril** are commercial and
self-hosted. **A web licence must be purchased before either can ship.** This is a
procurement blocker, not a technical one.

The mitigation is structural: the real faces are named **first** in every stack, so the
browser falls through to a free substitute until the licensed files exist. The day they land,
add `@font-face` and **zero tokens or components change**.

| Role | FaithTech | Substitute until licensed |
| --- | --- | --- |
| Display | Noi Grotesk | Hanken Grotesk (OFL) |
| Body | Inter | Inter — already free, ships as-is |
| Accent | Avril (italic, in-headline emphasis) | Newsreader italic (OFL) |

The generated `.pptx` **names** Inter rather than embedding it. Embedded fonts are
PowerPoint-on-Windows only, and redistributing a commercial face inside every generated deck
is a licensing problem before a technical one. `cairn deck build` warns when Inter is not
installed locally.

Worth asking the FaithTech global team for an internal brand kit — it would settle clear-space
rules, minimum sizes, and where Avril is licensed from, none of which the CSS can answer.
