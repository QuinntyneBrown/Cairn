import { IdeaStatus } from './idea-status';
import { ResponseType } from './response-type';

/**
 * Row shape for the ideas list — no options, no description body. Mirrors the
 * backend `IdeaSummaryDto`.
 *
 * `voteCount` over `invitedCount` is the turnout: votes cast against links minted
 * and not revoked. `invitedCount` is zero until links go out, so treat it as a
 * denominator that can legitimately be zero.
 */
export interface IdeaSummary {
  readonly id: string;
  readonly title: string;
  readonly responseType: ResponseType;
  readonly status: IdeaStatus;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly voteCount: number;
  readonly invitedCount: number;
}
