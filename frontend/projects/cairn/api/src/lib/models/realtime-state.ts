/**
 * Connection state of the live feed. See `IVoteRealtime`.
 *
 * `offline` is not an error state. The hub is a courtesy: the server re-derives
 * the voting window on every read and write, so a client with no connection at
 * all is still correct — it just learns about a close when it next asks rather
 * than the moment it happens.
 */
export type RealtimeState = 'connecting' | 'live' | 'reconnecting' | 'offline';
