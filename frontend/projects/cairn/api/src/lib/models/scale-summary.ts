import { ScaleBucket } from './scale-bucket';

/**
 * A `Scale` idea's results. `distribution` always has ten entries, one per point,
 * so a chart can render a fixed axis without inferring gaps from missing keys.
 */
export interface ScaleSummary {
  readonly average: number;
  readonly distribution: readonly ScaleBucket[];
}
