//src/core/when.ts

export type When = "now" | "breakfast" | "lunch" | "dinner" | { at: string };

const MEAL_TIME = {
    breakfast: [8, 30],
    lunch: [12, 30],
    dinner: [18, 30],
} as const;


// the time to save as eaten_at
// never returns a time later than `now` 
export function eatenAt(when: When, now: Date): Date {
    if (when === "now") return new Date(now);

    let h: number;
    let m: number;

    if (typeof when === "object") {
        const match = /^(\d{1,2}):(\d{2})$/.exec(when.at);
        if (!match) throw new Error(`Not a time: ${when.at}`);
        h = Number(match[1]);
        m = Number(match[2]);
        if ( h < 0 || h > 23 || m < 0 || m > 59 ) throw new Error(`Not a time: ${when.at}`);
    } else {
        [h, m] = MEAL_TIME[when];
    }

    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    return d  > now ? new Date(now) : d;
}

// the chips to show: "now" first, then only the meals whose time has passed
export function choicesFor(now: Date): When[] {
    const out: When[] = ["now"];
    const meals = ["breakfast", "lunch", "dinner"] as const;

    for (const meal of meals) {
        if( eatenAt( meal, now ) < now ) out.push(meal);
    }
    return out;
}
