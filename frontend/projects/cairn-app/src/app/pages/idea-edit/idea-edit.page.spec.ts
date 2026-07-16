import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  CreateIdeaRequest,
  IDEAS_SERVICE,
  IIdeasService,
  Idea,
  IdeaResults,
  UpdateIdeaRequest,
} from '@cairn/api';
import { Observable, of, throwError } from 'rxjs';
import { IdeaEditPage } from './idea-edit.page';

const IDEA: Idea = {
  id: 'i1',
  title: 'Which cause?',
  description: 'Pick one.',
  responseType: 'Options',
  status: 'Open',
  opensAt: '2026-07-01T00:00:00+00:00',
  closesAt: '2026-07-30T00:00:00+00:00',
  options: [
    { id: 'o1', label: 'Nets', sortOrder: 0 },
    { id: 'o2', label: 'Wells', sortOrder: 1 },
  ],
};

function tally(totalVotes: number): IdeaResults {
  return {
    ideaId: 'i1',
    title: IDEA.title,
    responseType: 'Options',
    status: 'Open',
    closesAt: IDEA.closesAt,
    totalVotes,
    invitedCount: 5,
    yesCount: null,
    noCount: null,
    options: [],
    scale: null,
  };
}

/** A real ValidationProblemDetails, as the exception middleware writes it. */
function validationProblem(errors: Record<string, string[]>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 400,
    error: { title: 'One or more validation errors occurred.', status: 400, errors },
  });
}

describe('IdeaEditPage', () => {
  let fixture: ComponentFixture<IdeaEditPage>;
  let created: CreateIdeaRequest[];
  let updated: { id: string; request: UpdateIdeaRequest }[];
  let saveResult: () => Observable<Idea>;
  let votes: number;

  const ideas: Partial<IIdeasService> = {
    get: () => of(IDEA),
    getTally: () => of(tally(votes)),
    create: (request) => {
      created.push(request);
      return saveResult();
    },
    update: (id, request) => {
      updated.push({ id, request });
      return saveResult();
    },
  };

  function create(id?: string): void {
    fixture = TestBed.createComponent(IdeaEditPage);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    fixture.detectChanges();
  }

  function el(testid: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
  }

  beforeEach(() => {
    created = [];
    updated = [];
    votes = 0;
    saveResult = () => of(IDEA);

    TestBed.configureTestingModule({
      imports: [IdeaEditPage],
      providers: [
        // The page really navigates after a save. An empty route table would make
        // that reject in the background and surface as an unhandled error rather
        // than a failure, so the destinations are declared here.
        provideRouter([
          { path: 'ideas', children: [] },
          { path: 'ideas/:id', children: [] },
        ]),
        { provide: IDEAS_SERVICE, useValue: ideas },
      ],
    });
  });

  it('loads the idea when editing', async () => {
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((el('idea-title') as HTMLInputElement).value).toBe('Which cause?');
    expect((el('option-input-0') as HTMLInputElement).value).toBe('Nets');
  });

  // The rule the server enforces with a 400 and a composite FK. Disabling the
  // picker turns a rejected save into a sentence you read before you try.
  it('locks the response type once a vote exists, and says why', async () => {
    votes = 2;
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    const radio = el('response-type-YesNo')?.querySelector('input') as HTMLInputElement;
    expect(radio.disabled).toBe(true);
    expect(el('response-type-locked')?.textContent).toContain('cannot be reinterpreted');
  });

  it('leaves the response type editable while there are no votes', async () => {
    votes = 0;
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    const radio = el('response-type-YesNo')?.querySelector('input') as HTMLInputElement;
    expect(radio.disabled).toBe(false);
    expect(el('response-type-locked')).toBeNull();
  });

  it('sends a full replacement on update — response type and options included', async () => {
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    (el('idea-save') as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();

    expect(updated.length).toBe(1);
    // Omitting these would not preserve them; PUT is a replacement.
    expect(updated[0].request.responseType).toBe('Options');
    expect(updated[0].request.options).toEqual(['Nets', 'Wells']);
    expect(updated[0].request.title).toBe('Which cause?');
  });

  // The server's message, on the control that caused it.
  it('surfaces the server’s response-type 400 inline', async () => {
    votes = 0;
    saveResult = () =>
      throwError(() =>
        validationProblem({
          ResponseType: ['The response type cannot change once voting has begun.'],
        }),
      );
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    (el('idea-save') as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el('response-type-error')?.textContent).toContain(
      'cannot change once voting has begun',
    );
  });

  it('surfaces the server’s options 400 inline', async () => {
    saveResult = () =>
      throwError(() =>
        validationProblem({ Options: ['An options idea needs at least two choices.'] }),
      );
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    (el('idea-save') as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el('options-server-error')?.textContent).toContain('at least two choices');
  });

  it('falls back to a banner when the failure names no field', async () => {
    saveResult = () =>
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { detail: 'Voting closed.' } }),
      );
    create('i1');
    await fixture.whenStable();
    fixture.detectChanges();

    (el('idea-save') as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el('idea-edit-error')?.textContent).toContain('Voting closed.');
  });

  it('navigates to the new idea after creating one', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    create();
    await fixture.whenStable();
    fixture.detectChanges();

    (el('idea-title') as HTMLInputElement).value = 'New idea';
    (el('idea-title') as HTMLInputElement).dispatchEvent(new Event('input'));
    (el('idea-description') as HTMLTextAreaElement).value = 'Body';
    (el('idea-description') as HTMLTextAreaElement).dispatchEvent(new Event('input'));
    (el('idea-opens') as HTMLInputElement).value = '2026-07-01T10:00';
    (el('idea-opens') as HTMLInputElement).dispatchEvent(new Event('input'));
    (el('idea-closes') as HTMLInputElement).value = '2026-07-30T10:00';
    (el('idea-closes') as HTMLInputElement).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el('idea-save') as HTMLElement).querySelector('button')!.click();
    await fixture.whenStable();

    expect(created.length).toBe(1);
    // YesNo is the default, and it must carry no options.
    expect(created[0].responseType).toBe('YesNo');
    expect(created[0].options).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(['/ideas', 'i1']);
  });
});
