export const THRESHOLDS = [1, 4, 8, 13, 19, 26, 34, 43];   // plates logged in total for clue 1..8

// "2026-10-29": the calendar day as it reads in that time zone
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);


// Which clue (1..8) this save earns, or null.
// Earned only by logging: never by calories, streaks or weight. At most one per local day.
export function nextClue(platesEver: number, found: number[], lastFoundAt: Date | null, now: Date, tz: string): number | null {

    // Validate first: the count has to be a whole number, 0 or more. You used the same check in recallAtK.
    if (!Number.isInteger(platesEver) || platesEver < 0) throw new Error("Plates must be a whole number, 0 or more");
    // Find the next clue: the lowest number from 1 to 8 that isn’t in found. findIndex over THRESHOLDS works. Remember that index 0 is clue 1.
   
    // 2. The lowest clue not found yet. Index 0 is clue 1.
    const i = THRESHOLDS.findIndex(((_, idx) => !found.includes(idx + 1)));
    // 3. All eight found: case closed
    if (i === -1) return null;

    // 4. Not enough plates logged yet for that clue
    if (platesEver < THRESHOLDS[i]) return null;

    // 5. Already found one today (your local day)
    if (lastFoundAt && dayIn(lastFoundAt, tz) === dayIn(now, tz)) return null;
    
    // 6. The clue number, not the index
    return i + 1;
}