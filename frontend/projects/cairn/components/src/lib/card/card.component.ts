import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cai-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  /** Renders the flat selected treatment — a fill swap, never a shadow. */
  readonly selected = input(false);
  readonly inverse = input(false);
}
