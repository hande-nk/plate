import { feltGood, GOOD, type Feeling } from "./feel";

/*
 T19. What the Sunday edition shows for one week (Mon..Sun, in your time zone).
 Nothing here looks at calories, amounts or weight. The edition never does.
*/

// One plate (all dishes logged at the same eaten_at + photo_key).
export type EditionPlate = { at: string; dishes: string[]; hall: string | null; feeling: Feeling | null };
export type WinKind = "early" | "weighins" | "treats";

export type EditionInput = {
  weekOf: string;          // Monday, "YYYY-MM-DD"
  tz: string;
  plates: EditionPlate[];  // ALL your plates, not just this week (best meal and new dishes need history)
  weighIns: string[];      // weigh-in days, "YYYY-MM-DD"
  treatsEnjoyed: number;   // planned treats eaten this week (the page counts these)
};

export type Edition = {
  plates: number;                                          // plates this week
  weighIns: number;                                        // distinct weigh-in days this week
  feltGood: { good: number; rated: number; pct: number | null };   // this week, via your feltGood
  best: { plate: EditionPlate; sameDish: { good: number; rated: number } } | null;
  newDishes: number;                                       // dish names this week never seen before this week
  wins: { kind: WinKind; count: number }[];                // fixed order early, weighins, treats; zeros dropped
};

/*
 Rules (each one has a test):
 - A plate is "this week" if its LOCAL day is weekOf..weekOf+6.
 - Best meal: this week's plates that felt good and have at least one dish.
   energized beats satisfied; a tie goes to the most recent. None -> null.
 - sameDish: every rated plate EVER containing the best plate's FIRST dish. Compare names trimmed + lowercased.
 - early: this week's plates eaten before 18:00 local.
*/
export function editionPicks(i: EditionInput): Edition {
    const DAY = 864e5;
    const dayIn = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: i.tz }).format(new Date(iso));
    const hourIn = (iso: string) =>
        Number(new Intl.DateTimeFormat("en-US", { timeZone: i.tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
    const norm = (s: string) => s.trim().toLowerCase();

    // 1. Split the week from the past
    const end = new Date(Date.parse(`${i.weekOf}T00:00:00Z`) + 6 * DAY).toISOString().slice(0, 10);
    const inWeek = (d: string) => d >= i.weekOf && d <= end;
    const week = i.plates.filter((p) => inWeek(dayIn(p.at)));
    const before = i.plates.filter((p) => dayIn(p.at) < i.weekOf);

    // 2. Best meal: a running winner
    const RANK: Record<Feeling, number> = { energized: 2, satisfied: 1, heavy: 0, hungry: 0 };
    let best: EditionPlate | null = null;
    for (const p of week) {
        if (p.feeling === null || !GOOD.includes(p.feeling) || p.dishes.length === 0) continue;
        const beats = !best
        || RANK[p.feeling] > RANK[best.feeling!]
        || (RANK[p.feeling] === RANK[best.feeling!] && p.at > best.at);
        if (beats) best = p;
    }

    // 3. sameDish: the winner's FIRST dish, across ALL plates
    let bestOut: Edition["best"] = null;
    if (best) {
        const name = norm(best.dishes[0]);
        const feelings = i.plates.filter((p) => p.dishes.some((d) => norm(d) === name)).map((p) => p.feeling);
        const f = feltGood(feelings);
        bestOut = { plate: best, sameDish: { good: f.good, rated: f.rated } };
    }

    // 4. New dishes
    const seen = new Set(before.flatMap((p) => p.dishes.map(norm)));
    const newDishes = new Set(week.flatMap((p) => p.dishes.map(norm)).filter((d) => !seen.has(d))).size;

    // 5. Wins
    const weighIns = new Set(i.weighIns.filter(inWeek)).size;
    const early = week.filter((p) => hourIn(p.at) < 18).length;
    const wins = ([
        { kind: "early", count: early },
        { kind: "weighins", count: weighIns },
        { kind: "treats", count: i.treatsEnjoyed },
    ] as { kind: WinKind; count: number }[]).filter((w) => w.count > 0);

    return { plates: week.length, weighIns, feltGood: feltGood(week.map((p) => p.feeling)), best: bestOut, newDishes, wins };
}