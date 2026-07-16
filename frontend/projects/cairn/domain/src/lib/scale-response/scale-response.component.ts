import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ScaleAnswer } from '@cairn/api';
import { SCALE_MAX, SCALE_MIN, SCALE_POINTS } from '../scale';

let nextGroupId = 0;

/**
 * A rating from 1 to 10 — ten square cells, the modular motif made literal.
 *
 * Native radios again, and here the payoff is largest: a ten-cell radiogroup is
 * exactly where hand-rolled roving tabindex goes wrong. Arrow keys, Home/End, the
 * single tab stop and the "3 of 10" announcement all come from the platform, and
 * they keep working when the grid rewraps from five columns to ten at 48rem —
 * which a hand-written key handler mapping arrows to indices would not.
 *
 * The endpoints are labelled because a bare 1..10 says nothing about direction.
 */
@Component({
  selector: 'cai-scale-response',
  templateUrl: './scale-response.component.html',
  styleUrl: './scale-response.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScaleResponseComponent {
  readonly disabled = input(false);

  /** Their existing rating, if any. */
  readonly value = input<number | null>(null);

  readonly answered = output<ScaleAnswer>();

  protected readonly points = SCALE_POINTS;
  protected readonly min = SCALE_MIN;
  protected readonly max = SCALE_MAX;
  protected readonly group = `scale-${nextGroupId++}`;

  protected choose(value: number): void {
    this.answered.emit({ kind: 'Scale', value });
  }
}
