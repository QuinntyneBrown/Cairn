import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Idea, VoteAnswer } from '@cairn/api';
import { OptionsResponseComponent } from '../options-response/options-response.component';
import { ScaleResponseComponent } from '../scale-response/scale-response.component';
import { YesNoResponseComponent } from '../yes-no-response/yes-no-response.component';

/**
 * Picks the right answer control for an idea. Nothing else.
 *
 * The whole point of this being a shell is the cost of the next response type: one
 * new leaf component and one new `@case`. No branching in the ballot page, no
 * switch in a service, no shared "answer widget" that grows a flag per type and
 * ends up owning three sets of ARIA at once. Each leaf keeps its own semantics —
 * that separation is the reason they are separate.
 *
 * The narrowing below is the one piece of real work: `VoteAnswer` is discriminated
 * on the same literals as `ResponseType`, so an answer of the wrong kind for this
 * idea resolves to `null` and the control shows unanswered rather than mis-reading
 * another type's value as its own.
 */
@Component({
  selector: 'cai-ballot-response',
  imports: [YesNoResponseComponent, OptionsResponseComponent, ScaleResponseComponent],
  templateUrl: './ballot-response.component.html',
  styleUrl: './ballot-response.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BallotResponseComponent {
  readonly idea = input.required<Idea>();
  readonly disabled = input(false);

  /** Their existing answer, if any. */
  readonly value = input<VoteAnswer | null>(null);

  readonly answered = output<VoteAnswer>();

  protected readonly yesNoValue = computed(() => {
    const answer = this.value();
    return answer?.kind === 'YesNo' ? answer.value : null;
  });

  protected readonly optionValue = computed(() => {
    const answer = this.value();
    return answer?.kind === 'Options' ? answer.optionId : null;
  });

  protected readonly scaleValue = computed(() => {
    const answer = this.value();
    return answer?.kind === 'Scale' ? answer.value : null;
  });
}
