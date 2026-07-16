# Cairn frontend

Angular 21 workspace: one application and three libraries.

| Project | Purpose |
| --- | --- |
| `cairn-app` | The application. Two surfaces: the guarded admin area, and the public ballot |
| `@cairn/api` | Models, service contracts, HTTP and SignalR clients. No UI |
| `@cairn/components` | Brand primitives with zero Cairn knowledge |
| `@cairn/domain` | Cairn-aware components — response types, tallies, links |

## Commands

```bash
npm start              # dev server on :4205 (not 4200 — see playwright.config.ts)
npm run build          # the app, plus the lazy-SignalR guard
npm run build:libs     # api -> components -> domain, in that order
npm run build:all      # libs + app
npm test               # typecheck + all four projects + the API contract check
npm run typecheck      # tsc --noEmit across every spec project
npm run test:contract  # models vs the recorded API contract
npm run e2e            # Playwright, backend faked
npm run e2e:live       # Playwright against the REAL API — opt-in
```

`npm run build:libs` matters because the libraries have a real build order: `@cairn/domain`
imports `@cairn/api`, so a cold checkout that builds domain first fails with an unhelpful
"module not found". `ng build cairn-app` needs no prebuild.

`npm test` is hermetic — it passes with no API and no database running. `npm run e2e:live` is
the only suite that needs the real stack, and it skips loudly with instructions when the stack
is down.

## Conventions

- **No single-file components.** Every component is a separate `.ts`, `.html`, and `.scss`.
  There are no inline `template:` or `styles:` anywhere, and it stays that way.
- File per type. Standalone components, `OnPush`, signals, `inject()`, zoneless.
- Routed screens are `x.page.ts` → `XPage`; library components are `x.component.ts` →
  `XComponent`, prefix `cai`.
- Services are an `interface` + `InjectionToken` in `x.service.contract.ts`, with the
  implementation in `x.service.ts`.
- Components use **only** tier-2 semantic tokens (`var(--accent)`, `var(--text-on-fill)`),
  never `--ft-*` directly. See [../docs/branding.md](../docs/branding.md).
- No Angular Material, no charting library, no NgRx. Tallies are flat divs with `width: %` —
  the aesthetic *is* flat bars.

## Two things that will bite you

**`typecheck` runs first in `npm test` for a reason.** Angular's unit-test builder compiles
specs through esbuild, which strips types without checking them. Without the separate `tsc`
pass, every type-level assertion in every spec — including `@ts-expect-error` — is decorative
and silently passes.

**Models are bound to a recording of the real API**, not to anyone's reading of it. If a model
and `e2e/fixtures/recorded-api-contract.json` disagree, the model is wrong. See
[../docs/api-contract.md](../docs/api-contract.md) before changing one.

## SignalR is lazy on purpose

`@microsoft/signalr` is its own chunk (~13 kB transfer) and must never reach the eager graph —
the sign-in page and the 404 would ship a WebSocket client they never open. `npm run build`
fails if it does, via `scripts/assert-signalr-lazy.mjs`.

The ballot's realtime connection is a nice-to-have by design: the **409** on a late vote is
the guarantee, `ideaClosed$` is only the instant lock. If the chunk fails to load on a bad
connection, the ballot still works correctly.
