// src/core/dish.ts
import { LabelFacts } from "./labelParser";
import type { Hall } from "./router";

export type NewDish = {
  hall: "carm" | "dewick" | "hodge" | "kindlevan" | null;
  name: string;
  serving_size: string | null;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: "screenshot";
};

/** "" or junk → null; "22" → 22; " 1.6 " → 1.6 */
export function optionalNumber(s: string): number | null{
    const trimmed = s.trim();
    if (trimmed === "") return null;
    const number = Number(trimmed);
    return Number.isFinite(number) ? number : null;
}

export function toDishRow(facts: LabelFacts, name: string, hall: Hall): NewDish | null{

    const trimmed = name.trim();
    if(trimmed === "") return null;
    if(!Number.isFinite(facts.kcal) || facts.kcal < 0) return null;

    return {
        hall: hall === "outside" ? null : hall,
        name: trimmed,
        serving_size: facts.servingSize,
        kcal: facts.kcal,
        protein_g: facts.proteinG,
        carbs_g: facts.carbsG,
        fat_g: facts.fatG,
        source: "screenshot",
    };
}