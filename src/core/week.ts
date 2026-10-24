//src/core/week.ts

//Monday 00:00 of the week that `now` is in, in the phone's time zone
export function startOfWeek(now: Date): Date{
    //Date(2026, 9, day, hour, min);
    const d: Date = new Date(now);
    d.setDate(d.getDate() - ((now.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
}

//pLATES LOGGED BEFORE THE CUTOFF HOUR (DEFAULT 6PM), this week only
// days[0] = monday ... days[6] = Sunday; ture if that day had at least one
export function weekWins(plateTimes: Date[], now: Date, cutoffHour = 18): { count: number; days: boolean[] } {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const days = [false, false, false, false, false, false, false];
    let count = 0;

    for (const t of plateTimes) {
        if(t < start || t >= end || t.getHours() >= cutoffHour) continue;
        count++;
        days[(t.getDay() + 6) % 7] = true;
    }
    return { count, days };
}