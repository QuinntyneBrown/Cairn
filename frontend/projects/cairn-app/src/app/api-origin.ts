/**
 * Origin of the Cairn API.
 *
 * In production the Angular bundle is served by the .NET app itself (a single App
 * Service hosts both UI and API), so the API lives at the *same origin* as the SPA —
 * an empty base makes every request relative (`/api/...`, `/hubs/...`).
 *
 * In local development the Angular dev server runs on :4205 while the backend runs on
 * :5099, so we point at it explicitly. (4205 rather than Angular's default 4200 — see
 * the note in playwright.config.ts; the port is pinned in angular.json.) The Playwright
 * suite intercepts `** /api/**` regardless of origin, so either value works under test.
 */
const DEV_SERVER_PORT = '4205';

function resolveApiOrigin(): string {
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === DEV_SERVER_PORT) {
      return 'http://localhost:5099';
    }
  }
  // Bundled SPA — the API is same-origin.
  return '';
}

export const API_ORIGIN = resolveApiOrigin();
