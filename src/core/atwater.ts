// src/core/atwater.ts
import type { LabelFacts } from "./labelParser";

// Atwater factors: kcal per gram
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export function atwaterKcal(f: { proteinG: number; carbsG: number; fatG: number }): number {
  return f.proteinG*KCAL_PER_G.protein + f.carbsG*KCAL_PER_G.carbs + f.fatG*KCAL_PER_G.fat;
}

/** Do the label's calories roughly match its macros? */
export function isPlausible(facts: LabelFacts, tolerance = 0.2, floorKcal = 10): boolean {
  const { kcal, proteinG, carbsG, fatG } = facts;
  if (proteinG === null || carbsG === null || fatG === null) return true;     // can't judge

  const expected = atwaterKcal({ proteinG, carbsG, fatG });
  const allowed = Math.max (expected*tolerance, floorKcal);                   // 20% of expected, or 10 kcal
  return Math.abs(kcal - expected) <= allowed;
}