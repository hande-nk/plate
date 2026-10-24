//src/core/when.ts

export type When = "now" | "breakfast" | "lunch" | "dinner";

// the time to save as eaten_at
// never returns a time later than `now` 
export function eatenAt(when: When, now: Date): Date {
    throw new Error("TODO");
}

// the chips to show: "now" first, then only the meals whose time has passed
export function choicesFor(now: Date): When[] {
    throw new Error("TODO");
}
