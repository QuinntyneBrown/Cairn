import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

/**
 * Label + control + error, wrapped. The control itself is projected, so this
 * stays agnostic about forms — pass an `<input>`, a `<textarea>`, whatever.
 *
 * Encapsulation is off because the projected control is light DOM: emulated
 * encapsulation stamps every selector part with this component's _ngcontent
 * attribute, which the projected `<input>` never carries, so the control
 * styles would not reach it. The `.field__*` BEM names carry the scoping.
 */
@Component({
  selector: 'cai-field',
  templateUrl: './field.component.html',
  styleUrl: './field.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldComponent {
  readonly label = input.required<string>();
  /** Must match the projected control's `id` so the label actually binds to it. */
  readonly for = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
}
