import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IdeaResults } from '@cairn/api';
import { SCALE_POINTS } from '../scale';

/** One flat bar. A view model — the wire has no such thing. */
export interface TallyRow {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  /** Share of all votes cast, 0..100. Zero when nobody has voted. */
  readonly percent: number;
}

/** One column of the scale histogram. */
export interface ScaleColumn {
  readonly value: number;
  readonly count: number;
  /** Height relative to the BUSIEST point, 0..100 — not a share of the total. */
  readonly height: number;
}

/**
 * The results of one idea, as flat bars.
 *
 * No chart library and no canvas: a bar is a div with a width. The whole shape of
 * this data is "some labels and some counts", and a dependency that renders axes,
 * legends and tooltips for that is a dependency that also has to be themed,
 * accessibility-audited and upgraded forever.
 *
 * Narrows on `responseType` because the server populates exactly one block and
 * nulls the others. Reading `yesCount` on an Options idea is not a smaller bug
 * than reading a missing property — it is the same bug.
 *
 * ZERO VOTES IS A RESULT. Every bar still renders, at zero. An option nobody chose
 * and a scale point nobody picked are findings; collapsing them to an empty state
 * would hide the thing the reader came to see.
 */
@Component({
  selector: 'cai-vote-tally',
  imports: [DecimalPipe],
  templateUrl: './vote-tally.component.html',
  styleUrl: './vote-tally.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoteTallyComponent {
  readonly results = input.required<IdeaResults>();

  protected readonly totalVotes = computed(() => this.results().totalVotes);
  protected readonly hasVotes = computed(() => this.totalVotes() > 0);

  /** Yes/No and Options both reduce to labelled bars; Scale does not. */
  protected readonly rows = computed<readonly TallyRow[]>(() => {
    const results = this.results();

    switch (results.responseType) {
      case 'YesNo':
        return [
          this.toRow('yes', 'Yes', results.yesCount ?? 0),
          this.toRow('no', 'No', results.noCount ?? 0),
        ];
      case 'Options':
        return (results.options ?? []).map((option) =>
          this.toRow(option.optionId, option.label, option.count),
        );
      case 'Scale':
        return [];
    }
  });

  protected readonly scaleColumns = computed<readonly ScaleColumn[]>(() => {
    const scale = this.results().scale;
    if (!scale) {
      return [];
    }

    // The server always sends all ten points, zeros included. Index by value
    // anyway rather than trusting array order — a fixed axis should not depend on
    // the server happening to sort.
    const counts = new Map(scale.distribution.map((bucket) => [bucket.value, bucket.count]));
    const busiest = Math.max(0, ...scale.distribution.map((bucket) => bucket.count));

    return SCALE_POINTS.map((value) => {
      const count = counts.get(value) ?? 0;
      return {
        value,
        count,
        // Relative to the tallest column, so the shape of the distribution is
        // readable. The counts are printed above the columns because that height
        // is deliberately NOT a percentage of anything.
        height: busiest === 0 ? 0 : Math.round((count / busiest) * 100),
      };
    });
  });

  protected readonly average = computed(() => this.results().scale?.average ?? null);

  private toRow(key: string, label: string, count: number): TallyRow {
    const total = this.totalVotes();
    return { key, label, count, percent: total === 0 ? 0 : Math.round((count / total) * 100) };
  }
}
