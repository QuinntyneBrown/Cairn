import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { IAuthService } from './auth.service.contract';
import { AuthResult } from '../models/auth-result';
import { CurrentUser } from '../models/current-user';
import { SignInRequest } from '../models/sign-in-request';

@Injectable()
export class AuthService implements IAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  signIn(request: SignInRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.baseUrl}/api/auth/sign-in`, request);
  }

  /**
   * `CurrentUser` is the wire shape here, so there is nothing to map. Sign-in is
   * the odd one out — it returns the same person flat and calls the id `userId` —
   * and `AuthStateService.toCurrentUser` reconciles that.
   */
  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/api/me`);
  }
}
