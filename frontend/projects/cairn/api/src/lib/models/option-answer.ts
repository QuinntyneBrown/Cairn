/** A vote on an `Options` idea — the id of the chosen `IdeaOption`. */
export interface OptionAnswer {
  readonly kind: 'Options';
  readonly optionId: string;
}
