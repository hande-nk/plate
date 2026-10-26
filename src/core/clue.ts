export const THRESHOLDS = [1, 4, 8, 13, 19, 26, 34, 43];   // plates logged in total for clue 1..8

// Which clue (1..8) this save earns, or null.
// Earned only by logging: never by calories, streaks or weight. At most one per local day.
export function nextClue(platesEver: number, found: number[], lastFoundAt: Date | null, now: Date, tz: string): number | null {
    throw new Error("TODO");
}