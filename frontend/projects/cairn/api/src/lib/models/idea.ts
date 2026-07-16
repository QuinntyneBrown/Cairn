import { IdeaOption } from './idea-option';
import { IdeaStatus } from './idea-status';
import { ResponseType } from './response-type';

/**
 * A single idea put to a vote. Mirrors the backend `IdeaDto` exactly.
 *
 * Note what is NOT here: there is no scale range. A `Scale` idea is always
 * answered on the same 1..10 axis — that bound lives in the backend's
 * `VoteShapeRule` and is enforced by a database check constraint, so it is a
 * property of the system, not of an idea. See `SCALE_MIN`/`SCALE_MAX` in
 * `@cairn/domain`.
 */
export interface Idea {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly responseType: ResponseType;
  readonly status: IdeaStatus;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly options: readonly IdeaOption[];
}
