import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cai-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>();
}
