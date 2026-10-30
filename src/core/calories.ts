export type DayStatus = "in" | "above" | "below" | "logged" | "none" | "open";
export type DayBar = { label: string; date: string; kcal: number | null; status: DayStatus };

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// "2026-10-29" as the calendar reads in that time zone (same helper as clue.ts)
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

// "2026-10-26" + 3 days -> "2026-10-29". Pure calendar math in UTC, so clock changes can't shift it.
const addDays = (iso: string, n: number) =>
    new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export function weekCalories(meals: { eaten_at: string; kcal: number }[], weekOf: string, now: Date, tz: string,
    target: number | null): { days: DayBar[]; inRange: number; counted: number } {

    // 1. Total kcal per local day
    const totals = new Map<string, number>();
    for (const m of meals) {
        const d = dayIn(new Date(m.eaten_at), tz); // which local day was this meal?
        totals.set(d, (totals.get(d) ?? 0) + m.kcal); // add to whatever that day already has
    }

    // 2. Today, and the band
    const today = dayIn(now, tz);
    const low = target === null ? 0 : Math.round(target * 0.9);
    const high = target === null ? 0 : Math.round(target * 1.1);

    // 3. Seven bars
    const days: DayBar[] = LABELS.map((label, i) => {
        const date = addDays(weekOf, i);
        const raw = totals.get(date);                 // undefined if nothing logged
        const kcal = raw === undefined ? null : Math.round(raw);

        let status: DayStatus;
        if (date >= today) status = "open";                    // today or later
        else if (kcal === null) status = "none";               // nothing logged
        else if (target === null) status = "logged";             // just tracking, no target
        else status = kcal < low ? "below" : kcal > high ? "above" : "in";  // below, above, or in

        return { label, date, kcal, status };
    });

    // 4. The two counts
    const inRange = days.filter((d) => d.status === "in").length;
    const counted = days.filter((d) => ["in", "above", "below", "logged"].includes(d.status)).length;
    return { days, inRange, counted };
}