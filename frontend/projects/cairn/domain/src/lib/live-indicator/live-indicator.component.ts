import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RealtimeState } from '@cairn/api';

/**
 * Whether the tally on screen is keeping itself up to date.
 *
 * Ambient on purpose — small, quiet, no icon, no animation beyond the live dot. It
 * answers "is this number still moving?" for someone glancing at a dashboard, and
 * nothing more.
 *
 * `offline` is deliberately not styled as an error. The server re-derives the
 * voting window on every read, so a dashboard with no hub connection is not wrong,
 * just late — it will catch up on the next refetch. Shouting about it would train
 * people to ignore the one indicator that matters.
 */
@Component({
  selector: 'cai-live-indicator',
  templateUrl: './live-indicator.component.html',
  styleUrl: './live-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveIndicatorComponent {
  readonly state = input.required<RealtimeState>();

  protected readonly label = computed(() => {
    switch (this.state()) {
      case 'live':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return 'Reconnecting';
      case 'offline':
        return 'Not live';
    }
  });

  /** Said to screen readers, where "Live" alone would be meaningless. */
  protected readonly description = computed(() => {
    switch (this.state()) {
      case 'live':
        return 'Results are updating as votes arrive.';
      case 'connecting':
        return 'Connecting to live results.';
      case 'reconnecting':
        return 'Reconnecting to live results.';
      case 'offline':
        return 'Live updates are off. Reload to see the latest results.';
    }
  });
}
