export type Macros = {
    kcal: number;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
};

//How many servings were on the plate
//from a piece count
export function portionFromCount(count: number, perServing: number): number {
    if (count < 0 || !Number.isInteger(count)) {
        throw new Error("count must be a whole number, 0 or more");
    }
    if (!Number.isFinite(perServing) || perServing <= 0 ){
        throw new Error("perServing must be more than 0");
    }
    return count / perServing;
}

// scales one macro, null in - null out; otherwise multiply and round to 1 decimal
function scaleMacro(value: number | null, portion: number): number | null {
    if( value === null ) return null;
    return Math.round(value * portion * 10) / 10; 

}

//scale a dish's label number by how many servings you ate
export function scaleDish(dish: Macros, portion: number): Macros {
    if(!Number.isFinite(portion) || portion <= 0) {
        throw new Error("portion must be more than 0");
    }
    return {
        kcal: Math.round(dish.kcal * portion),
        protein_g: scaleMacro(dish.protein_g, portion),
        carbs_g: scaleMacro(dish.carbs_g, portion),
        fat_g: scaleMacro(dish.fat_g, portion),
    };
}