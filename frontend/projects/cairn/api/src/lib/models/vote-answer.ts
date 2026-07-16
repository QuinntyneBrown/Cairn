import { OptionAnswer } from './option-answer';
import { ScaleAnswer } from './scale-answer';
import { YesNoAnswer } from './yes-no-answer';

/**
 * A cast vote, discriminated on `kind`.
 *
 * `kind` deliberately reuses the SAME literals as `ResponseType` rather than a
 * parallel set: given an `Idea`, `answer.kind === idea.responseType` narrows the
 * union with no lookup table in between, and the two can never drift apart.
 */
export type VoteAnswer = YesNoAnswer | OptionAnswer | ScaleAnswer;
