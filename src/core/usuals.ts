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
    throw new Error("plateKey");
}
 
// "Tuna Salad, Gluten-Free Wrap + 1 more": the two biggest rows by kcal, then how many are left (if any).
export function usualLabel(rows: UsualRow[]): string {
    throw new Error("usualLabel");
}
 
// Rules (each one has a test):
// - Only plates from the last 30 days, not after now, with at least one row.
// - Group by plateKey. Keep groups seen 2+ times.
// - Score = count + 2 x (times it was eaten in the same part of the day as now).
//   Parts of the day, local hour in tz: before 11, 11 to 15, 15 to 18, 18 and later.
// - Highest score first; a tie goes to the one eaten most recently. At most `limit`.
export function topUsuals(plates: UsualPlate[], now: Date, tz: string, limit = 4): Usual[] {
    throw new Error("topUsuals");
}