import { supabase } from "@/lib/supabase";

// Room per weekday (Mon..Sun) for planTreats: your daily target minus what you usually log on that weekday.
// Last 28 days, complete days only (2+ plates, same rule as the honesty check). Fewer than 2 such days -> null.
export async function weekdayRoom(target: number | null, tz: string): Promise<(number | null)[]> {
    if (target === null) return Array(7).fill(null);
    const since = new Date(Date.now() - 29 * 864e5).toISOString();
    const { data } = await supabase.from("meals").select("eaten_at, kcal, photo_key").gte("eaten_at", since);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    const days = new Map<string, { kcal: number; plates: Set<string> }>();
    for (const m of (data ?? []) as { eaten_at: string; kcal: number; photo_key: string | null }[]) {
        const d = fmt.format(new Date(m.eaten_at));
        const e = days.get(d) ?? { kcal: 0, plates: new Set<string>() };
        e.kcal += Number(m.kcal); e.plates.add(`${m.eaten_at}|${m.photo_key ?? ""}`); days.set(d, e);
    }
    const today = fmt.format(new Date());
    const byWeekday: number[][] = Array.from({ length: 7 }, () => []);
    for (const [d, e] of days) {
        if (d >= today || e.plates.size < 2) continue;
        byWeekday[(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7].push(e.kcal);
    }
    return byWeekday.map((xs) => (xs.length < 2 ? null : Math.round(target - xs.reduce((s, x) => s + x, 0) / xs.length)));
}