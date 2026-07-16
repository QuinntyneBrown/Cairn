/** One selectable choice on an `Options` idea. */
export interface IdeaOption {
  readonly id: string;
  readonly label: string;
  readonly sortOrder: number;
}
