import { todo } from "./todo";

/*
 Weight trend as a 2-state Kalman filter.
   state x = [w, v]   w = true weight (kg), v = daily change (kg/day)
   predict:  x' = F x,          F = [[1, dt], [0, 1]]
             P' = F P F^T + Q
   update:   z = w + noise,     H = [1, 0], R = measurement variance
             K = P' H^T / (H P' H^T + R)
             x = x' + K (z - H x')
             P = (I - K H) P'
 Water and food swing a scale reading by about 1 kg, so R is big on purpose.
 dt is in days, so a skipped weigh-in is just a bigger dt.
*/

export type Mat2 = [[number, number], [number, number]];

export interface TrendState {
  w: number;   // kg
  v: number;   // kg/day
  P: Mat2;     // covariance
  t: number;   // day number of the last update
}

export interface TrendOptions {
  /** Variance of a single scale reading, kg^2. Default 0.6. */
  R?: number;
  /** Process noise on [w, v]. Default [[0.01, 0], [0, 0.0001]] per day. */
  Q?: Mat2;
}

/** First weigh-in. v starts at 0 with high uncertainty. */
export function initTrend(firstKg: number, day: number): TrendState {
  return todo("initTrend");
}

/** One weigh-in on `day` (may skip days). Returns a NEW state, never mutates. */
export function stepTrend(s: TrendState, zKg: number, day: number, opts?: TrendOptions): TrendState {
  return todo("stepTrend");
}

/** Convenience: run a whole series of {day, kg}, sorted by day. */
export function runTrend(series: { day: number; kg: number }[], opts?: TrendOptions): TrendState[] {
  return todo("runTrend");
}
