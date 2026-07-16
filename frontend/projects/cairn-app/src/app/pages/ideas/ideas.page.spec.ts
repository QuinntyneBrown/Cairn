import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IDEAS_SERVICE, IIdeasService, IdeaStatus, IdeaSummary } from '@cairn/api';
import { Observable, of, throwError } from 'rxjs';
import { IdeasPage } from './ideas.page';

function summary(overrides: Partial<IdeaSummary> = {}): IdeaSummary {
  return {
    id: 'i1',
    title: 'Buy mosquito nets',
    responseType: 'YesNo',
    status: 'Open',
    opensAt: '2026-07-01T00:00:00+00:00',
    closesAt: '2026-07-30T00:00:00+00:00',
    voteCount: 3,
    invitedCount: 8,
    ...overrides,
  };
}

describe('IdeasPage', () => {
  let fixture: ComponentFixture<IdeasPage>;
  let calls: (IdeaStatus | undefined)[];
  let response: () => Observable<readonly IdeaSummary[]>;

  const ideas: Partial<IIdeasService> = {
    list: (status?: IdeaStatus) => {
      calls.push(status);
      return response();
    },
  };

  function create(): void {
    fixture = TestBed.createComponent(IdeasPage);
    fixture.detectChanges();
  }

  function el(testid: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  }

  beforeEach(() => {
    calls = [];
    response = () => of([summary()]);

    TestBed.configureTestingModule({
      imports: [IdeasPage],
      providers: [provideRouter([]), { provide: IDEAS_SERVICE, useValue: ideas }],
    });
  });

  it('lists ideas on load, with no status filter', () => {
    create();

    expect(calls).toEqual([undefined]);
    expect(el('ideas-list')).not.toBeNull();
    expect(el('idea-card-i1')).not.toBeNull();
  });

  // The filter must round-trip. Status is derived from the clock server-side, so a
  // list filtered in the browser goes stale the moment an idea's window closes.
  it('refetches from the server when a filter is chosen', () => {
    create();
    calls.length = 0;

    (el('filter-Closed') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(calls).toEqual(['Closed']);
  });

  it('sends no status when All is chosen again', () => {
    create();
    (el('filter-Open') as HTMLButtonElement).click();
    fixture.detectChanges();
    calls.length = 0;

    (el('filter-All') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(calls).toEqual([undefined]);
  });

  it('does not refetch when the active filter is clicked again', () => {
    create();
    (el('filter-Open') as HTMLButtonElement).click();
    fixture.detectChanges();
    calls.length = 0;

    (el('filter-Open') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(calls).toEqual([]);
  });

  it('shows the empty state with a call to action when there are no ideas at all', () => {
    response = () => of([]);
    create();

    expect(el('ideas-empty')).not.toBeNull();
    expect(el('ideas-list')).toBeNull();
  });

  it('shows an error rather than an empty list when the request fails', () => {
    response = () => throwError(() => new Error('offline'));
    create();

    expect(el('ideas-error')).not.toBeNull();
    // Crucially not the empty state: "no ideas" and "we could not ask" are
    // different facts and must not look the same.
    expect(el('ideas-empty')).toBeNull();
  });
});
