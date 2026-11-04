import type { Feeling } from "./feel";

/*
 T37. Story v2: a clue becomes a scene set at the plate that found it.
 A template has a FRAME (filled from your plate) and a BODY (Safiye's plot line, fixed).
 Slots: {hall} {day} {time} {dish} {feeling}. A part in [square brackets] disappears when a slot inside it is missing.
 Example frame: "[{hall}, ]{day}, {time}.[ You said the {dish} left you {feeling}.]"
*/

export type ClueCtx = {
  at: string;               // eaten_at of the plate that found the clue
  tz: string;
  hall: string | null;      // "hodge" | "carm" | "dewick" | "kindlevan" | null
  dishes: string[];         // dish names on that plate
  feeling: Feeling | null;
  mentionDishes: boolean;   // the Profile switch "Safiye may mention my dishes"
};
export type ClueTemplate = { frame: string; body: string; choiceLines?: Record<string, string> };

// Turn a plate into slot values. Missing = null.
// hall: Hodgdon / Carm / Dewick / Kindlevan (unknown -> null). day: local weekday, "Monday".
// time: local, "12:30pm" / "9:00am". dish: first dish, trimmed + lowercased, only if mentionDishes. feeling: as is.
export function slotValues(ctx: ClueCtx): Record<string, string | null> {
  throw new Error("slotValues");
}

// Fill slots in a text. [optional parts] vanish if any slot inside is null.
// A null slot OUTSIDE brackets throws. An unknown slot name throws anywhere.
export function fill(text: string, v: Record<string, string | null>): string {
  throw new Error("fill");
}

// frame + " " + body, plus " " + the line for your choice (if there is one). Then squash spaces,
// remove a space before "." or ",", trim.
export function renderClue(t: ClueTemplate, ctx: ClueCtx, choice: string | null): string {
  throw new Error("renderClue");
}