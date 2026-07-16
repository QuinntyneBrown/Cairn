import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NoticeKind = 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'cai-notice',
  templateUrl: './notice.component.html',
  styleUrl: './notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticeComponent {
  readonly kind = input<NoticeKind>('info');
  readonly title = input<string>();

  /** Errors interrupt; the rest can wait for the next natural pause. */
  readonly role = computed(() => (this.kind() === 'error' ? 'alert' : 'status'));
}
