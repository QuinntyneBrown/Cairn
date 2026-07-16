import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. The Angular dev server is started automatically; every test fakes the
 * backend via network interception (see e2e/fixtures/fake-backend.ts), so no .NET API
 * or database is required to run the suite.
 *
 * Cairn serves on 4205, not Angular's default 4200. That is deliberate: 4200 is a
 * shared guess, and `reuseExistingServer` will happily point the whole suite at
 * whatever else on this machine happens to be answering there — which fails in the
 * worst way, with real-looking assertions run against a stranger's app. A port this
 * project owns means the only server we ever reuse is our own. `ng serve` is pinned
 * to the same port in angular.json, so `npm start` and this config cannot drift.
 */
const PORT = 4205;

export default defineConfig({
  testDir: './e2e',
  // Two sibling suites under e2e/ are deliberately NOT part of this one:
  //
  //   contract/ is a vitest suite, not a browser suite — it compares TypeScript
  //     types against a recorded JSON contract and must never start a server.
  //     Run it with `npm run test:contract`.
  //
  //   live/ drives the REAL API and needs SQL Server. Left in, Playwright would
  //     run it here against the FAKE backend, where it would fail on shapes the
  //     fake never claimed to serve — or worse, pass and mean nothing.
  //     Run it with `npm run e2e:live`.
  testIgnore: ['**/contract/**', '**/live/**'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
