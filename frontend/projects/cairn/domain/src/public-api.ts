/*
 * Public API surface of @cairn/domain
 *
 * Things that know what a vote IS. This is the library allowed to import
 * @cairn/api models and reason about them — @cairn/components must not, and that
 * line is why the answer controls live here. A control whose entire job is knowing
 * what an idea asked for cannot honestly be called a pure primitive.
 */

export * from './lib/scale';
export * from './lib/idea-statement/idea-statement.component';
export * from './lib/ballot-response/ballot-response.component';
export * from './lib/yes-no-response/yes-no-response.component';
export * from './lib/options-response/options-response.component';
export * from './lib/scale-response/scale-response.component';

// The admin surface: the dashboard, the list and the editor.
export * from './lib/idea-card/idea-card.component';
export * from './lib/idea-form/idea-form.component';
export * from './lib/vote-tally/vote-tally.component';
export * from './lib/comment-list/comment-list.component';
export * from './lib/comment-form/comment-form.component';
export * from './lib/voting-link-list/voting-link-list.component';
export * from './lib/live-indicator/live-indicator.component';
