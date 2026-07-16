import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Fails the build if @microsoft/signalr is reachable from the app's entry point.
 *
 * WHY A SCRIPT AND NOT A UNIT TEST: this is a property of the BUNDLE, and nothing
 * that runs before bundling can see it. The regression is one careless line — a
 * static `import { SignalrVoteRealtimeService } from '@cairn/api'` anywhere in the
 * eager graph — and it is completely silent: every test still passes, the app still
 * works, and the only symptom is that every visitor to every page, including sign-in
 * and the 404, downloads a WebSocket client they will never open. That is precisely
 * the class of defect this codebase keeps getting bitten by: correct-looking code
 * with a green suite and a cost nobody can see. So it gets a check that runs.
 *
 * The ballot is why it matters: a lead opens it on a phone, on the subway, with five
 * seconds. SignalR is a nice-to-have there — the 409 on a late vote is the real
 * guarantee — so it must never sit in front of the question they came to answer.
 */

const BROWSER_DIR = 'dist/cairn-app/browser';

/** A string only the real SignalR client contains. */
const SIGNALR_MARKER = 'HubConnectionBuilder';

const indexHtml = readFileSync(join(BROWSER_DIR, 'index.html'), 'utf8');

/**
 * The eager graph: whatever index.html loads, plus everything those files pull in
 * via static import. Walked transitively — a marker two hops down is still eager.
 */
const entries = [...indexHtml.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) =>
  m[1].replace(/^\.?\//, ''),
);

if (entries.length === 0) {
  console.error('assert-signalr-lazy: found no scripts in index.html — did the build run?');
  process.exit(1);
}

const known = new Set(readdirSync(BROWSER_DIR).filter((f) => f.endsWith('.js')));
const eager = new Set();
const queue = [...entries];

while (queue.length) {
  const file = queue.pop();
  if (eager.has(file) || !known.has(file)) {
    continue;
  }
  eager.add(file);

  const source = readFileSync(join(BROWSER_DIR, file), 'utf8');

  // Static imports only. `import("./chunk-X.js")` is a dynamic boundary and the
  // whole point — following it would defeat the check.
  for (const match of source.matchAll(/(?:from\s*|import\s*)"(\.\/[^"]+\.js)"/g)) {
    queue.push(match[1].replace(/^\.\//, ''));
  }
}

const offenders = [...eager].filter((file) =>
  readFileSync(join(BROWSER_DIR, file), 'utf8').includes(SIGNALR_MARKER),
);

if (offenders.length > 0) {
  console.error(
    `\nassert-signalr-lazy: FAILED — @microsoft/signalr is in the EAGER bundle.\n\n` +
      `  Reached from index.html: ${offenders.join(', ')}\n\n` +
      `  Every page now downloads a WebSocket client, including ones that never open\n` +
      `  a hub. Something in the eager graph names SignalrVoteRealtimeService\n` +
      `  statically — most likely an import from the '@cairn/api' barrel.\n\n` +
      `  The realtime client must only be reached through the dynamic import in\n` +
      `  app/realtime/signalr-realtime.loader.ts.\n`,
  );
  process.exit(1);
}

const lazyWithSignalr = [...known].filter(
  (file) => !eager.has(file) && readFileSync(join(BROWSER_DIR, file), 'utf8').includes(SIGNALR_MARKER),
);

if (lazyWithSignalr.length === 0) {
  console.error(
    `\nassert-signalr-lazy: FAILED — @microsoft/signalr is not in the output at all.\n\n` +
      `  This check passing would be meaningless. Either the client was removed, or\n` +
      `  the marker string "${SIGNALR_MARKER}" no longer appears in it and this check\n` +
      `  has quietly stopped checking anything.\n`,
  );
  process.exit(1);
}

const bytes = lazyWithSignalr.reduce(
  (total, file) => total + readFileSync(join(BROWSER_DIR, file)).byteLength,
  0,
);

console.log(
  `assert-signalr-lazy: OK — signalr is lazy-only ` +
    `(${lazyWithSignalr.join(', ')}, ${(bytes / 1024).toFixed(1)} kB raw, ` +
    `off the critical path).`,
);
