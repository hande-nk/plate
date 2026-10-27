export type HungerInput = { kind: "hungry" | "dessert"; now: Date; lastPlateAt: Date | null;
  platesToday: number; plannedTreat: { name: string; eaten: boolean } | null; tz: string };

export type HungerPath = { path: "eat"; reason: "long-gap" | "low-day" }
  | { path: "wait"; minutesSincePlate: number } | { path: "planned"; treat: string };


// The hour (0 to 23) as the clock reads in that time zone
function localHour(d: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(d));
}

export function hungerCheck(i: HungerInput): HungerPath {
    // 1. Dessert, and today's treat is planned but not eaten yet
    if (i.kind == "dessert" && i.plannedTreat !== null && !i.plannedTreat.eaten) return { path: "planned", treat: i.plannedTreat.name };

    // 2. Minutes since the last plate (null if there was none today)
    const mins = i.lastPlateAt === null
        ? null
        : Math.max(0, Math.floor((i.now.getTime() - i.lastPlateAt.getTime() ) / 60000));

    // 3. Long gap: no plate yet, or 3 hours or more
    if (mins === null || mins >= 180 ) return { path: "eat", reason: "long-gap" };

    // 4. Light day: fewer than two plates and it's 3pm or later where you are
    if (i.platesToday < 2 && localHour(i.now, i.tz) >= 15) return { path: "eat", reason: "low-day" };

    // 5. Everything else: the optional ten-minute wait
    return { path: "wait", minutesSincePlate: mins };
}