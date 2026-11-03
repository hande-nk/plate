import { describe, it, expect } from "vitest";
import { packSizeG, pickFood, estimatePart, type UsdaFood } from "./estimate";

const chips: UsdaFood = { fdcId: 111, name: "SUNCHIPS HARVEST CHEDDAR", brand: "Frito-Lay", kind: "branded", per100g: { kcal: 500, protein: 7.1, carbs: 64.3, fat: 21.4 }, servingG: 28 };
const cheddar: UsdaFood = { fdcId: 222, name: "Cheese, cheddar", brand: null, kind: "generic", per100g: { kcal: 403, protein: 24.9, carbs: 1.3, fat: 33.1 }, servingG: null };
const cutlet: UsdaFood = { fdcId: 333, name: "Chicken breast, breaded, fried", brand: null, kind: "generic", per100g: { kcal: 260, protein: 24, carbs: 10, fat: null }, servingG: null };
const bar: UsdaFood = { fdcId: 444, name: "RICE KRISPIES TREATS", brand: "Kellogg", kind: "branded", per100g: { kcal: 410, protein: 2.6, carbs: 79.5, fat: 9 }, servingG: 22 };

describe("packSizeG", () => {
    it("reads ounces in parentheses as grams (1 oz = 28.35 g, 1 decimal)", () => {
        expect(packSizeG("Sunchips Cheddar (1.5 oz)")).toBe(42.5);
        expect(packSizeG("Welchs Island Fruit Snack (2.25 oz)")).toBe(63.8);
    });
    it("handles 'oz.' and a missing leading zero", () => {
        expect(packSizeG("Rice Crispy Treat Original (1.3 oz.)")).toBe(36.9);
        expect(packSizeG("Mini bag (.75 oz)")).toBe(21.3);
    });
    it("null without an oz size (liters are drinks, not packs)", () => {
        expect(packSizeG("Chicken Cutlet")).toBeNull();
        expect(packSizeG("Poland Springs Bottled Water (.5 lt)")).toBeNull();
    });
});

describe("pickFood", () => {
    it("a part with a pack size wants the branded food", () => {
        expect(pickFood([cheddar, chips], "Sunchips Cheddar (1.5 oz)")?.fdcId).toBe(111);
    });
    it("a deli part wants the generic food", () => {
        expect(pickFood([chips, cheddar], "Sharp Cheddar")?.fdcId).toBe(222);
    });
    it("falls back to the first usable result, null when none", () => {
        expect(pickFood([chips], "Sharp Cheddar")?.fdcId).toBe(111);
        expect(pickFood([], "Sharp Cheddar")).toBeNull();
    });
    it("skips results with no usable calories", () => {
        const broken = { ...cheddar, fdcId: 9, per100g: { ...cheddar.per100g, kcal: NaN } };
        expect(pickFood([broken, cheddar], "Sharp Cheddar")?.fdcId).toBe(222);
    });
});

describe("estimatePart", () => {
    it("packaged: uses the pack size (rounded to whole grams, kcal from those grams), ignores light/extra, ±10%", () => {
        const e = estimatePart(chips, "Sunchips Cheddar (1.5 oz)", "extra", null);
        expect(e).toMatchObject({ grams: 43, kcal: 215, low: 194, high: 237, source: "USDA FDC 111" });
    });
    it("branded without a pack size: uses the label serving", () => {
        expect(estimatePart(bar, "Rice Crispy Treat Original", "normal", null)).toMatchObject({ grams: 22, kcal: 90 });
    });
    it("deli part: typical grams x portion, ±25%", () => {
        expect(estimatePart(cheddar, "Sharp Cheddar", "normal", 28)).toMatchObject({ grams: 28, kcal: 113, low: 85, high: 141 });
        expect(estimatePart(cheddar, "Sharp Cheddar", "light", 28)).toMatchObject({ grams: 21, kcal: 85 });
        expect(estimatePart(cheddar, "Sharp Cheddar", "extra", 28)).toMatchObject({ grams: 42, kcal: 169 });
    });
    it("no typical portion known: 100 g", () => {
        expect(estimatePart(cutlet, "Chicken Cutlet", "normal", null)).toMatchObject({ grams: 100, kcal: 260 });
    });
    it("macros scale with grams to 1 decimal, and null stays null", () => {
        const e = estimatePart(cutlet, "Chicken Cutlet", "normal", 85);
        expect(e).toMatchObject({ protein_g: 20.4, carbs_g: 8.5, fat_g: null });
    });
});