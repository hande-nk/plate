// "Eat for how you feel": suggest dishes for your goals, learned from the feeling you log after eating.
export type Goal = "energy" | "recovery" | "focus" | "comfort";
export type SDish = { id: number; name: string; hall: string | null };
// One rated plate: every dish on it, the feeling you tapped after eating (or null), when you ate.
export type FeltPlate = { dishIds: number[]; feeling: string | null; at: string };
export type Suggestion<T> = { dish: T; wins: number; tries: number; score: number; kind: "worked" | "new" };


// Fisher-Yates, from the end: for i = last index down to 1, pick j = floor(rand() * (i + 1)), swap a[i] and a[j].
// Return a NEW array; never touch the input.
export function shuffled<T>(arr: T[], rand: () => number): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// For each dish: tries = rated plates it was on, wins = plates whose feeling hits ANY chosen goal.
// A feeling "hits" goal g when it's in hits[g].
// Count only plates with a feeling, eaten between (now - days) and now, both ends included.
// A dish listed twice on one plate counts once for that plate.
const DAY = 864e5;   // ms in a day

export function dishStats(
  plates: FeltPlate[], goals: Goal[], hits: Record<Goal, string[]>, now: Date, days = 60,
): Map<number, { wins: number; tries: number }> {
  const good = new Set(goals.flatMap((g) => hits[g]));          // every feeling that counts as a win
  const from = now.getTime() - days * DAY;                         // the oldest moment that still counts
  const stats = new Map<number, { wins: number; tries: number }>();
  for (const p of plates) {
    if (p.feeling === null) continue;                                      // no feeling tapped
    const t = new Date(p.at).getTime();
    if (t < from || t > now.getTime()) continue;                          // too old, or in the future
    const win = good.has(p.feeling);
    for (const id of new Set(p.dishIds)) {                        // a repeated dish counts once
      const s = stats.get(id) ?? { wins: 0, tries: 0 };
      s.tries++;
      if (win) s.wins++;
      stats.set(id, s);
    }
  }
  return stats;
}



// 1. No goals -> []. limit defaults to 3.
// 2. Pool = dishes at o.hall (every dish when hall is null/undefined).
// 3. Tried dishes: score = (wins + 1) / (tries + 2). Keep only score > 0.5 as "worked".
//    Sort worked: score high -> low, then more tries, then name A -> Z.
// 4. Untried dishes are "new" (score 0.5, wins 0, tries 0), in pool order, shuffled with o.rand.
// 5. Fill: up to (limit - 1) worked, then new ones until limit, then more worked if still short.
export function suggestDishes<T extends SDish>(o: {
  goals: Goal[]; dishes: T[]; plates: FeltPlate[]; hits: Record<Goal, string[]>;
  now: Date; hall?: string | null; limit?: number; rand: () => number;
}): Suggestion<T>[] {
  if (o.goals.length === 0) return [];
  const limit = o.limit ?? 3;
  const pool = o.hall ? o.dishes.filter((d) => d.hall === o.hall) : o.dishes;
  const stats = dishStats(o.plates, o.goals, o.hits, o.now);

  const worked: Suggestion<T>[] = [];
  const fresh: T[] = [];                                    // never rated yet
  for (const d of pool) {
    const s = stats.get(d.id);
    if (!s) { fresh.push(d); continue; }
    const score = (s.wins + 1) / (s.tries + 2);
    if (score > 0.5) worked.push({ dish: d, wins: s.wins, tries: s.tries, score, kind: "worked" });
  }
  worked.sort((a, b) => b.score - a.score || b.tries - a.tries || a.dish.name.localeCompare(b.dish.name));

  const out = worked.slice(0, limit - 1);                         // leave one slot for something new
  for (const d of shuffled(fresh, o.rand)) {
    if (out.length >= limit) break;
    out.push({ dish: d, wins: 0, tries: 0, score: 0.5, kind: "new" });
  }
  for (const w of worked.slice(limit - 1)) {                // still short? more worked ones
    if (out.length >= limit) break;
    out.push(w);
  }
  return out;
}