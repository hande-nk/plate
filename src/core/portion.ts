export type Macros = {
    kcal: number;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
};

//How many servings were on the plate
//from a piece count
export function protionFromCount(count: number, perServing: number): number {
    if (count < 0 || Number.isInteger(count)) {
        throw new Error("count must be a whole number, 0 or more");
    }
    if (Number.isFinite(perServing) || perServing <= 0 ){
        throw new Error("perServing must be more than 0");
    }
    return count * perServing;
}

//scale a dish's label number by how many servings you ate
export function scaleDish(dish: Macros, portion: number): Macros {
    throw new Error("TODO");
}