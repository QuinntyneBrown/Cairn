import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateVotingLinkRequest } from '../models/create-voting-link-request';
import { VotingLink } from '../models/voting-link';

export interface IVotingLinksService {
  /** Every link for the idea. `url` is null on all of them — see `VotingLink`. */
  list(ideaId: string): Observable<readonly VotingLink[]>;

  /**
   * Mints links and returns them WITH `url` populated. This response is the only
   * place those URLs ever exist — the server keeps a hash and cannot reproduce
   * them. A caller that drops this array has lost the links for good; the only
   * remedy is minting again, which rotates the token and kills the link already
   * sent out.
   *
   * An omitted or empty `userIds` mints for EVERY lead.
   */
  create(ideaId: string, request: CreateVotingLinkRequest): Observable<readonly VotingLink[]>;

  /** Revokes a link. The URL stops working; the row remains, with `isRevoked` true. */
  remove(ideaId: string, linkId: string): Observable<void>;
}

export const VOTING_LINKS_SERVICE = new InjectionToken<IVotingLinksService>('IVotingLinksService');
