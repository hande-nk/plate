import { GOOD, type Feeling } from "./feel";
import { editionPicks, type EditionPlate } from "./edition";

/*
 T37, last piece. Safiye's weekly deduction for the Sunday edition: the one pattern in your week worth noticing.
 Only where you ate, how plates felt, and new dishes. Never kcal, protein, amounts or weight.
 The page turns the result into her approved line, e.g. "Four of your five Hodgdon plates this week felt satisfied."
*/

export type Slot = "morning" | "midday" | "afternoon" | "evening";
export type Deduction =
  | { kind: "hall"; hall: string; good: number; rated: number; feeling: Feeling }
  | { kind: "new"; count: number }
  | { kind: "time"; slot: Slot; good: number; rated: number }
  | { kind: "logged"; count: number };

// 4 -> "four", 4 + capital -> "Four". Words for 0 to 12, digits after.
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export function numberWord(n: number, capital = false): string {
  const w = Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
  return capital ? w[0].toUpperCase() + w.slice(1) : w;
}

// Rules, in priority order (each has a test). "This week" = local day weekOf..weekOf+6, like editionPicks.
// 0. Nothing this week -> null.
// 1. hall: a hall with 3+ RATED plates and good/rated >= 0.75. Best = higher share, then more rated, then name A-Z.
//    feeling = the more common good feeling at that hall; a tie -> "energized".
// 2. new: editionPicks(...).newDishes >= 3 (reuse yours).
// 3. time: same test as halls, grouped by part of day (local hour: <11 morning, <15 midday, <18 afternoon, else evening).
// 4. logged: how many plates this week.
const DAY = 864e5;
const dayIn = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const slotOf = (iso: string, tz: string): Slot => {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  return h < 11 ? "morning" : h < 15 ? "midday" : h < 18 ? "afternoon" : "evening";
};

export function weeklyDeduction(plates: EditionPlate[], weekOf: string, tz: string): Deduction | null {
    // 0. this week only
    const end = new Date(Date.parse(`${weekOf}T00:00:00Z`) + 6 * DAY).toISOString().slice(0, 10);
    const week = plates.filter((p) => { const d = dayIn(p.at, tz); return d >= weekOf && d <= end; });
    if (week.length === 0) return null;

    // 1. hall
    const byHall = new Map<string, (Feeling | null)[]>();
    for (const p of week) if (p.hall) byHall.set(p.hall, [...(byHall.get(p.hall) ?? []), p.feeling]);
    const h = best(byHall);
    if (h) {
        const goods = byHall.get(h.key)!.filter((f): f is Feeling => f !== null && GOOD.includes(f));
        const sat = goods.filter((f) => f === "satisfied").length;
        return { kind: "hall", hall: h.key, good: h.good, rated: h.rated,
                feeling: sat > goods.length - sat ? "satisfied" : "energized" };
    }

    // 2. new dishes (yours, reused)
    const fresh = editionPicks({ weekOf, tz, plates, weighIns: [], treatsEnjoyed: 0 }).newDishes;
    if (fresh >= 3) return { kind: "new", count: fresh };

    // 3. time of day
    const bySlot = new Map<Slot, (Feeling | null)[]>();
    for (const p of week) { const s = slotOf(p.at, tz); bySlot.set(s, [...(bySlot.get(s) ?? []), p.feeling]); }
    const t = best(bySlot);
    if (t) return { kind: "time", slot: t.key, good: t.good, rated: t.rated };

    // 4. fallback
    return { kind: "logged", count: week.length };
}

function best<K extends string>(groups: Map<K, (Feeling | null)[]>) {
    let out: { key: K; good: number; rated: number } | null = null;
    for (const [key, fs] of groups) {
        const rated = fs.filter((f): f is Feeling => f !== null);
        const good = rated.filter((f) => GOOD.includes(f)).length;
        if (rated.length < 3 || good / rated.length < 0.75) continue;
        const r = good / rated.length;
        const better = !out || r > out.good / out.rated
        || (r === out.good / out.rated && (rated.length > out.rated || (rated.length === out.rated && key < out.key)));
        if (better) out = { key, good, rated: rated.length };
    }
    return out;
}