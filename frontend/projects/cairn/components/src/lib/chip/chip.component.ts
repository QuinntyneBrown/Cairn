import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ChipTone = 'neutral' | 'positive' | 'negative' | 'info' | 'warn' | 'accent';

@Component({
  selector: 'cai-chip',
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipComponent {
  readonly tone = input<ChipTone>('neutral');
}
