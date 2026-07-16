import { Injector, runInInjectionContext } from '@angular/core';
import type { IIdeaReportRealtime } from '@cairn/api';

/**
 * THE dynamic import boundary — the only place `@microsoft/signalr` enters the
 * module graph.
 *
 * The specifier is deliberately NOT '@cairn/api'. That barrel is already eager, so
 * importing it here would resolve back into the eager chunk and drag SignalR into
 * main with it, which is the whole thing we are avoiding. The path mapping in the
 * root tsconfig points this one specifier straight at the service module.
 *
 * If you ever change this to a barrel import, every page silently regains the whole
 * WebSocket client and nothing fails: the tests pass, the app works, and only the
 * bundle knows. `npm run check:bundle` (scripts/assert-signalr-lazy.mjs) is what
 * catches it — it walks the eager graph from index.html and fails the build.
 */
export async function loadSignalrRealtime(injector: Injector): Promise<IIdeaReportRealtime> {
  const { SignalrVoteRealtimeService } = await import('@cairn/api/realtime/signalr');

  // The service reads API_BASE_URL through `inject()`, so it has to be constructed
  // inside an injection context. It is created here rather than provided because a
  // provider would have to name the class statically — and naming it is what makes
  // it eager.
  return runInInjectionContext(injector, () => new SignalrVoteRealtimeService());
}
