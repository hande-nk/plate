export type DayStatus = "in" | "above" | "below" | "logged" | "none" | "open";
export type DayBar = { label: string; date: string; kcal: number | null; status: DayStatus };

// weekOf = that Monday as "YYYY-MM-DD". target = your dailyRange target, or null when just tracking.
// Band = target ± 10%, rounded. Today and later days are "open". No meals = "none" (kcal null), never 0.
export function weekCalories(meals: { eaten_at: string; kcal: number }[], weekOf: string, now: Date, tz: string,
  target: number | null): { days: DayBar[]; inRange: number; counted: number } {
    throw new Error("TODO");
  }