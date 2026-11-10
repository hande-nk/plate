// T41a: "Missing something?" search on /log. Finds any dish in your library in two taps.
export type SearchDish = { id: number; name: string; hall: string | null };

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // drop accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")                                // anything else -> one space
    .trim();                                                     // ends
}

export function withinOne(a: string, b: string): boolean {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++edits > 1) return false;
        if (a.length > b.length) i++;        // a has the extra letter
        else if (a.length < b.length) j++;   // b has the extra letter
        else { i++; j++; }                   // swapped letter
    }
    // letters left over at the end also count as edits
    return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenScore(t: string, words: string[]): number {
    if (words.some((w) => w.startsWith(t))) return 2;                       // clean hit
    if (t.length >= 4 && words.some((w) => withinOne(t, w))) return 1;  // typo hit
    return 0;
}

export function searchDishes<T extends SearchDish>(
  query: string, dishes: T[],
  opts: { hall?: string | null; exclude?: number[]; limit?: number } = {},
): T[] {
    const q = normalize(query);
    if (!q) return [];
    const tokens = q.split(" ");
    const skip = new Set(opts.exclude ?? []);
    const limit = opts.limit ?? 8;
    const scored: { d: T; score: number; n: string }[] = [];
    for (const d of dishes) {
        if (skip.has(d.id)) continue;
        const n = normalize(d.name);
        const words = n.split(" ");
        let score: number;
        if (n === q) score = 100;
        else if (n.startsWith(q)) score = 80;
        else {
        const per = tokens.map((t) => tokenScore(t, words));
        if (per.some((p) => p === 0)) continue;           // a query word missed: dish is out
        score = per.every((p) => p === 2) ? 60 : 40;
        }
        if (opts.hall && d.hall === opts.hall) score += 10;
        scored.push({ d, score, n });
    }
    scored.sort((a, b) => b.score - a.score || a.n.length - b.n.length || a.n.localeCompare(b.n));
    return scored.slice(0, limit).map((s) => s.d);
}