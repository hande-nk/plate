export type Case = { truth: string[]; ranked: string[] };// truth = dishes really on the plate, ranked = CLIP's order

// share (0-1)of plates whose first suggestion is on the plate
// plates with noting market don't count
// null if no plates count
export function hitAt1(cases: Case[]): number | null {
    // filter out the plates with nothing marked
    const scored = cases.filter((c) => c.truth.length > 0 && c.ranked.length > 0);
    //for each plte check if truth includes ranked[0]
    if (scored.length === 0) return null;

    //return null before dividing
    const hits = scored.filter((c) => c.truth.includes(c.ranked[0])).length;

    return hits / scored.length;

}

// share (0-1 ) of true dishes, pooled across all plates fount in the first k
// a dish marked twice counts once
// null if there are no dishes
// throws id k isn't a positive intiger
export function recallAtK(cases: Case[], k: number): number | null {

    if (!Number.isInteger(k) || k < 1 ) throw new Error("k must be a positive intiger");

    let total = 0;
    let found = 0;
    for (const c of cases) {
        const top = c.ranked.slice(0, k);
        for (const dish of new Set(c.truth)) {
            total++;
            if(top.includes(dish)) found++;
        }
    }
    return total === 0 ? null : (found / total);
    

}