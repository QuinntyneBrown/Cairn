import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { AuthService } from './auth.service';
import { AuthResult } from '../models/auth-result';
import { CurrentUser } from '../models/current-user';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const baseUrl = 'http://test.local';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // These flush the REAL backend payloads, copied from the C# records, and assert
  // what the caller actually receives. The previous version flushed `{}` and only
  // checked the URL — which is exactly why a wrong AuthResult shape survived a
  // green suite. A fake response is only worth anything if it is the true shape.

  it('signs in and returns the flat AuthResult the server sends', () => {
    let received: AuthResult | undefined;
    service.signIn({ email: 'a@b.c', password: 'pw' }).subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/auth/sign-in`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.c', password: 'pw' });

    // Verbatim `AuthResult(AccessToken, RefreshToken, UserId, Email, DisplayName, Role)`.
    req.flush({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      email: 'a@b.c',
      displayName: 'Quinn Brown',
      role: 'Admin',
    });

    expect(received).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      email: 'a@b.c',
      displayName: 'Quinn Brown',
      role: 'Admin',
    });
  });

  it('gets the current user as CurrentUserDto', () => {
    let received: CurrentUser | undefined;
    service.me().subscribe((u) => (received = u));

    const req = http.expectOne(`${baseUrl}/api/me`);
    expect(req.request.method).toBe('GET');

    // Verbatim `CurrentUserDto(Id, Email, DisplayName, Role)` — `id`, not `userId`.
    // This must stay the literal wire payload: it is the recorded contract for
    // `GET /api/me`, and asserting anything else here is how the client drifts.
    req.flush({
      id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      email: 'a@b.c',
      displayName: 'Quinn Brown',
      role: 'Admin',
    });

    expect(received?.id).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
    expect(received?.displayName).toBe('Quinn Brown');
  });
});
