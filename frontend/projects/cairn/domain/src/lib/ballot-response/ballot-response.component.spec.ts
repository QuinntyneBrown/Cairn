import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Idea, VoteAnswer } from '@cairn/api';
import { BallotResponseComponent } from './ballot-response.component';

function ideaOf(overrides: Partial<Idea>): Idea {
  return {
    id: 'idea-1',
    title: 'Buy mosquito nets',
    description: 'Should we?',
    responseType: 'YesNo',
    status: 'Open',
    opensAt: '2026-07-01T00:00:00Z',
    closesAt: '2026-08-01T00:00:00Z',
    options: [],
    ...overrides,
  };
}

describe('BallotResponseComponent', () => {
  let fixture: ComponentFixture<BallotResponseComponent>;

  function render(idea: Idea, value: VoteAnswer | null = null): void {
    fixture = TestBed.createComponent(BallotResponseComponent);
    fixture.componentRef.setInput('idea', idea);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [BallotResponseComponent] }));

  it('renders the yes/no control for a YesNo idea', () => {
    render(ideaOf({ responseType: 'YesNo' }));

    expect(fixture.nativeElement.querySelector('cai-yes-no-response')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cai-scale-response')).toBeNull();
    expect(fixture.nativeElement.querySelector('cai-options-response')).toBeNull();
  });

  it('renders the scale control for a Scale idea', () => {
    render(ideaOf({ responseType: 'Scale' }));

    expect(fixture.nativeElement.querySelector('cai-scale-response')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('cai-yes-no-response')).toBeNull();
  });

  it('renders the options control, and passes the idea options through', () => {
    render(
      ideaOf({
        responseType: 'Options',
        options: [
          { id: 'o1', label: 'Nets', sortOrder: 0 },
          { id: 'o2', label: 'Wells', sortOrder: 1 },
        ],
      }),
    );

    expect(fixture.nativeElement.querySelector('cai-options-response')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('input[type=radio]')).toHaveLength(2);
  });

  it('pre-selects an existing answer', () => {
    render(ideaOf({ responseType: 'YesNo' }), { kind: 'YesNo', value: true });

    const yes: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid=answer-yes]');
    const no: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid=answer-no]');
    expect(yes.checked).toBe(true);
    expect(no.checked).toBe(false);
  });

  // The union and ResponseType share their literals, so a mismatch is possible only
  // if the server contradicts itself — but showing a voter an answer they never gave
  // is bad enough to be worth pinning.
  it('ignores an answer of the wrong kind for the idea', () => {
    render(ideaOf({ responseType: 'YesNo' }), { kind: 'Scale', value: 7 });

    const yes: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid=answer-yes]');
    const no: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid=answer-no]');
    expect(yes.checked).toBe(false);
    expect(no.checked).toBe(false);
  });

  it('re-emits the answer from whichever control is hosted', () => {
    render(ideaOf({ responseType: 'YesNo' }));

    const emitted: VoteAnswer[] = [];
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(answer));

    fixture.nativeElement.querySelector('[data-testid=answer-no]').click();

    expect(emitted).toEqual([{ kind: 'YesNo', value: false }]);
  });

  it('disables the hosted control', () => {
    fixture = TestBed.createComponent(BallotResponseComponent);
    fixture.componentRef.setInput('idea', ideaOf({ responseType: 'YesNo' }));
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const yes: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid=answer-yes]');
    expect(yes.disabled).toBe(true);
  });
});
