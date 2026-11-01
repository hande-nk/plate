import { supabase } from "@/lib/supabase";
import { nextClue } from "@/core/clue";

// Same clue check /log runs after a save, shared so every way of logging counts the same.
// Returns the clue number earned, or null. A clue is a bonus: it never throws.
export async function clueAfterSave(userId: string, at: string): Promise<number | null> {
  try {
    const [{ data: plates }, { data: mine }, { data: prof }] = await Promise.all([
      supabase.from("meals").select("eaten_at, photo_key"),
      supabase.from("user_clues").select("clue_id, found_at").order("found_at", { ascending: false }),
      supabase.from("profiles").select("tz").maybeSingle(),
    ]);
    const platesEver = new Set((plates ?? []).map((m: { eaten_at: string; photo_key: string | null }) => `${m.eaten_at}|${m.photo_key ?? ""}`)).size;
    const found = (mine ?? []).map((c: { clue_id: number }) => c.clue_id);
    const last = mine?.[0] ? new Date(mine[0].found_at) : null;
    const earned = nextClue(platesEver, found, last, new Date(), prof?.tz ?? "America/New_York");
    if (!earned) return null;
    const { error } = await supabase.from("user_clues").insert({ user_id: userId, clue_id: earned, plate_at: at });
    return error ? null : earned;
  } catch {
    return null;
  }
}