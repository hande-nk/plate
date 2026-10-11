/*
 Weight trend as a 2-state Kalman filter.

 Every weigh-in does two steps:
   1. PREDICT: "If my trend continued since last time, where am I now?"
               Moves the guess forward in time. Doubt goes UP.
   2. UPDATE:  "The scale says z. Move toward it, but only as much as I trust it."
               Pulls the guess toward the reading. Doubt goes DOWN.
   
    w = best guess of the real weight (kg)
    v = best guess of how fast it changes (kg per day, negative = losing)
    P = how unsure we are about w and v (a 2x2 grid of variances)

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

// A 2x2 grid of numbers: [[top-left, top-right], [bottom-left, bottom-right]]
export type Mat2 = [[number, number], [number, number]];

// Q = how much real change we allow per day, even without new readings.
// Top-left 0.01: true weight can drift about 0.1 kg/day on its own.
// Bottom-right 0.0001: the slope itself can change a little each day
const DEFAULT_Q : Mat2 = ([[0.01, 0], [0, 0.0001]]);  // per day


// R = how noisy ONE scale reading is. Variance 0.6 means about ±0.8 kg.
// Bigger R = trust the scale less = smoother, slower trend line.
const DEFAULT_R = 0.6;   // variance of one scale reading, kg² (about ±0.8 kg)


// Everything the filter knows at one moment.
export interface TrendState {
  w: number;   // best guess of real weight, kg
  v: number;   // best guess of daily change, kg/day
  P: Mat2;     // doubt: P[0][0] about w, P[1][1] about v, corners = how their errors move together
  t: number;   // which day this state is for
}

// Optional knobs, so tests or the app can tune noise without editing code.
export interface TrendOptions {
  /** Variance of a single scale reading, kg^2. Default 0.6. */
  R?: number; // scale noise (default 0.6)
  /** Process noise on [w, v]. Default [[0.01, 0], [0, 0.0001]] per day. */
  Q?: Mat2; // daily drift (default DEFAULT_Q)
}

/** First weigh-in. v starts at 0 with high uncertainty. */
export function initTrend(firstKg: number, day: number): TrendState {
  // w = the reading, v = 0 (no direction yet).
  // P: about 1 kg unsure about weight, about 0.1 kg/day unsure about slope
  return { w: firstKg, v: 0, P: [[1, 0], [0, 0.01]], t: day };
  
}

//“If yesterday’s trend continued, where am I now?”
export function predict(s: TrendState, day: number, Q: Mat2 = DEFAULT_Q): TrendState {
  const dt = day - s.t;  // days since the last state (a skipped weigh-in just makes dt bigger)
  const [[a, b], [c, d]] = s.P; // unpack the 4 doubt numbers into short names
  return {
    w: s.w + dt * s.v,  // new weight = old weight + speed × days
    v: s.v,            // we assume the speed stays the same
    P: [
      // Doubt about weight grows: old doubt, plus doubt from the slope over dt days, plus daily drift.
      [a + dt * (b + c) + dt * dt * d + Q[0][0] * dt, b + dt * d + Q[0][1] * dt ], // b + dt·d + Q01·dt
      // Bottom row: how slope doubt links to weight (left), and slope doubt itself (right).
      [c + dt * d + Q[1][0] * dt , d + Q[1][1] * dt], // c + dt·d + Q10·dt  |  d + Q11·dt
    ],
    t: day,
  };
}


//Update (only on days you weigh in): “Here’s a scale reading; 
// move toward it, but only as much as I trust it.” Uncertainty shrinks.
function update(p: TrendState, zKg: number, R: number): TrendState {
  const [[a, b], [c, d]] = p.P; // the predicted doubt numbers
  const y = zKg - p.w;  // surprise: how far the scale is from what we expected
  const S = a + R; // total doubt = our doubt about weight + the scale's noise
  const K0 = a / S;  // share of the surprise to accept into weight (0 = ignore scale, 1 = believe it fully)
  const K1 = c / S; // how much the surprise should also nudge the slope


  return {
    w: p.w + K0 * y, // move weight part of the way toward the reading
    v: p.v + K1 * y, // a reading below expectation makes the slope a bit more negative
    P: [
      [a - K0 * a, b - K0 * b], // weight doubt shrinks: we just learned something
      [c - K1 * a, d - K1 * b], // slope doubt shrinks a little too
    ],
    t: p.t, // same day as the prediction

  };
}


/** One weigh-in on `day` (may skip days). Returns a NEW state, never mutates. */
export function stepTrend(s: TrendState, zKg: number, day: number, opts?: TrendOptions): TrendState {
  const predicted = predict(s, day, opts?.Q ?? DEFAULT_Q);  // step 1: where should I be today?
  return update(predicted, zKg, opts?.R ?? DEFAULT_R); // step 2: what does the scale say?

}

/** Convenience: run a whole series of {day, kg}, sorted by day. */
export function runTrend(series: { day: number; kg: number }[], opts?: TrendOptions): TrendState[] {
  if (series.length === 0 ) return []; // no data, no trend

  let s = initTrend(series[0].kg, series[0].day); // start from the first reading
  const states: TrendState[] = [s]; // keep every state, starting with the first
  for (const point of series.slice(1)) { //everything after the first reading
    s = stepTrend(s, point.kg, point.day, opts); // build on the previous state
    states.push(s); // save it for the chart
  }
  return states; // states.at(-1) = today's best guess
}
