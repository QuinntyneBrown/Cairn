import { test as base, Page } from '@playwright/test';
import { FakeBackend, installFakeBackend } from './fake-backend';

interface Fixtures {
  backend: FakeBackend;
}

/**
 * Base test with the fake Cairn API installed on every page.
 *
 * `auto: true` matters. Playwright builds fixtures lazily, so without it a test
 * that does not happen to destructure `backend` silently gets no interception and
 * quietly talks to a real API that is not running — the failure then looks like a
 * broken page rather than a missing fixture. Auto means no test can opt out by
 * accident; destructure `backend` only when you want to inspect what was sent.
 */
export const test = base.extend<Fixtures>({
  backend: [
    async ({ page }, use) => {
      // Bind the no-op realtime before any app code runs. There is no hub behind
      // the fake API, so the real SignalR client would negotiate against nothing
      // and retry on its backoff schedule, turning every assertion below into a
      // race with a connection that can never succeed.
      //
      // The ballot is REQUIRED to work in this state — the server re-derives the
      // voting window on every write, so a voter with no hub still cannot land a
      // late vote. Testing without one is the harder case, not a concession.
      await page.addInitScript(() => {
        (window as unknown as Record<string, unknown>)['__cairnE2E'] = true;
      });

      const backend = await installFakeBackend(page);
      await use(backend);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

/**
 * Seeds an admin session in localStorage, exactly as AuthStateService writes it.
 *
 * Used to set up the dangerous case: an admin who is signed in and then opens a
 * lead's voting link. Must be called before the first navigation.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cairn.auth',
      JSON.stringify({
        token: 'admin-access-token',
        refreshToken: 'admin-refresh-token',
        user: {
          id: 'u1',
          email: 'quinn@faithtech.com',
          displayName: 'Quinn Brown',
          role: 'Admin',
        },
      }),
    );
  });
}
