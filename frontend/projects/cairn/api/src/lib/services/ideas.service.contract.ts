import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CastVoteRequest } from '../models/cast-vote-request';
import { CreateCommentRequest } from '../models/create-comment-request';
import { CreateIdeaRequest } from '../models/create-idea-request';
import { Idea } from '../models/idea';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { IdeaStatus } from '../models/idea-status';
import { IdeaSummary } from '../models/idea-summary';
import { UpdateIdeaRequest } from '../models/update-idea-request';

/**
 * Ideas and everything hanging off one: results, comments, and the admin's own
 * vote. Results deliberately live here rather than in a separate results service
 * — `GET /api/ideas/{id}/results` is an idea sub-resource, and splitting it out
 * would buy an extra injection for no boundary.
 */
export interface IIdeasService {
  /** Omit `status` for every idea; pass one to filter server-side. */
  list(status?: IdeaStatus): Observable<readonly IdeaSummary[]>;
  get(id: string): Observable<Idea>;
  create(request: CreateIdeaRequest): Observable<Idea>;
  update(id: string, request: UpdateIdeaRequest): Observable<Idea>;
  remove(id: string): Observable<void>;
  getTally(id: string): Observable<IdeaResults>;
  getComments(id: string): Observable<readonly IdeaComment[]>;
  addComment(id: string, request: CreateCommentRequest): Observable<IdeaComment>;
  castVote(id: string, request: CastVoteRequest): Observable<void>;
}

export const IDEAS_SERVICE = new InjectionToken<IIdeasService>('IIdeasService');
