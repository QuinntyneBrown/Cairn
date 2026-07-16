import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IdeaComment } from '@cairn/api';

/**
 * The discussion on an idea, oldest first.
 *
 * Attributed, unlike the votes. A lead's link is minted for a known person and the
 * server resolves `authorName` from the token, so a comment carries a name while
 * the vote beside it does not. That asymmetry is deliberate upstream: an argument
 * is worth more when you know who is making it, an answer is worth more when
 * nobody does.
 */
@Component({
  selector: 'cai-comment-list',
  imports: [DatePipe],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentListComponent {
  readonly comments = input.required<readonly IdeaComment[]>();
}
