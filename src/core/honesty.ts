
import { KCAL_PER_KG } from "./energy";

const READY_DAYS = 21;

/*
 Honesty check (Sanghvi/Hall 2015, about +-40 kcal/day with good data):
   what you actually ate ~= TDEE + 7700 * v     (v = trend slope, kg/day, negative when losing)
 Compare that with the average you logged. A big gap means logging is off,
 or TDEE is off. The app never blames you; it says which numbers disagree.
*/

export type HonestyVerdict =
  | "too-early"      // fewer than 21 days of trend: say when results will show
  | "matches"        // |gap| <= tolerance
  | "logging-low"    // logged less than the scale implies
  | "logging-high";  // logged more than the scale implies

export interface HonestyInput {
  tdeeKcal: number;
  slopeKgPerDay: number;     // from the Kalman trend
  loggedAvgKcal: number;     // average of logged days in the same window
  daysOfData: number;
  toleranceKcal?: number;    // default 150
}

export interface HonestyResult {
  verdict: HonestyVerdict;
  impliedIntakeKcal: number; // rounded
  gapKcal: number;           // logged - implied, rounded
  daysUntilReady: number;    // 0 when ready
}
/**
 * honsetyCheck
 * Purpose: Compares what you logged with what your weight trend 
 * says you ate. Returns a verdict, the implied intake, the gap, and days until ready
 * Input: tdeeKcal, slopeKgPerDay (negative when you’re losing weight), 
 * loggedAvgKcal, daysOfData, and an optional toleranceKcal.
 * Output: verdict, impliedIntakeKcal, gapKcal, daysUntilReady.
 */
export function honestyCheck(input: HonestyInput): HonestyResult {
  // if the difference is over 150kcal there is a problem
  const tolerance = input.toleranceKcal ?? 150;
  const impliedIntake = Math.round(input.tdeeKcal + KCAL_PER_KG * input.slopeKgPerDay);
  const gap = Math.round(input.loggedAvgKcal - impliedIntake);
  const daysUntilReady = Math.max(0, READY_DAYS - input.daysOfData);

  // Determine the verdict based on the gap and tolerance
  let verdict: HonestyVerdict;
  if (input.daysOfData < READY_DAYS) {
    verdict = "too-early";
  } else if (Math.abs(gap) <= tolerance) {
    verdict = "matches";
  } else if (gap < 0) {
    verdict = "logging-low";
  } else {
    verdict = "logging-high";
  }

  return {
    verdict,
    impliedIntakeKcal: impliedIntake,
    gapKcal: gap,
    daysUntilReady: daysUntilReady
  };

}
