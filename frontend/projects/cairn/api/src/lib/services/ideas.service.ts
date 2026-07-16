import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { IIdeasService } from './ideas.service.contract';
import { CastVoteRequest } from '../models/cast-vote-request';
import { CreateCommentRequest } from '../models/create-comment-request';
import { CreateIdeaRequest } from '../models/create-idea-request';
import { Idea } from '../models/idea';
import { IdeaComment } from '../models/idea-comment';
import { IdeaResults } from '../models/idea-results';
import { IdeaStatus } from '../models/idea-status';
import { IdeaSummary } from '../models/idea-summary';
import { UpdateIdeaRequest } from '../models/update-idea-request';

@Injectable()
export class IdeasService implements IIdeasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(status?: IdeaStatus): Observable<readonly IdeaSummary[]> {
    // Omitted rather than sent empty: `?status=` would bind as an invalid enum
    // value, not as "no filter".
    const options = status ? { params: new HttpParams().set('status', status) } : {};
    return this.http.get<readonly IdeaSummary[]>(`${this.baseUrl}/api/ideas`, options);
  }

  get(id: string): Observable<Idea> {
    return this.http.get<Idea>(`${this.baseUrl}/api/ideas/${id}`);
  }

  create(request: CreateIdeaRequest): Observable<Idea> {
    return this.http.post<Idea>(`${this.baseUrl}/api/ideas`, request);
  }

  update(id: string, request: UpdateIdeaRequest): Observable<Idea> {
    return this.http.put<Idea>(`${this.baseUrl}/api/ideas/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/ideas/${id}`);
  }

  getTally(id: string): Observable<IdeaResults> {
    return this.http.get<IdeaResults>(`${this.baseUrl}/api/ideas/${id}/results`);
  }

  getComments(id: string): Observable<readonly IdeaComment[]> {
    return this.http.get<readonly IdeaComment[]>(`${this.baseUrl}/api/ideas/${id}/comments`);
  }

  addComment(id: string, request: CreateCommentRequest): Observable<IdeaComment> {
    return this.http.post<IdeaComment>(`${this.baseUrl}/api/ideas/${id}/comments`, request);
  }

  castVote(id: string, request: CastVoteRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/ideas/${id}/votes`, request);
  }
}
