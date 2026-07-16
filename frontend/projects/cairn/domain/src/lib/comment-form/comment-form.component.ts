import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '@cairn/components';

/**
 * Add a comment. Body only — the author comes from the bearer token's subject, so
 * there is no name to ask for and no name a client could forge.
 *
 * Stays dumb: it emits the text and lets the page own the request, the failure and
 * the refetch. It clears itself only when the page says the comment landed, via
 * `reset()`; clearing on submit would throw away someone's paragraph the moment
 * the network hiccuped.
 */
@Component({
  selector: 'cai-comment-form',
  imports: [ButtonComponent],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentFormComponent {
  /** Disables the control while the page has a request in flight. */
  readonly pending = input(false);
  readonly error = input<string>();

  readonly submitted = output<string>();

  protected readonly body = signal('');
  protected readonly canSubmit = computed(() => this.body().trim().length > 0 && !this.pending());

  /** Called by the page once the comment is actually stored. */
  reset(): void {
    this.body.set('');
  }

  protected onInput(event: Event): void {
    this.body.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    this.submitted.emit(this.body().trim());
  }
}
