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
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayIn = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

export function honestyWindow(meals: MealRow[], trend: TrendPoint[], firstWeighDay: string, now: Date, tz: string, tdeeKcal: number, minPlates = 2): HonestyWindow | null {
    // 1. The window
    if (trend.length === 0) return null;
    const to = addDays(dayIn(now.toISOString(), tz), -1);              // yesterday
    if (to < firstWeighDay) return null;
    const earliest = addDays(to, -27);                                   // 28 days including `to`
    const from = firstWeighDay > earliest ? firstWeighDay : earliest;

    // 2. Meals -> local days, each with its kcal and its set of plates
    const days = new Map<string, { kcal: number; plates: Set<string> }>();
    for (const m of meals) {
        const d = dayIn(m.eaten_at, tz);
        if (d < from || d > to) continue;
        const e = days.get(d) ?? { kcal: 0, plates: new Set<string>() };
        e.kcal += m.kcal;
        e.plates.add(`${m.eaten_at}|${m.photo_key ?? ""}`);
        days.set(d, e);
    }

    // 3. Only complete days count
    const complete = [...days.values()].filter((e) => e.plates.size >= minPlates);
    const span = dayNumber(to) - dayNumber(from) + 1;                 // days in the window, both ends included
    const avg = complete.length ? Math.round(complete.reduce((s, e) => s + e.kcal, 0) / complete.length) : 0;

    // 4. Slope on the window's last day
    const upTo = trend.filter((p) => p.t <= dayNumber(to));
    const slope = (upTo.at(-1) ?? trend.at(-1)!).v;

    return {
        input: { tdeeKcal, slopeKgPerDay: slope, loggedAvgKcal: avg, daysOfData: dayNumber(to) - dayNumber(firstWeighDay) + 1 },
        from, to, completeDays: complete.length, skippedDays: span - complete.length,
    };
}