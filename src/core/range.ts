import { bmr, tdee, calorieTarget, proteinRange, dailyDeficit, type Profile, type Pace} from "./energy";

export type PaceChoice = Pace | "track";

export type DailyRange = {
    target: number | null;
    maintenance: number; //TDEE rounded
    resting: number; //BMR rounded (the min)
    protein: { min: number; max: number}; 
    floored: boolean; // true when the pace would have gone below resting

};

// Everything in Profile except weight, plus the latest weigh-in (null if none yet).
// null weight = null (the card says "Log a weigh-in to see your range").
// Throws if weight isn't a positive number.
export function dailyRange(body: Omit<Profile, "weightKg">, weightKg: number | null, pace: PaceChoice): DailyRange | null {
    // 1. no weigh in yet
    if(weightKg === null) return null;

    // 2. a weigh that can't be real
    if (!(weightKg > 0)) throw new Error("weight must be a positive number");

    //3. full profile for the energy funtion
    const p: Profile = {weightKg: weightKg, heightCm: body.heightCm, ageYears: body.ageYears, sex: body.sex, activity: body.activity};

    //4. the two numbers every pce shows
    const resting = Math.round(bmr(p));
    const maintenance = Math.round(tdee(p));
    const protein = proteinRange(p);

    //5. just racking: no target
    if (pace === "track") return { target: null, maintenance, resting, protein, floored: false};

    //6. gentle or steady
    const target = calorieTarget(p, pace);
    const floored = (maintenance - dailyDeficit(pace)) < target;
    

    return { target, maintenance, resting, protein, floored };

}