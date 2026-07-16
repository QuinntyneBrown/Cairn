/** Body of `POST /api/vote-sessions` — exchanges a link token for a ballot. */
export interface CreateVoteSessionRequest {
  readonly token: string;
}
