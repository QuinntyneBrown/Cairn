import { Provider } from '@angular/core';
import { IDEA_REPORT_REALTIME, NoopVoteRealtimeService, VOTE_REALTIME } from '@cairn/api';
import { LazyVoteRealtimeService } from './realtime/lazy-vote-realtime.service';

/**
 * Set by the Playwright suite via `addInitScript`, before any app code runs.
 * Nothing in production ever sets it.
 */
const E2E_FLAG = '__cairnE2E';

function isE2E(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>)[E2E_FLAG] === true
  );
}

/**
 * Binds the live feed.
 *
 * NOTE WHAT IS NOT IMPORTED HERE: `SignalrVoteRealtimeService`. Naming that class in
 * a `useClass` is exactly what pulled ~40kB gzipped of `@microsoft/signalr` into the
 * main bundle — on every page, ahead of the ballot rendering. This file is eager, so
 * anything it names is eager too. `LazyVoteRealtimeService` fetches the client on
 * first use instead; see that class for why deferring it is safe.
 *
 * Under Playwright the backend is a `page.route` fake with no hub behind it, so
 * SignalR would spend every test negotiating against nothing, retrying on the
 * backoff schedule, and turning each assertion into a race. The no-op reports
 * `offline` forever instead.
 *
 * That is not a compromise for the tests' benefit — it is the harder case, and the
 * ballot is required to pass it. Voting stays correct with no hub at all, because
 * the server re-derives the window on every write and answers a late vote with a
 * 409. If a ballot test only passes with a live connection, the ballot has come to
 * depend on the hub for correctness, and this binding is what makes that visible
 * rather than letting it hide behind a working WebSocket.
 */
export function provideVoteRealtime(): Provider[] {
  const useClass = isE2E() ? NoopVoteRealtimeService : LazyVoteRealtimeService;

  return [
    // Two tokens, one class, and DELIBERATELY NOT one instance — no `useExisting`
    // between them. A ballot and a dashboard are different pages holding different
    // tokens: the ballot's connection carries a vote-scoped JWT and lands in the
    // voters group, the dashboard's carries the admin bearer and lands in the report
    // group. Sharing an instance would mean whichever page joined last decided which
    // group BOTH were in.
    //
    // The ballot gets the narrow view (`IVoteRealtime`, no tally member); the
    // dashboard gets the wide one. See idea-report-realtime.service.contract.ts.
    { provide: VOTE_REALTIME, useClass },
    { provide: IDEA_REPORT_REALTIME, useClass },
  ];
}
