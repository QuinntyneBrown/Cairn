import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { YesNoAnswer } from '@cairn/api';

/** Radios need a name to group by, and two of these could share a page. */
let nextGroupId = 0;

/**
 * Yes or no.
 *
 * Built on real `<input type="radio">` elements, visually hidden behind their
 * labels. Native radios bring the entire accessible radiogroup contract for free
 * and correct: arrow keys move between options, the group takes one tab stop,
 * `:checked` drives the visual, and screen readers announce "radio button, 1 of 2"
 * without a line of ARIA. A div with `role="radio"` and hand-rolled key handling
 * has to re-earn all of that, and usually gets the tabindex wrong.
 */
@Component({
  selector: 'cai-yes-no-response',
  templateUrl: './yes-no-response.component.html',
  styleUrl: './yes-no-response.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YesNoResponseComponent {
  readonly disabled = input(false);

  /** Their existing answer, if any. Controlled — the parent owns the selection. */
  readonly value = input<boolean | null>(null);

  readonly answered = output<YesNoAnswer>();

  protected readonly group = `yes-no-${nextGroupId++}`;

  protected choose(value: boolean): void {
    this.answered.emit({ kind: 'YesNo', value });
  }
}
