// The math lives in the science doc "Plate: How It Helps You Lose Body Fat".
// Mifflin-St Jeor (1990): BMR = 10w + 6.25h - 5a + s, s = +5 (male) or -161 (female)

export type Sex = "female" | "male";
export type Activity = "light" | "moderate" | "active"; // PAL 1.45 / 1.55 / 1.75
export type Pace = "gentle" | "steady";                  // 0.25 / 0.5 kg per week

export interface Profile {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activity: Activity;
}

export const KCAL_PER_KG = 7700;

/** bmr: Basal metabolic rate, kcal/day.
 *  Input: weight in kg, height in cm, age in years, sex.
 *  Output: kcal/day, rounded to 2 decimal places.
 * 
*/
export function bmr(p: Profile): number {
  //accordign to Mifflin-St Jeor male and female 
  //calculations differ. Thus, we first check the sex
  //10w + 6.25h − 5a + s, where s is +5 for men and −161 for women
  const s = p.sex === "male" ? 5 : -161;
  return  10*p.weightKg + 6.25*p.heightCm - 5*p.ageYears + s;
}

/** tdee: Total daily energy, kcal/day = BMR x PAL. 
 * Input: Profile object with activity level.
 * Output: kcal/day, rounded to 2 decimal places.
 */
export function tdee(p: Profile): number {
  //if the activity level is light, we multiply by 1.45, if moderate by 1.55, and if active by 1.75
  const pal = p.activity === "light" ? 1.45 : p.activity === "moderate" ? 1.55 : 1.75;
  //we multiply activity score with bmr to get the total daily energy expenditure
  return bmr(p) * pal;
}

/** dailyDeficit: Daily deficit for a pace, kcal/day = pace(kg/week) x 7700 / 7. 
 * Input: pace ("gentle" = 0.25 kg/week, "steady" = 0.5 kg/week).
 * Output: kcal/day, rounded to the nearest whole number.
*/
export function dailyDeficit(pace: Pace): number {
  //we first check the pace, if it is gentle we set the paceKgPerWeek to 0.25, if it is steady we set it to 0.5
  const paceKgPerWeek = pace === "gentle" ? 0.25 : 0.5;
  //we then multiply the paceKgPerWeek with KCAL_PER_KG and divide by 7 to get the daily deficit
  return Math.round(paceKgPerWeek * KCAL_PER_KG / 7);
}

/**
 * calorieTarget: Daily calorie target. Rule from the doc: never below BMR.
 * Round to the nearest whole kcal.
 * Input: Profile object and pace.
 * Output: kcal/day, rounded to the nearest whole number.
 */
export function calorieTarget(p: Profile, pace: Pace): number {
  //we first calculate the target by subtracting the daily deficit from the total daily energy expenditure
  const target = tdee(p) - dailyDeficit(pace);
  //we then return the maximum of the target and the basal metabolic rate to ensure that the target is never below BMR
  return Math.round(Math.max(target, bmr(p)));
}

/** Protein range in grams/day: 1.2 to 1.6 g per kg, rounded. 
 * Input: Profile object.
 * Output: { min: number, max: number } in grams/day, rounded to the nearest whole number.
*/
export function proteinRange(p: Profile): { min: number; max: number } {
  const min = Math.round(p.weightKg * 1.2);
  const max = Math.round(p.weightKg * 1.6);
  return { min, max };
}
