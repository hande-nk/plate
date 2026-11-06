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
export function numberWord(n: number, capital = false): string {
  throw new Error("numberWord");
}

// Rules, in priority order (each has a test). "This week" = local day weekOf..weekOf+6, like editionPicks.
// 0. Nothing this week -> null.
// 1. hall: a hall with 3+ RATED plates and good/rated >= 0.75. Best = higher share, then more rated, then name A-Z.
//    feeling = the more common good feeling at that hall; a tie -> "energized".
// 2. new: editionPicks(...).newDishes >= 3 (reuse yours).
// 3. time: same test as halls, grouped by part of day (local hour: <11 morning, <15 midday, <18 afternoon, else evening).
// 4. logged: how many plates this week.
export function weeklyDeduction(plates: EditionPlate[], weekOf: string, tz: string): Deduction | null {
  throw new Error("weeklyDeduction");
}