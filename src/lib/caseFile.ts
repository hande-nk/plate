import { supabase } from "@/lib/supabase";
import type { ClueCtx } from "@/core/story";
import type { Feeling } from "@/core/feel";

// One clue row as stored (migration 0008 + 0012).
export type ClueRow = {
    ord: number; title: string; body: string; frame: string; place: string | null;
    choice_prompt: string | null; choice_options: { id: string; label: string }[] | null;
    choice_lines: Record<string, string> | null; choice_from: number | null;
};
export type FoundClue = { clue: ClueRow; foundAt: string; plateAt: string | null; choice: string | null; ctx: ClueCtx | null; photoKey: string | null };

type MealRow = { eaten_at: string; dish_name: string; feeling: Feeling | null; place: string | null; photo_key: string | null; dishes: { hall: string | null } | { hall: string | null }[] | null };

// Everything the Case File and the clue sheet need, in one load.
export async function loadCase(): Promise<{ clues: ClueRow[]; found: FoundClue[]; choices: Map<number, string> }> {
    const [c, u, p] = await Promise.all([
        supabase.from("clues").select("ord, title, body, frame, place, choice_prompt, choice_options, choice_lines, choice_from").order("ord"),
        supabase.from("user_clues").select("clue_id, found_at, plate_at, choice").order("found_at"),
        supabase.from("profiles").select("tz, mention_dishes").maybeSingle(),
    ]);
    const clues = (c.data ?? []) as ClueRow[];
    const rows = (u.data ?? []) as { clue_id: number; found_at: string; plate_at: string | null; choice: string | null }[];
    const tz: string = p.data?.tz ?? "America/New_York";
    const mentionDishes = p.data?.mention_dishes !== false;

    const ats = rows.map((r) => r.plate_at).filter((x): x is string => Boolean(x));
    const meals = ats.length
        ? ((await supabase.from("meals").select("eaten_at, dish_name, feeling, place, photo_key, dishes(hall)").in("eaten_at", ats)).data ?? []) as MealRow[]
        : [];
    const byAt = new Map<string, MealRow[]>();
    for (const m of meals) { const k = new Date(m.eaten_at).toISOString(); byAt.set(k, [...(byAt.get(k) ?? []), m]); }

    const choices = new Map<number, string>();
    const found: FoundClue[] = [];
    for (const r of rows) {
        const clue = clues.find((x) => x.ord === r.clue_id);
        if (!clue) continue;
        if (r.choice) choices.set(clue.ord, r.choice);
        const plate = r.plate_at ? byAt.get(new Date(r.plate_at).toISOString()) ?? [] : [];
        const hallOf = (m: MealRow) => m.place ?? (Array.isArray(m.dishes) ? m.dishes[0]?.hall : m.dishes?.hall) ?? null;
        const ctx: ClueCtx | null = plate.length ? {
        at: plate[0].eaten_at, tz, mentionDishes,
        hall: plate.map(hallOf).find((h) => h) ?? null,
        dishes: plate.map((m) => m.dish_name),
        feeling: plate[0].feeling,
        } : null;
        found.push({ clue, foundAt: r.found_at, plateAt: r.plate_at, choice: r.choice, ctx, photoKey: plate.find((m) => m.photo_key)?.photo_key ?? null });
    }
    return { clues, found, choices };
}

export async function saveChoice(ord: number, choice: string) {
    return supabase.from("user_clues").update({ choice }).eq("clue_id", ord);
}