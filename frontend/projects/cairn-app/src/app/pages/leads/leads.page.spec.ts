import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ILeadsService, LEADS_SERVICE, Lead } from '@cairn/api';
import { Observable, of, throwError } from 'rxjs';
import { LeadsPage } from './leads.page';

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'u1',
    email: 'dave@example.org',
    displayName: 'Dave',
    role: 'Lead',
    canSignIn: false,
    ...overrides,
  } as Lead;
}

describe('LeadsPage', () => {
  let fixture: ComponentFixture<LeadsPage>;
  let response: () => Observable<readonly Lead[]>;

  const leads: Partial<ILeadsService> = { list: () => response() };

  function create(): void {
    fixture = TestBed.createComponent(LeadsPage);
    fixture.detectChanges();
  }

  function el(testid: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  }

  beforeEach(() => {
    response = () => of([lead()]);
    TestBed.configureTestingModule({
      imports: [LeadsPage],
      providers: [{ provide: LEADS_SERVICE, useValue: leads }],
    });
  });

  it('lists leads', () => {
    create();

    expect(el('leads-list')).not.toBeNull();
    expect(el('lead-u1')?.textContent).toContain('Dave');
  });

  // The whole point of the page. A passwordless lead is normal, not broken, and if
  // the UI does not say so the first question is always "why can't they log in?".
  it('explains why most leads cannot sign in', () => {
    response = () =>
      of([lead({ id: 'u1' }), lead({ id: 'u2', canSignIn: false }), lead({ id: 'u3' })]);
    create();

    const note = el('leads-note');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain('3 of 3');
    expect(note?.textContent).toContain('voting link');
  });

  it('marks link-only leads and sign-in-capable ones differently', () => {
    response = () => of([lead({ id: 'u1', canSignIn: false }), lead({ id: 'u2', canSignIn: true })]);
    create();

    expect(el('lead-u1')?.querySelector('[data-testid="lead-link-only"]')).not.toBeNull();
    expect(el('lead-u2')?.querySelector('[data-testid="lead-can-sign-in"]')).not.toBeNull();
  });

  it('says nothing about passwords when every lead can sign in', () => {
    response = () => of([lead({ canSignIn: true })]);
    create();

    expect(el('leads-note')).toBeNull();
  });

  it('shows the empty state when there are no leads', () => {
    response = () => of([]);
    create();

    expect(el('leads-empty')).not.toBeNull();
  });

  it('shows an error rather than an empty list when the request fails', () => {
    response = () => throwError(() => new Error('offline'));
    create();

    expect(el('leads-error')).not.toBeNull();
    expect(el('leads-empty')).toBeNull();
  });
});
