import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YesNoAnswer } from '@cairn/api';
import { YesNoResponseComponent } from './yes-no-response.component';

describe('YesNoResponseComponent', () => {
  let fixture: ComponentFixture<YesNoResponseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [YesNoResponseComponent] });
    fixture = TestBed.createComponent(YesNoResponseComponent);
    fixture.detectChanges();
  });

  function radio(testid: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`[data-testid=${testid}]`);
  }

  it('emits yes', () => {
    const emitted: YesNoAnswer[] = [];
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(answer));

    radio('answer-yes').click();

    expect(emitted).toEqual([{ kind: 'YesNo', value: true }]);
  });

  it('emits no', () => {
    const emitted: YesNoAnswer[] = [];
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(answer));

    radio('answer-no').click();

    expect(emitted).toEqual([{ kind: 'YesNo', value: false }]);
  });

  // `false` is a real answer, not an absent one. A truthiness check anywhere in the
  // chain turns "No" into "unanswered", which is the kind of bug that only shows up
  // as a tally that is quietly missing its dissenters.
  it('pre-selects No — a false value is an answer, not the absence of one', () => {
    fixture.componentRef.setInput('value', false);
    fixture.detectChanges();

    expect(radio('answer-no').checked).toBe(true);
    expect(radio('answer-yes').checked).toBe(false);
  });

  it('pre-selects Yes', () => {
    fixture.componentRef.setInput('value', true);
    fixture.detectChanges();

    expect(radio('answer-yes').checked).toBe(true);
    expect(radio('answer-no').checked).toBe(false);
  });

  it('shows nothing selected when there is no answer yet', () => {
    expect(radio('answer-yes').checked).toBe(false);
    expect(radio('answer-no').checked).toBe(false);
  });

  it('groups both choices under one name so they are mutually exclusive', () => {
    expect(radio('answer-yes').name).toBe(radio('answer-no').name);
  });

  it('disables both choices when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(radio('answer-yes').disabled).toBe(true);
    expect(radio('answer-no').disabled).toBe(true);
  });
});
