//src/core/day.ts
// one function adds uo a day's meals. 
//similar logic to scaleDish

import type { Macros } from "./portion";

type MacroKey = "protein_g" | "carbs_g" | "fat_g";

function sumMacro(meals: Macros[], key: MacroKey): number | null {
    // 1. pull out this macro from every meal
    const values = meals.map((m) => m[key]);
    //2. keep only the known numbers
    const known = values.filter((v): v is number => (v !== null)  );
    //3. nothing known means unknown
    if(known.length === 0) return null;

    //4. add them up and round to 1 decimal
    const total = known.reduce((sum, v) => sum + v, 0);
    return Math.round(total * 10) / 10;
}

//totals for a list of loged meals
// kcal: whole number Macros:  1 decimal
//a macro is null only if every meal is missing it
export function dayTotals(meals: Macros[]): Macros {
    return {
        kcal: Math.round(meals.reduce((sum, m) => sum + m.kcal, 0)),
        protein_g: sumMacro(meals, "protein_g"),
        carbs_g: sumMacro(meals, "carbs_g"),
        fat_g: sumMacro(meals, "fat_g"),


    }
}
