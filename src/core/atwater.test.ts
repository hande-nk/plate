import { describe, it, expect } from "vitest";
import { atwaterKcal, isPlausible } from "./atwater";

const rice = { kcal: 157, servingSize: "4 oz", proteinG: 3, carbsG: 32, fatG: 1.4 };

describe("atwater", () => {
  it("computes 4P + 4C + 9F", () => {
    expect(atwaterKcal({ proteinG: 3, carbsG: 32, fatG: 1.4 })).toBeCloseTo(152.6, 1);
  });

  it("accepts real Tufts labels", () => {
    expect(isPlausible(rice)).toBe(true);
    expect(isPlausible({ kcal: 56, servingSize: "1 oz", proteinG: 1, carbsG: 1, fatG: 6 })).toBe(true); // sour cream, 11% off
  });

  it("catches an OCR misread", () => {
    expect(isPlausible({ ...rice, kcal: 15 })).toBe(false);
  });

  it("can't judge when a macro is missing", () => {
    expect(isPlausible({ ...rice, proteinG: null })).toBe(true);
  });

  it("doesn't divide by zero near 0 kcal", () => {
    expect(isPlausible({ kcal: 4, servingSize: "1 oz", proteinG: 0, carbsG: 1, fatG: 0 })).toBe(true);   // romaine
    expect(isPlausible({ kcal: 0, servingSize: null, proteinG: 0, carbsG: 0, fatG: 0 })).toBe(true);     // water
  });
});