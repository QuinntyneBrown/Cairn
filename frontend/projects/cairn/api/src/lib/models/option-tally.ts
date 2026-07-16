/**
 * One option's share of the vote. Every option on the idea appears, including ones
 * nobody picked — an option that drew zero votes is a finding, not an absence.
 */
export interface OptionTally {
  readonly optionId: string;
  readonly label: string;
  readonly count: number;
}
