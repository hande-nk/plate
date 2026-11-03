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
  //                ( spaces  number      spaces oz  optional .  spaces )
    const m = part.match(/\(\s*(\d*\.?\d+)\s*oz\.?\s*\)/i);
    if (!m) return null;
    const oz = Number(m[1]);
    if (!Number.isFinite(oz) || oz <= 0) return null;
    return Math.round(oz * 28.35 * 10) / 10;
}
// From USDA search results, choose the food for this part.
// Ignore results whose kcal isn't a usable number. A part with a pack size wants "branded",
// any other part wants "generic". No match of that kind -> the first usable one. None -> null.
export function pickFood(foods: UsdaFood[], part: string): UsdaFood | null {
    const usable = foods.filter((f) => Number.isFinite(f.per100g.kcal) && f.per100g.kcal >= 0);
    const want = packSizeG(part) !== null ? "branded" : "generic";
    return usable.find((f) => f.kind === want) ?? usable[0] ?? null;
}

// Grams:  base = the pack size, else a branded food's label serving, else typicalG, else 100.
//         Multiply by the portion (light 0.75, normal 1, extra 1.5) UNLESS it's a pack (a sealed pack is a sealed pack).
//         Round grams to a whole number, then compute everything from those grams.
// kcal:   per100g.kcal x grams / 100, whole number.
// Range:  ±10% for a pack or branded food, ±25% for generic. low/high are whole numbers.
// Macros: per100g x grams / 100, 1 decimal; null stays null.
const MULT: Record<Portion, number> = { light: 0.75, normal: 1, extra: 1.5 };

export function estimatePart(food: UsdaFood, part: string, portion: Portion, typicalG: number | null): Estimate {
    const pack = packSizeG(part);
    const base = pack ?? (food.kind === "branded" && food.servingG ? food.servingG : typicalG ?? 100);
    const grams = Math.round(pack !== null ? pack : base * MULT[portion]);

    const f = grams / 100;
    const kcal = Math.round(food.per100g.kcal * f);
    const spread = pack !== null || food.kind === "branded" ? 0.1 : 0.25;
    const g1 = (x: number | null) => (x === null ? null : Math.round(x * f * 10) / 10);

    return {
      grams, kcal,
      low: Math.round(kcal * (1 - spread)),
      high: Math.round(kcal * (1 + spread)),
      protein_g: g1(food.per100g.protein),
      carbs_g: g1(food.per100g.carbs),
      fat_g: g1(food.per100g.fat),
      source: `USDA FDC ${food.fdcId}`,
    };
}