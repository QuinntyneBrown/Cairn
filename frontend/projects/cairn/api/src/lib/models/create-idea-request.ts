import { ResponseType } from './response-type';

/**
 * Body of `POST /api/ideas`. Mirrors the backend `CreateIdeaRequest`.
 *
 * `options` is positional — labels are stored in the order given, and that order
 * is the order voters see. It must hold at least two labels for an `Options` idea
 * and must be empty for `YesNo` and `Scale`, which define their own answers; the
 * server rejects anything else with a 400. There is no scale range to send: a
 * `Scale` idea is always 1..10.
 *
 * Both timestamps are required and `closesAt` must be after `opensAt`. The window
 * is what the server derives `status` from — an idea that opens in the future is
 * `Draft`, which is how you stage one before it goes live.
 */
export interface CreateIdeaRequest {
  readonly title: string;
  readonly description: string;
  readonly responseType: ResponseType;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly options?: readonly string[];
}
