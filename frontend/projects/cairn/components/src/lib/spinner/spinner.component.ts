import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cai-spinner',
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
  /** Announced to screen readers; the ring itself is decorative. */
  readonly label = input('Loading');
}
