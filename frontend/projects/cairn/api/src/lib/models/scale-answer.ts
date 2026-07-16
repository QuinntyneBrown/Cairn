/** A vote on a `Scale` idea — a point on the fixed `SCALE_MIN`..`SCALE_MAX` axis. */
export interface ScaleAnswer {
  readonly kind: 'Scale';
  readonly value: number;
}
