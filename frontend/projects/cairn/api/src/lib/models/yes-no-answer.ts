/** A vote on a `YesNo` idea. */
export interface YesNoAnswer {
  readonly kind: 'YesNo';
  readonly value: boolean;
}
