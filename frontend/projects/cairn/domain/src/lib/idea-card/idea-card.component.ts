import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IdeaSummary, IdeaStatus, ResponseType } from '@cairn/api';
import { CardComponent, ChipComponent, ChipTone } from '@cairn/components';

/**
 * One idea in the list: what was asked, how it can be answered, where it is in its
 * window, and how many of the people invited have actually answered.
 *
 * Turnout is the number worth looking at, so it is the number set in display type.
 * "7 votes" alone flatters — 7 of 9 is a mandate and 7 of 60 is not.
 */
@Component({
  selector: 'cai-idea-card',
  imports: [CardComponent, ChipComponent, RouterLink, DatePipe],
  templateUrl: './idea-card.component.html',
  styleUrl: './idea-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaCardComponent {
  readonly idea = input.required<IdeaSummary>();

  protected readonly responseLabel = computed(() => responseTypeLabel(this.idea().responseType));
  protected readonly statusTone = computed<ChipTone>(() => statusTone(this.idea().status));

  /**
   * Turnout as a percentage, or null when nobody has been invited yet. Null rather
   * than zero on purpose: 0% reads as "nobody voted", but before links go out the
   * honest statement is "not asked yet", and dividing by zero says neither.
   */
  protected readonly turnout = computed(() => {
    const { voteCount, invitedCount } = this.idea();
    return invitedCount === 0 ? null : Math.round((voteCount / invitedCount) * 100);
  });
}

/** `YesNo` is not a word. The rest are, but they get spelled out anyway. */
export function responseTypeLabel(responseType: ResponseType): string {
  switch (responseType) {
    case 'YesNo':
      return 'Yes / No';
    case 'Options':
      return 'Options';
    case 'Scale':
      return 'Scale 1–10';
  }
}

export function statusTone(status: IdeaStatus): ChipTone {
  switch (status) {
    // Open is the one state that wants attention: it is the only one where a
    // reminder still changes the outcome.
    case 'Open':
      return 'accent';
    case 'Draft':
      return 'neutral';
    case 'Closed':
      return 'info';
  }
}
