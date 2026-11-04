/*
 T38. Your usuals: plates you log again and again, so the + screen can re-log them in one tap.
 A "usual" is the same set of dishes (same portions) logged at least twice in the last 30 days.
*/
 
export type UsualRow = { dish_id: number | null; dish_name: string; portion: number; kcal: number };
export type UsualPlate = { at: string; route: string; place: string | null; rows: UsualRow[] };
export type Usual = {
  key: string; label: string; count: number;
  lastAt: string; route: string; place: string | null;   // from the most recent time you ate it
  rows: UsualRow[];                                       // the most recent rows, to log again
};
 
// One string per plate, the same whatever order the dishes are in.
// Each row -> "<dish_id>x<portion>" (no dish_id: the trimmed, lowercased name instead), sorted, joined with "+".
export function plateKey(rows: UsualRow[]): string {
    return rows
        .map((r) => `${r.dish_id ?? r.dish_name.trim().toLowerCase()}x${r.portion}`)
        .sort()
        .join("+");
}
 
// "Tuna Salad, Gluten-Free Wrap + 1 more": the two biggest rows by kcal, then how many are left (if any).
export function usualLabel(rows: UsualRow[]): string {
    const top = [...rows].sort((a, b) => b.kcal - a.kcal).slice(0, 2).map((r) => r.dish_name);
    const more = rows.length - top.length;
    return more > 0 ? `${top.join(", ")} + ${more} more` : top.join(", ");
}


const DAY = 864e5;
const slot = (iso: string, tz: string) => {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  return h < 11 ? 0 : h < 15 ? 1 : h < 18 ? 2 : 3;
};

 
// Rules (each one has a test):
// - Only plates from the last 30 days, not after now, with at least one row.
// - Group by plateKey. Keep groups seen 2+ times.
// - Score = count + 2 x (times it was eaten in the same part of the day as now).
//   Parts of the day, local hour in tz: before 11, 11 to 15, 15 to 18, 18 and later.
// - Highest score first; a tie goes to the one eaten most recently. At most `limit`.
export function topUsuals(plates: UsualPlate[], now: Date, tz: string, limit = 4): Usual[] {
    const since = now.getTime() - 30 * DAY;
    const nowSlot = slot(now.toISOString(), tz);
    const groups = new Map<string, { count: number; last: UsualPlate; inSlot: number }>();

    for (const p of plates) {
        const t = Date.parse(p.at);
        if (t < since || t > now.getTime() || p.rows.length === 0) continue;
        const key = plateKey(p.rows);
        const g = groups.get(key) ?? { count: 0, last: p, inSlot: 0 };
        g.count += 1;
        if (slot(p.at, tz) === nowSlot) g.inSlot += 1;
        if (p.at > g.last.at) g.last = p;
        groups.set(key, g);
    }

    return Array.from(groups.entries())
        .filter(([, g]) => g.count >= 2)
        .map(([key, g]) => ({ key, g, score: g.count + 2 * g.inSlot }))
        .sort((a, b) => b.score - a.score || (b.g.last.at > a.g.last.at ? 1 : -1))
        .slice(0, limit)
        .map(({ key, g }) => ({ key, label: usualLabel(g.last.rows), count: g.count, lastAt: g.last.at, route: g.last.route, place: g.last.place, rows: g.last.rows }));
}