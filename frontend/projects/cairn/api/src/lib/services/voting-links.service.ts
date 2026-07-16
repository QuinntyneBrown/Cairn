import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { IVotingLinksService } from './voting-links.service.contract';
import { CreateVotingLinkRequest } from '../models/create-voting-link-request';
import { VotingLink } from '../models/voting-link';

@Injectable()
export class VotingLinksService implements IVotingLinksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(ideaId: string): Observable<readonly VotingLink[]> {
    return this.http.get<readonly VotingLink[]>(`${this.baseUrl}/api/ideas/${ideaId}/vote-links`);
  }

  create(ideaId: string, request: CreateVotingLinkRequest): Observable<readonly VotingLink[]> {
    return this.http.post<readonly VotingLink[]>(
      `${this.baseUrl}/api/ideas/${ideaId}/vote-links`,
      request,
    );
  }

  remove(ideaId: string, linkId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/ideas/${ideaId}/vote-links/${linkId}`);
  }
}
