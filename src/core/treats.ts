/*
 T33. Plate plans the treat for the coming week (shown in the Sunday edition: Keep, Swap or Skip).
 A treat is planned and enjoyed, never "earned". It goes on a day that usually has room in your range.
*/
 
export type Treat = { id: number; name: string; outing: boolean };   // outing = with a friend, out somewhere
export type Proposal = { treatId: number; weekOf: string; day: string };   // past weeks' proposals
export type Pick = { treatId: number; day: string };

const DAY = 864e5;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const gap = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

export function planTreats(weekOf: string, treats: Treat[], history: Proposal[], room: (number | null)[], count: 1 | 2 = 1): Pick[] {
    // 1. Variety: which treats are allowed, in which order
    const recent = new Set(history.filter((h) => { const g = gap(h.weekOf, weekOf); return g > 0 && g <= 14; }).map((h) => h.treatId));
    const fresh = treats.filter((t) => !recent.has(t.id));
    const times = (id: number) => history.filter((h) => h.treatId === id).length;
    const pool = (fresh.length ? fresh : treats).slice().sort((a, b) => times(a.id) - times(b.id) || a.id - b.id);

    // 2. Days: drop big days, best first
    const days = Array.from({ length: 7 }, (_, i) => ({ i, day: addDays(weekOf, i), room: room[i] ?? null }))
        .filter((d) => d.room === null || d.room >= 0)
        .sort((a, b) => (b.room ?? 0) - (a.room ?? 0) || b.i - a.i);

    // 3. Give each treat the best day that fits
    const lastDays = history.map((h) => h.day);
    const picks: Pick[] = [];
    for (const t of pool) {
        if (picks.length === count) break;
        const d = days.find((x) =>
        (!t.outing || x.i >= 4) &&
        !picks.some((p) => Math.abs(gap(p.day, x.day)) <= 1) &&
        !lastDays.some((ld) => Math.abs(gap(ld, x.day)) === 1));
        if (d) picks.push({ treatId: t.id, day: d.day });
    }
    return picks.sort((a, b) => a.day.localeCompare(b.day));
}