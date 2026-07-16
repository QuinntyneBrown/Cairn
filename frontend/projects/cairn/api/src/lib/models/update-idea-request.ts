import { ResponseType } from './response-type';

/**
 * Body of `PUT /api/ideas/{id}`. Mirrors the backend `UpdateIdeaRequest`.
 *
 * A FULL REPLACEMENT, not a patch. Every field is sent every time, so a caller
 * that omits `responseType` or `options` does not leave them alone — it rewrites
 * them. Load the idea, change what you mean to change, send the whole thing back.
 *
 * Two server rules to respect rather than fight:
 *
 * - `responseType` cannot change once any vote exists. The server answers 400 with
 *   "The response type cannot change once voting has begun..." keyed on
 *   `ResponseType`. There is a composite FK on (IdeaId, ResponseType) behind it —
 *   the votes already cast are shaped for the old type and cannot be reinterpreted.
 * - `options` is matched to the existing choices BY POSITION, and that is load
 *   bearing: an option keeps its id, and therefore its votes, when its label is
 *   edited in place. Reordering the array reassigns votes to different labels.
 *   Removing an entry deletes that option and its votes.
 *
 * Closing an idea is a PUT with `closesAt` set to now — there is no close endpoint,
 * because status is derived from the window rather than stored.
 */
export interface UpdateIdeaRequest {
  readonly title: string;
  readonly description: string;
  readonly responseType: ResponseType;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly options?: readonly string[];
}
