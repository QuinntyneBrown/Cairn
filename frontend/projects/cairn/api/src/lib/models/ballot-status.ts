/**
 * What the ballot page should render. DERIVED by `BallotService` — not a wire
 * field. The backend has no such concept and returns no such property.
 *
 * What it is derived from:
 *   - `Open` / `Closed` / `NotYetOpen` come from the idea's own `status`, which the
 *     server computes from its clock when the session is redeemed.
 *   - `Unavailable` is an HTTP 410 on redemption.
 *
 * There is deliberately no `Expired` member, and `Unavailable` is deliberately not
 * called `Invalid`. The backend answers unknown, revoked and expired links with the
 * same 410 and the same message, on purpose: telling a caller which one it was
 * turns the endpoint into an oracle for probing tokens. `Invalid` would name a
 * cause we were never told — it says the link is malformed, when the likeliest case
 * is a perfectly well-formed link that expired an hour ago. The server's own word
 * for this is "Link unavailable"; we use it rather than invent a diagnosis.
 *
 * There is also no `AlreadyVoted`. Voting is an upsert — a lead may change their
 * answer until the idea closes — so someone who has already voted gets an ordinary
 * `Open` ballot with `myVote` filled in. "Already voted" is a pre-selected control,
 * not a dead end.
 */
export type BallotStatus = 'Open' | 'Closed' | 'NotYetOpen' | 'Unavailable';
