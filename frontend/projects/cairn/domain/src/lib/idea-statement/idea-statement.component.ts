import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The idea itself, stated once and loudly.
 *
 * A lead opens this on a phone, on the subway, with five seconds and one thumb.
 * Everything else on the page is machinery; this is the question. It gets the
 * inverse fill and the largest type on the page so that nothing has to compete
 * with it, and so the answer to "what am I being asked?" arrives before any
 * scrolling does.
 */
@Component({
  selector: 'cai-idea-statement',
  templateUrl: './idea-statement.component.html',
  styleUrl: './idea-statement.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeaStatementComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
  /** Small label above the title — context, not instruction. */
  readonly eyebrow = input<string>();
}
