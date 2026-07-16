/**
 * The rating axis every `Scale` idea is answered on.
 *
 * This is a property of the system, not of an idea — the backend's `VoteShapeRule`
 * hard-codes 1..10 and a database check constraint enforces it, so an idea cannot
 * ask for a different range and the API never sends one. Mirrored here so the ten
 * cells can be rendered without a round trip.
 *
 * If the server's bounds ever move, these move with them; a widget that renders a
 * range the server will reject is worse than one that renders none.
 */
export const SCALE_MIN = 1;
export const SCALE_MAX = 10;

/** `[1..10]` — the points to render, in order. */
export const SCALE_POINTS: readonly number[] = Array.from(
  { length: SCALE_MAX - SCALE_MIN + 1 },
  (_, index) => SCALE_MIN + index,
);
