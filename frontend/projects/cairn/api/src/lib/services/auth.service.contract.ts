import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthResult } from '../models/auth-result';
import { CurrentUser } from '../models/current-user';
import { SignInRequest } from '../models/sign-in-request';

export interface IAuthService {
  signIn(request: SignInRequest): Observable<AuthResult>;
  me(): Observable<CurrentUser>;
}

export const AUTH_SERVICE = new InjectionToken<IAuthService>('IAuthService');
