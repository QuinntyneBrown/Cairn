import { ChangeDetectionStrategy, Component, OnDestroy, input, signal } from '@angular/core';

/**
 * Copies `value` to the clipboard and confirms it inline for a moment.
 *
 * Kept dumb on purpose — it knows nothing about voting links, only about text.
 */
@Component({
  selector: 'cai-copy-button',
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent implements OnDestroy {
  readonly value = input.required<string>();
  readonly label = input('Copy');
  readonly copiedLabel = input('Copied');

  protected readonly copied = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard denied (insecure origin, or the user said no). Say nothing and
      // leave the value on screen to select by hand.
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
