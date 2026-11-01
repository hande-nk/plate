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
   throw new Error("editionPicks");
}