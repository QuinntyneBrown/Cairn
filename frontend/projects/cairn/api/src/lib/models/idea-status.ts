/**
 * Where an idea sits in its voting window. Mirrors the backend `IdeaStatus`.
 *
 * The server computes this from the clock on every read — it is never stored, so
 * it cannot drift when a scheduler misses a tick. Treat it the same way here: a
 * value that was true when the response was written, not a fact with a shelf
 * life. The 409 on a write is what actually enforces the window.
 */
export type IdeaStatus = 'Draft' | 'Open' | 'Closed';
