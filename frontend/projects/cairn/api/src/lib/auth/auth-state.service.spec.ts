import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { AuthResult } from '../models/auth-result';

/** The real `POST /api/auth/sign-in` body: flat, `userId` not `id`. */
const RESULT: AuthResult = {
  accessToken: 'tok',
  refreshToken: 'refresh',
  userId: 'u1',
  email: 'a@b.c',
  displayName: 'Admin',
  role: 'Admin',
};

describe('AuthStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('starts signed out', () => {
    const service = TestBed.inject(AuthStateService);

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('holds and persists a session', () => {
    const service = TestBed.inject(AuthStateService);
    service.setSession(RESULT);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('tok');
    expect(service.user()?.email).toBe('a@b.c');
    expect(localStorage.getItem('cairn.auth')).not.toBeNull();
  });

  // The reconciliation that matters: sign-in says `userId`, /api/me says `id`,
  // and everything downstream only ever sees a CurrentUser.
  it('maps the flat sign-in result onto a CurrentUser', () => {
    const service = TestBed.inject(AuthStateService);
    service.setSession(RESULT);

    expect(service.user()).toEqual({
      id: 'u1',
      email: 'a@b.c',
      displayName: 'Admin',
      role: 'Admin',
    });
  });

  it('restores a persisted session on construction', () => {
    localStorage.setItem(
      'cairn.auth',
      JSON.stringify({
        token: 'tok',
        refreshToken: 'refresh',
        user: { id: 'u1', email: 'a@b.c', displayName: 'Admin', role: 'Admin' },
      }),
    );

    const service = TestBed.inject(AuthStateService);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.displayName).toBe('Admin');
  });

  it('discards corrupt storage rather than throwing on boot', () => {
    localStorage.setItem('cairn.auth', 'not json');

    const service = TestBed.inject(AuthStateService);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('cairn.auth')).toBeNull();
  });

  it('clears the session and the storage key', () => {
    const service = TestBed.inject(AuthStateService);
    service.setSession(RESULT);
    service.clear();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('cairn.auth')).toBeNull();
  });
});
