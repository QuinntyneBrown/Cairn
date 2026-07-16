import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { VotingLink } from '@cairn/api';
import { ButtonComponent, CopyButtonComponent } from '@cairn/components';

/**
 * Who has been invited, who has answered, and — for the one moment it is possible —
 * the links themselves.
 *
 * THE HARD PART IS THE URL, AND IT IS NOT A UI PREFERENCE. The server hashes the
 * token and returns the raw URL only in the response that mints it. So this list
 * has two populations that look identical in the model and must not look identical
 * on screen:
 *
 *   - links just minted, whose `url` is non-null: copy them NOW or they are gone.
 *   - every link fetched since, whose `url` is null: there is nothing to copy, ever.
 *
 * The second group gets no disabled copy button and no "reveal" affordance, because
 * both would imply the URL is retrievable and it is not. It gets a regenerate
 * action and a sentence explaining why — the honest answer to "where's the link?"
 * is "gone, mint a new one", and the UI should say that rather than let someone
 * hunt for a control that cannot exist.
 */
@Component({
  selector: 'cai-voting-link-list',
  imports: [ButtonComponent, CopyButtonComponent, DatePipe],
  templateUrl: './voting-link-list.component.html',
  styleUrl: './voting-link-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VotingLinkListComponent {
  readonly links = input.required<readonly VotingLink[]>();

  /** Links minted in this session, still holding their raw `url`. */
  readonly freshLinks = input<readonly VotingLink[]>([]);

  readonly regenerated = output<VotingLink>();
  readonly revoked = output<VotingLink>();

  protected readonly hasFresh = computed(() => this.freshLinks().length > 0);

  /** Every fresh URL, newline-joined — one copy for the whole batch. */
  protected readonly allFreshUrls = computed(() =>
    this.freshLinks()
      .map((link) => `${link.displayName}: ${link.url}`)
      .join('\n'),
  );

  protected readonly votedCount = computed(
    () => this.links().filter((link) => link.hasVoted).length,
  );

  protected readonly activeCount = computed(
    () => this.links().filter((link) => !link.isRevoked).length,
  );
}
