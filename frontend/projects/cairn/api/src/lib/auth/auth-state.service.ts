import { Injectable, computed, signal } from '@angular/core';
import { CurrentUser } from '../models/current-user';
import { AuthResult } from '../models/auth-result';

interface StoredSession {
  token: string;
  refreshToken: string;
  user: CurrentUser;
}

const STORAGE_KEY = 'cairn.auth';

/**
 * Sign-in returns the user's fields flat alongside the tokens, and names the id
 * `userId`; `GET /api/me` returns them under a `CurrentUser` that names it `id`.
 * This is the one place that reconciles the two, so nothing downstream has to
 * know that two endpoints describe the same person differently.
 */
function toCurrentUser(result: AuthResult): CurrentUser {
  return {
    id: result.userId,
    email: result.email,
    displayName: result.displayName,
    role: result.role,
  };
}

/**
 * The signed-in admin's session, mirrored to localStorage so a refresh does not
 * sign them out.
 *
 * This holds ADMIN sessions only. A voter's scoped ballot token never comes near
 * it — see `Ballot.accessToken`.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _user = signal<CurrentUser | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  constructor() {
    this.restore();
  }

  setSession(result: AuthResult): void {
    const user = toCurrentUser(result);
    this._user.set(user);
    this._token.set(result.accessToken);
    this._refreshToken.set(result.refreshToken);
    this.persist({ token: result.accessToken, refreshToken: result.refreshToken, user });
  }

  /**
   * Refreshes just the user, leaving the tokens alone — for when `/api/me` comes
   * back and the stored copy from sign-in has since gone stale (a rename, a role
   * change). Does nothing when signed out, so a late response cannot resurrect a
   * user after `clear()`.
   */
  setUser(user: CurrentUser): void {
    const token = this._token();
    if (!token) {
      return;
    }
    this._user.set(user);
    this.persist({ token, refreshToken: this._refreshToken() ?? '', user });
  }

  clear(): void {
    this._user.set(null);
    this._token.set(null);
    this._refreshToken.set(null);
    this.remove();
  }

  private restore(): void {
    const raw = this.readStorage();
    if (!raw) {
      return;
    }

    try {
      const session = JSON.parse(raw) as StoredSession;
      this._user.set(session.user);
      this._token.set(session.token);
      this._refreshToken.set(session.refreshToken ?? null);
    } catch {
      this.remove();
    }
  }

  private persist(session: StoredSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage may be unavailable (private mode / SSR); session stays in memory.
    }
  }

  private readStorage(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private remove(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
