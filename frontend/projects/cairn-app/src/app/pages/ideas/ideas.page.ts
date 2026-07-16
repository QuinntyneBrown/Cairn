import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IDEAS_SERVICE, IdeaStatus, IdeaSummary } from '@cairn/api';
import {
  ButtonComponent,
  EmptyStateComponent,
  NoticeComponent,
  SpinnerComponent,
} from '@cairn/components';
import { IdeaCardComponent } from '@cairn/domain';

/** The chips, in the order an idea moves through them. `null` is "everything". */
const FILTERS: readonly { readonly label: string; readonly value: IdeaStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'Draft' },
  { label: 'Open', value: 'Open' },
  { label: 'Closed', value: 'Closed' },
];

/**
 * Every idea, filtered by where it is in its voting window.
 *
 * The filter round-trips instead of slicing the array here. Status is computed from
 * the clock on every request, so a client-side filter would go on showing an idea
 * as Open minutes after it closed — refetching is the only way to be right about a
 * value the server derives rather than stores.
 */
@Component({
  selector: 'cai-ideas-page',
  imports: [
    IdeaCardComponent,
    ButtonComponent,
    EmptyStateComponent,
    NoticeComponent,
    SpinnerComponent,
    RouterLink,
  ],
  templateUrl: './ideas.page.html',
  styleUrl: './ideas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeasPage {
  private readonly ideas = inject(IDEAS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filters = FILTERS;
  protected readonly active = signal<IdeaStatus | null>(null);

  protected readonly rows = signal<readonly IdeaSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  constructor() {
    this.load();
  }

  protected select(status: IdeaStatus | null): void {
    if (this.active() === status) {
      return;
    }
    this.active.set(status);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.ideas
      .list(this.active() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }
}
