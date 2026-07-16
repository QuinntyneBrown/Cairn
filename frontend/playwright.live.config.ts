import { defineConfig, devices } from '@playwright/test';

/**
 * LIVE smoke test — the real Angular app against the real .NET API.
 *
 * Every other suite in this repo fakes one side. The unit tests fake HTTP. The
 * default Playwright suite fakes the backend. The contract check compares against
 * a recording — real, but a snapshot. None of them can catch the two halves
 * disagreeing right now, because in all of them one half is a fixture.
 *
 * This one fakes nothing: real SQL Server, real API, real JWTs, real minted
 * links. That is also why it is NOT part of `npm test` — it needs a database and
 * a running server, and the default gate must stay hermetic and fast. Opt in with
 * `npm run e2e:live`.
 *
 * It is a SMOKE TEST, deliberately thin: the spine that only reality can prove,
 * not a second E2E suite. Detail belongs in the faked suite, where it is fast and
 * deterministic.
 *
 * Prerequisites (the suite asserts these and tells you what to start):
 *   cd backend  && dotnet run --project src/Cairn.Cli -- db seed --reset
 *   cd backend  && dotnet run --project src/Cairn.Api --urls http://localhost:5099
 *   cd frontend && npm start
 */
const PORT = 4205;

export default defineConfig({
  testDir: './e2e/live',
  // Serial on purpose. This suite shares one real database: parallel workers
  // casting votes at the same idea would race on the tally that test 3 asserts.
  // The faked suite is where parallelism pays; here correctness is the point.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The dev server is safe to start automatically; the API and the database are
  // not, so they are asserted instead. Starting a server is cheap and reversible.
  // Seeding someone's database from a test runner is neither.
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
