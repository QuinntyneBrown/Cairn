import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaleAnswer } from '@cairn/api';
import { SCALE_MAX, SCALE_MIN } from '../scale';
import { ScaleResponseComponent } from './scale-response.component';

describe('ScaleResponseComponent', () => {
  let fixture: ComponentFixture<ScaleResponseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ScaleResponseComponent] });
    fixture = TestBed.createComponent(ScaleResponseComponent);
    fixture.detectChanges();
  });

  function radios(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type=radio]'));
  }

  it('renders one cell per point on the scale', () => {
    expect(radios()).toHaveLength(SCALE_MAX - SCALE_MIN + 1);
    expect(radios()).toHaveLength(10);
  });

  it('emits the point that was chosen', () => {
    const emitted: ScaleAnswer[] = [];
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(answer));

    fixture.nativeElement.querySelector('[data-testid=answer-scale-7]').click();

    expect(emitted).toEqual([{ kind: 'Scale', value: 7 }]);
  });

  it('pre-selects an existing rating', () => {
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    const checked = radios().filter((radio) => radio.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('data-testid')).toBe('answer-scale-3');
  });

  /*
   * The accessibility contract. These pass because the control is built on real
   * radios: one tab stop, arrow keys between cells, and a name that groups them —
   * all from the platform, none of it hand-rolled. They are worth asserting anyway,
   * because the tempting "just use divs and click handlers" refactor breaks every
   * one of them silently, and the ten-cell grid rewrapping from five columns to ten
   * at 48rem is exactly where hand-written arrow-key handling goes wrong.
   */
  it('groups the cells so they behave as one radiogroup', () => {
    const names = new Set(radios().map((radio) => radio.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^scale-\d+$/);
  });

  it('gives two instances different group names, so they do not capture each other', () => {
    const second = TestBed.createComponent(ScaleResponseComponent);
    second.detectChanges();

    const firstName = radios()[0].name;
    const secondName = (
      second.nativeElement.querySelector('input[type=radio]') as HTMLInputElement
    ).name;

    expect(firstName).not.toBe(secondName);
  });

  it('labels every cell for a screen reader', () => {
    // `span`, not just `.sr-only` — the visually hidden radio carries that class too.
    const labels: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.scale__cell span.sr-only'),
    ).map((element) => (element as HTMLElement).textContent?.trim() ?? '');

    expect(labels[0]).toBe('1 out of 10');
    expect(labels[9]).toBe('10 out of 10');
  });

  it('disables every cell when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(radios().every((radio) => radio.disabled)).toBe(true);
  });
});
