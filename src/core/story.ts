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
const HALL: Record<string, string> = { hodge: "Hodgdon", carm: "Carm", dewick: "Dewick", kindlevan: "Kindlevan" };

export function slotValues(ctx: ClueCtx): Record<string, string | null> {
    const d = new Date(ctx.at);
    const day = new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, weekday: "long" }).format(d);
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, hour: "numeric", minute: "2-digit", hour12: true })
        .formatToParts(d).map((p) => [p.type, p.value]));
    const time = `${parts.hour}:${parts.minute}${String(parts.dayPeriod).toLowerCase()}`;   // "PM" -> "pm"
    return {
        hall: ctx.hall ? HALL[ctx.hall] ?? null : null,
        day, time,
        dish: ctx.mentionDishes && ctx.dishes.length ? ctx.dishes[0].trim().toLowerCase() : null,
        feeling: ctx.feeling,
    };
}

// Fill slots in a text. [optional parts] vanish if any slot inside is null.
// A null slot OUTSIDE brackets throws. An unknown slot name throws anywhere.
export function fill(text: string, v: Record<string, string | null>): string {
    const one = (s: string) => s.replace(/\{(\w+)\}/g, (text, k) => {
        if (!(k in v)) throw new Error(`unknown slot ${k}`);
        return v[k] ?? "\u0000";                       // a marker meaning "this slot was empty"
    });
    return text
        .replace(/\[([^\[\]]*)\]/g, (k, inner) => { const f = one(inner); return f.includes("\u0000") ? "" : f; })
        .replace(/\{(\w+)\}/g, (m) => { const f = one(m); if (f.includes("\u0000")) throw new Error(`missing required ${m}`); return f; });
}
// frame + " " + body, plus " " + the line for your choice (if there is one). Then squash spaces,
// remove a space before "." or ",", trim.
export function renderClue(t: ClueTemplate, ctx: ClueCtx, choice: string | null): string {
    const v = slotValues(ctx);
    const extra = choice && t.choiceLines?.[choice] ? ` ${t.choiceLines[choice]}` : "";
    return `${fill(t.frame, v)} ${t.body}${extra}`.replace(/\s+/g, " ").replace(/\s+([.,])/g, "$1").trim();
}