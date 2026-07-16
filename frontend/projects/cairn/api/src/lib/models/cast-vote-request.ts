/**
 * Body of `PUT /api/ideas/{id}/votes`.
 *
 * Flat and all-optional because that is the wire shape the backend accepts —
 * exactly one field is populated, chosen by the idea's response type. Callers
 * should build this from a `VoteAnswer` rather than hand-assembling it; the
 * union is the type worth reasoning in, this is just transport.
 */
export interface CastVoteRequest {
  readonly yesNo?: boolean;
  readonly selectedOptionId?: string;
  readonly scale?: number;
}
