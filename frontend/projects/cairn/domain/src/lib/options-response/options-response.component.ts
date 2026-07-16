import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IdeaOption, OptionAnswer } from '@cairn/api';

let nextGroupId = 0;

/**
 * One of several named choices. Native radios, for the reasons in
 * `YesNoResponseComponent`.
 */
@Component({
  selector: 'cai-options-response',
  templateUrl: './options-response.component.html',
  styleUrl: './options-response.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptionsResponseComponent {
  /** Already in the server's sort order — rendered as given, never re-sorted here. */
  readonly options = input.required<readonly IdeaOption[]>();

  readonly disabled = input(false);

  /** The id of their existing choice, if any. */
  readonly value = input<string | null>(null);

  readonly answered = output<OptionAnswer>();

  protected readonly group = `options-${nextGroupId++}`;

  protected choose(optionId: string): void {
    this.answered.emit({ kind: 'Options', optionId });
  }
}
