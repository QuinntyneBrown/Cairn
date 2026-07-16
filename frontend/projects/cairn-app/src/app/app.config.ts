import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  API_BASE_URL,
  AUTH_SERVICE,
  AuthService,
  BALLOT_SERVICE,
  BallotService,
  IDEAS_SERVICE,
  IdeasService,
  LEADS_SERVICE,
  LeadsService,
  VOTING_LINKS_SERVICE,
  VotingLinksService,
  authInterceptor,
} from '@cairn/api';

import { routes } from './app.routes';
import { API_ORIGIN } from './api-origin';
import { provideVoteRealtime } from './realtime-provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: API_ORIGIN },
    { provide: AUTH_SERVICE, useClass: AuthService },
    { provide: IDEAS_SERVICE, useClass: IdeasService },
    { provide: VOTING_LINKS_SERVICE, useClass: VotingLinksService },
    { provide: LEADS_SERVICE, useClass: LeadsService },
    { provide: BALLOT_SERVICE, useClass: BallotService },
    provideVoteRealtime(),
  ],
};
