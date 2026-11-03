/*
 T30. Turn a USDA food (values per 100 g) + a part name + a portion into a calorie estimate.
 Plate always shows these as estimates ("≈ 215 kcal, 194 to 237"), never as facts.
*/

export type Per100 = { kcal: number; protein: number | null; carbs: number | null; fat: number | null };
export type UsdaFood = {
  fdcId: number;
  name: string;
  brand: string | null;
  kind: "branded" | "generic";   // branded = a real product label; generic = USDA's average food
  per100g: Per100;
  servingG: number | null;       // the label's serving in grams (branded only)
};
export type Portion = "light" | "normal" | "extra";
export type Estimate = {
  grams: number; kcal: number; low: number; high: number;
  protein_g: number | null; carbs_g: number | null; fat_g: number | null;
  source: string;                // "USDA FDC <fdcId>"
};

// "Sunchips Cheddar (1.5 oz)" -> 42.5. Grams = oz x 28.35, rounded to 1 decimal.
// Accepts "oz." and ".75". No "(... oz)" -> null (liters are drinks, not packs).
export function packSizeG(part: string): number | null {
    throw new Error("packSizeG");
}

// From USDA search results, choose the food for this part.
// Ignore results whose kcal isn't a usable number. A part with a pack size wants "branded",
// any other part wants "generic". No match of that kind -> the first usable one. None -> null.
export function pickFood(foods: UsdaFood[], part: string): UsdaFood | null {
    throw new Error("pickFood");
}

// Grams:  base = the pack size, else a branded food's label serving, else typicalG, else 100.
//         Multiply by the portion (light 0.75, normal 1, extra 1.5) UNLESS it's a pack (a sealed pack is a sealed pack).
//         Round grams to a whole number, then compute everything from those grams.
// kcal:   per100g.kcal x grams / 100, whole number.
// Range:  ±10% for a pack or branded food, ±25% for generic. low/high are whole numbers.
// Macros: per100g x grams / 100, 1 decimal; null stays null.
export function estimatePart(food: UsdaFood, part: string, portion: Portion, typicalG: number | null): Estimate {
    throw new Error("estimatePart");
}