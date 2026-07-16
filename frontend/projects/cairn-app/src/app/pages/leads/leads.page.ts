import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LEADS_SERVICE, Lead } from '@cairn/api';
import { EmptyStateComponent, NoticeComponent, SpinnerComponent } from '@cairn/components';

/**
 * Everyone who can be asked.
 *
 * The one thing this page exists to explain is `canSignIn`. Most leads are
 * passwordless, and that is the design rather than a broken account: they are
 * invited by voting link and answer from the link alone, never logging in. A list
 * that showed a bare "cannot sign in" against most of the org would read as a fleet
 * of locked-out accounts and produce exactly one question, so the page answers it
 * before it gets asked.
 */
@Component({
  selector: 'cai-leads-page',
  imports: [EmptyStateComponent, NoticeComponent, SpinnerComponent],
  templateUrl: './leads.page.html',
  styleUrl: './leads.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsPage {
  private readonly leads = inject(LEADS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<readonly Lead[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly linkOnlyCount = computed(
    () => this.rows().filter((lead) => !lead.canSignIn).length,
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.leads
      .list()
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
