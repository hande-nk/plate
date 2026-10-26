import { bmr, tdee, calorieTarget, proteinRange, dailyDeficit, type Profile, type Pace} from "./energy";

export type PaceChoice = Pace | "track";

export type DailyRange = {
    target: number | null;
    maintenance: number; //TDEE rounded
    resting: number; //BMR rounded (the min)
    protein: { min: number; max: number}; 
    floored: boolean; //when pace < resting

};

// Everything in Profile except weight, plus the latest weigh-in (null if none yet).
// null weight = null (the card says "Log a weigh-in to see your range").
// Throws if weight isn't a positive number.
export function dailyRance(body: Omit<Profile, "weightKg">, wightKg: number | null, page: PaceChoice): DailyRange | null {
    throw new Error("TODO");
}