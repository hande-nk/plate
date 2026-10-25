export type Feeling = "energized" | "satisfied" | "heavy" | "hungry";
const GOOD: Feeling[] = ["energized", "satisfied"];

//one entry per plate  
// null if not answered yet
// good = energized + satisfied
//skipped plates don't count at all
// cpt is a whole number 0 to 100 or null when nothing is rated yet
export function feltGood(plates: (Feeling | null)[]): { good: number; rated: number; pct: number | null }{
    // keep only the plates that have an answer
    const rated = plates.filter((f): f is Feeling => f !== null);

    // of those how many felt good
    const good = rated.filter((f) => GOOD.includes(f) ).length;
    

    //nothing rated yer, no percentage
    if (rated.length === 0) return {good: 0, rated: 0, pct: null };

    //whole number percent
    return {good, rated: rated.length, pct: Math.round((good / rated.length) * 100)};
}