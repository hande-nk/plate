// T41a: "Missing something?" search on /log. Finds any dish in your library in two taps.
export type SearchDish = { id: number; name: string; hall: string | null };

// Lowercase, strip accents (crêpe -> crepe), turn anything that isn't a-z or 0-9 into a space,
// collapse runs of spaces, trim.  Hint: s.normalize("NFD") splits "ê" into "e" + an accent mark (̀-ͯ).
export function normalize(s: string): string {
  throw new Error();
}

// true when a and b are at most ONE edit apart: one letter changed, added, or removed.
// Do it in one pass with two pointers (no edit-distance table).
// If the lengths differ by more than 1, it's false right away.
export function withinOne(a: string, b: string): boolean {
  throw new Error();
}

// Search rules, after normalize() on both sides:
// - blank query -> []
// - skip ids in opts.exclude (dishes already picked)
// - score each dish:
//     name === query                    100
//     name starts with query            80
//     else, split both into words. EVERY query word must hit some name word:
//       prefix of a name word = clean hit; else withinOne with a name word (query word 4+ letters) = typo hit;
//       otherwise the dish is out.
//     all clean hits                    60
//     any typo hit                      40
// - same hall as opts.hall: +10
// - sort: score high to low, then shorter normalized name, then alphabetical
// - return at most opts.limit (default 8), as the original objects (keep extra fields)
export function searchDishes<T extends SearchDish>(
  query: string,
  dishes: T[],
  opts: { hall?: string | null; exclude?: number[]; limit?: number } = {},
): T[] {
  throw new Error();
}