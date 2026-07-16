/**
 * Body of `POST /api/ideas/{id}/vote-links`. Mirrors the backend
 * `CreateVoteLinksRequest`.
 *
 * Minting is plural and bulk by design: one call issues links for many leads and
 * the response is the only place their URLs ever exist.
 *
 * AN OMITTED OR EMPTY `userIds` MINTS A LINK FOR EVERY LEAD. That is the intended
 * "invite everyone" gesture, not a no-op — so never send `{}` as a neutral
 * default, and never let an empty selection fall through to this call.
 *
 * Re-minting for a lead who already has a link ROTATES it: the previous URL stops
 * working the moment the new one is issued. Anyone already sitting on the old link
 * — including a lead part-way through voting — is cut off. Confirm before you do
 * it to someone who has not voted yet.
 */
export interface CreateVotingLinkRequest {
  readonly userIds?: readonly string[];
}
