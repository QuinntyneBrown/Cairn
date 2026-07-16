import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdeaOption, OptionAnswer } from '@cairn/api';
import { OptionsResponseComponent } from './options-response.component';

const OPTIONS: readonly IdeaOption[] = [
  { id: 'o1', label: 'Mosquito nets', sortOrder: 0 },
  { id: 'o2', label: 'Clean water', sortOrder: 1 },
  { id: 'o3', label: 'School books', sortOrder: 2 },
];

describe('OptionsResponseComponent', () => {
  let fixture: ComponentFixture<OptionsResponseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OptionsResponseComponent] });
    fixture = TestBed.createComponent(OptionsResponseComponent);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
  });

  function radios(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input[type=radio]'));
  }

  it('renders one row per option, labelled', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.opts__label'),
    ).map((element) => (element as HTMLElement).textContent?.trim());

    expect(labels).toEqual(['Mosquito nets', 'Clean water', 'School books']);
  });

  // The server sorts. Re-sorting here would be a second opinion about an order the
  // admin already chose.
  it('renders the options in the order given', () => {
    expect(radios().map((radio) => radio.getAttribute('data-testid'))).toEqual([
      'answer-option-o1',
      'answer-option-o2',
      'answer-option-o3',
    ]);
  });

  it('emits the chosen option id', () => {
    const emitted: OptionAnswer[] = [];
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(answer));

    fixture.nativeElement.querySelector('[data-testid=answer-option-o2]').click();

    expect(emitted).toEqual([{ kind: 'Options', optionId: 'o2' }]);
  });

  it('pre-selects an existing choice', () => {
    fixture.componentRef.setInput('value', 'o3');
    fixture.detectChanges();

    const checked = radios().filter((radio) => radio.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('data-testid')).toBe('answer-option-o3');
  });

  it('groups the options so exactly one can be chosen', () => {
    expect(new Set(radios().map((radio) => radio.name)).size).toBe(1);
  });

  it('disables every option when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(radios().every((radio) => radio.disabled)).toBe(true);
  });

  it('renders nothing when an Options idea somehow has no options', () => {
    fixture.componentRef.setInput('options', []);
    fixture.detectChanges();

    expect(radios()).toHaveLength(0);
  });
});
