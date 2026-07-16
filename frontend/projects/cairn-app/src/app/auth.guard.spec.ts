import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { AuthStateService } from '@cairn/api';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => localStorage.clear());

  function run(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never)) as
      boolean | UrlTree;
  }

  it('lets a signed-in admin through', () => {
    TestBed.inject(AuthStateService).setSession({
      accessToken: 'tok',
      refreshToken: 'refresh',
      userId: 'u1',
      email: 'a@b.c',
      displayName: 'Admin',
      role: 'Admin',
    });

    expect(run('/ideas')).toBe(true);
  });

  it('sends a signed-out visitor to sign-in, keeping where they were headed', () => {
    const result = run('/ideas/42');

    const router = TestBed.inject(Router);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/sign-in?returnUrl=%2Fideas%2F42');
  });
});
