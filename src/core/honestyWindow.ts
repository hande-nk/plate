import type { HonestyInput } from "./honesty";

/*
 T16.  honestyCheck (Oct 10) needs four numbers. This picks the window and computes them from real logs.
 Hard part: a day where you only logged a snack would drag the average down and make the scale "disagree".
 So only COMPLETE days (2+ plates) go into the average, and the card says how many days were skipped.
*/

export type MealRow = { eaten_at: string; kcal: number; photo_key: string | null };
export type TrendPoint = { t: number; v: number };     // your runTrend states: t = day number, v = kg per day
export type HonestyWindow = { input: HonestyInput; from: string; to: string; completeDays: number; skippedDays: number };

const DAY = 864e5;
export const dayNumber = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / DAY);   // same as Progress

// Rules (each has a test):
// - No trend -> null. Window ends YESTERDAY (local); if that's before the first weigh-in -> null.
// - Window starts at the first weigh-in, but never more than 28 days back (from = max(firstWeighDay, to - 27)).
// - daysOfData = first weigh-in .. to, inclusive (all of it, so honestyCheck knows when 21 days are reached).
// - Group meals by LOCAL day inside the window. A day's plates = distinct eaten_at|photo_key. Complete = plates >= minPlates.
// - loggedAvgKcal = average kcal of complete days, rounded (0 if none). skippedDays = days in window - complete days.
// - slope = v of the last trend point with t <= dayNumber(to) (else the last point). tdee passes through.
export function honestyWindow(meals: MealRow[], trend: TrendPoint[], firstWeighDay: string, now: Date, tz: string, tdeeKcal: number, minPlates = 2): HonestyWindow | null {
  throw new Error("honestyWindow");
}