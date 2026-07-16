import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { authInterceptor } from './auth.interceptor';
import { skipAuth } from './skip-auth.context';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  function signIn(): void {
    TestBed.inject(AuthStateService).setSession({
      accessToken: 'admin-token',
      refreshToken: 'refresh',
      userId: 'u1',
      email: 'a@b.c',
      displayName: 'Admin',
      role: 'Admin',
    });
  }

  it('attaches the bearer token when signed in', () => {
    signIn();
    http.get('/api/ideas').subscribe();

    const req = controller.expectOne('/api/ideas');
    expect(req.request.headers.get('Authorization')).toBe('Bearer admin-token');
    req.flush({});
  });

  it('sends nothing when signed out', () => {
    http.get('/api/ideas').subscribe();

    const req = controller.expectOne('/api/ideas');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  // The isolation guarantee, at the unit level: an admin IS signed in, and the
  // request still goes out bare because it asked to be left alone.
  it('leaves a SKIP_AUTH request untouched even while an admin is signed in', () => {
    signIn();
    http.post('/api/vote-sessions', { token: 't' }, { context: skipAuth() }).subscribe();

    const req = controller.expectOne('/api/vote-sessions');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
