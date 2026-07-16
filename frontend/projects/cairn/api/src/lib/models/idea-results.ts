import { IdeaStatus } from './idea-status';
import { OptionTally } from './option-tally';
import { ResponseType } from './response-type';
import { ScaleSummary } from './scale-summary';

/**
 * Response of `GET /api/ideas/{id}/results`, and the payload the hub broadcasts on
 * `VoteRecorded` and `VotingClosed`. Mirrors the backend `IdeaResultsDto`.
 *
 * Flat, with only the block matching `responseType` populated: `yesCount`/`noCount`
 * for `YesNo`, `options` for `Options`, `scale` for `Scale`. Narrow on
 * `responseType` before reading any of them.
 *
 * The ballot never sees this. A vote-scoped token joins a voters-only group that is
 * never sent `VoteRecorded` — showing a lead the running tally would anchor their
 * answer to the crowd's, and votes are meant to be independent.
 */
export interface IdeaResults {
  readonly ideaId: string;
  readonly title: string;
  readonly responseType: ResponseType;
  readonly status: IdeaStatus;
  readonly closesAt: string;
  readonly totalVotes: number;
  /** Links minted and not revoked — the denominator for turnout. */
  readonly invitedCount: number;
  readonly yesCount: number | null;
  readonly noCount: number | null;
  readonly options: readonly OptionTally[] | null;
  readonly scale: ScaleSummary | null;
}
