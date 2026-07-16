import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label + control + error, wrapped. The control itself is projected, so this
 * stays agnostic about forms — pass an `<input>`, a `<textarea>`, whatever.
 */
@Component({
  selector: 'cai-field',
  templateUrl: './field.component.html',
  styleUrl: './field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  readonly label = input.required<string>();
  /** Must match the projected control's `id` so the label actually binds to it. */
  readonly for = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
}
