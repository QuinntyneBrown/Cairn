import { defineConfig } from 'vitest/config';

/**
 * The contract check runs on plain vitest, not through Angular.
 *
 * It touches no DOM, no injector and no HTTP — it compares TypeScript key sets
 * against a recorded JSON artifact — so it needs no browser environment and no
 * running API. That is what keeps it in the default `npm test` path instead of
 * behind a live server nobody will start.
 *
 * NOTE: vitest strips types via esbuild WITHOUT typechecking them, so this config
 * only runs the runtime half. The compile half — `satisfies Record<keyof T, true>`
 * — is inert unless `tsc --noEmit` runs too. `npm run test:contract` runs both, in
 * that order. Running vitest alone here would quietly prove half of what it claims.
 */
export default defineConfig({
  test: {
    name: 'contract',
    include: ['e2e/contract/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    reporters: ['default'],
  },
});
