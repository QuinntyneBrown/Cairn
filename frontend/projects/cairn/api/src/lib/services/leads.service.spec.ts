import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-config';
import { LeadsService } from './leads.service';
import { Lead } from '../models/lead';

describe('LeadsService', () => {
  let service: LeadsService;
  let http: HttpTestingController;
  const baseUrl = 'http://test.local';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        LeadsService,
      ],
    });
    service = TestBed.inject(LeadsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists leads and reads the shape the backend sends', () => {
    let received: readonly Lead[] | undefined;
    service.list().subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/api/leads`);
    expect(req.request.method).toBe('GET');

    // Verbatim LeadDto. A passwordless lead — canSignIn false — is the normal
    // case, not a broken account: they vote from their link and never log in.
    req.flush([
      { id: 'u1', email: 'dave@example.org', displayName: 'Dave', role: 'Lead', canSignIn: false },
      { id: 'u2', email: 'ada@example.org', displayName: 'Ada', role: 'Admin', canSignIn: true },
    ]);

    expect(received?.[0].canSignIn).toBe(false);
    expect(received?.[0].displayName).toBe('Dave');
    expect(received?.[1].role).toBe('Admin');
  });
});
