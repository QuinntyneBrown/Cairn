import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { IBallotService } from './ballot.service.contract';
import { skipAuth } from '../auth/skip-auth.context';
import { Ballot } from '../models/ballot';
import { BallotStatus } from '../models/ballot-status';
import { CastVoteRequest } from '../models/cast-vote-request';
import { CreateCommentRequest } from '../models/create-comment-request';
import { CreateVoteSessionRequest } from '../models/create-vote-session-request';
import { Idea } from '../models/idea';
import { IdeaComment } from '../models/idea-comment';
import { ResponseType } from '../models/response-type';
import { VoteAnswer } from '../models/vote-answer';

/** `POST /api/vote-sessions` — the backend's `VoteSessionDto`. Transport only. */
interface VoteSessionResponse {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly leadName: string;
  readonly idea: Idea;
  readonly myVote: VoteResponse | null;
}

/**
 * The backend's `VoteDto`. Mirrors storage: a response type plus three nullable
 * value columns, exactly one populated. This shape stops at the service boundary —
 * `VoteAnswer` is the type worth reasoning in, and it cannot represent the
 * half-filled states this one can.
 */
interface VoteResponse {
  readonly responseType: ResponseType;
  readonly yesNo: boolean | null;
  readonly selectedOptionId: string | null;
  readonly scale: number | null;
}

/** Flattens the answer union into the flat wire shape the backend accepts. */
function toRequest(answer: VoteAnswer): CastVoteRequest {
  switch (answer.kind) {
    case 'YesNo':
      return { yesNo: answer.value };
    case 'Options':
      return { selectedOptionId: answer.optionId };
    case 'Scale':
      return { scale: answer.value };
  }
}

/**
 * Lifts the flat wire vote into the union, keyed off the server's declared
 * `responseType` rather than off whichever field happens to be non-null.
 *
 * A vote whose declared type has no matching value is malformed. Treat it as no
 * vote: an unanswered control invites the voter to answer, where a guessed one
 * would show them an opinion they never expressed and might well be submitted back
 * unread.
 */
function toAnswer(vote: VoteResponse | null): VoteAnswer | null {
  if (!vote) {
    return null;
  }

  switch (vote.responseType) {
    case 'YesNo':
      return vote.yesNo === null ? null : { kind: 'YesNo', value: vote.yesNo };
    case 'Options':
      return vote.selectedOptionId === null
        ? null
        : { kind: 'Options', optionId: vote.selectedOptionId };
    case 'Scale':
      return vote.scale === null ? null : { kind: 'Scale', value: vote.scale };
    default:
      return null;
  }
}

/**
 * Reads a redeemed session as a ballot.
 *
 * `status` is computed here and exists nowhere on the wire. It comes from the
 * idea's own status, which the server derives from its clock at redemption time —
 * so it is a snapshot, not a licence. The 409 on the write is the real gate.
 */
function toBallot(session: VoteSessionResponse): Ballot {
  // 'Draft' is the server's word for an idea whose window has not opened. Renamed
  // at the boundary because a voter holding a link does not care about editorial
  // state — they care that they are early.
  const status: BallotStatus = session.idea.status === 'Draft' ? 'NotYetOpen' : session.idea.status;

  return {
    status,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    leadName: session.leadName,
    idea: session.idea,
    myVote: toAnswer(session.myVote),
  };
}

/** A link that is gone. We are told nothing else about it, so we claim nothing else. */
const DEAD_LINK: Ballot = {
  status: 'Unavailable',
  accessToken: null,
  expiresAt: null,
  leadName: null,
  idea: null,
  myVote: null,
};

/**
 * Anonymous voting.
 *
 * EVERY request here carries `skipAuth()`. That is not defensive habit, it is the
 * requirement: an admin clicking a lead's voting link must send the same bytes an
 * anonymous voter would. Without it the interceptor attaches their Bearer token,
 * the server may attribute the vote to them, and a 401 on this path would clear
 * their admin session out from under them. If you add a method, it gets the
 * context too — `ballot.service.spec.ts` asserts this for all of them.
 *
 * Note the pairing on the authorised calls: `skipAuth()` to keep the global
 * interceptor out, PLUS an explicit `Authorization` header carrying the ballot's
 * own scoped token. Skipping auth does not mean sending none — it means sending
 * ours instead of theirs.
 */
@Injectable()
export class BallotService implements IBallotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(token: string): Observable<Ballot> {
    const body: CreateVoteSessionRequest = { token };

    return this.http
      .post<VoteSessionResponse>(`${this.baseUrl}/api/vote-sessions`, body, {
        context: skipAuth(),
      })
      .pipe(
        map(toBallot),
        catchError((error: HttpErrorResponse) => {
          // 410 covers unknown, expired and revoked — deliberately indistinguishable
          // server-side so the endpoint cannot be used to probe which tokens exist.
          // One state here, because the server gave us one fact.
          if (error.status === 410) {
            return of(DEAD_LINK);
          }
          return throwError(() => error);
        }),
      );
  }

  castVote(ideaId: string, ballotToken: string, answer: VoteAnswer): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/ideas/${ideaId}/votes`, toRequest(answer), {
      context: skipAuth(),
      // The ballot's own scoped token, set explicitly. It authorises this one
      // idea and is never written to AuthStateService.
      headers: { Authorization: `Bearer ${ballotToken}` },
    });
  }

  listComments(ideaId: string, ballotToken: string): Observable<readonly IdeaComment[]> {
    return this.http.get<readonly IdeaComment[]>(`${this.baseUrl}/api/ideas/${ideaId}/comments`, {
      context: skipAuth(),
      headers: { Authorization: `Bearer ${ballotToken}` },
    });
  }

  addComment(ideaId: string, ballotToken: string, body: string): Observable<IdeaComment> {
    const request: CreateCommentRequest = { body };

    return this.http.post<IdeaComment>(`${this.baseUrl}/api/ideas/${ideaId}/comments`, request, {
      context: skipAuth(),
      headers: { Authorization: `Bearer ${ballotToken}` },
    });
  }
}
