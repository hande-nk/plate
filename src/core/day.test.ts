//test day

import { describe, it, expect } from "vitest";
import { dayTotals } from "./day";

describe("dayTotals", () => {
  it("an empty day is 0 kcal, macros unknown", () =>
    expect(dayTotals([])).toEqual({ kcal: 0, protein_g: null, carbs_g: null, fat_g: null }));

  it("adds up a plate", () =>
    expect(dayTotals([
      { kcal: 440, protein_g: 36, carbs_g: 20, fat_g: 22 },
      { kcal: 31, protein_g: 1.5, carbs_g: 2.5, fat_g: 2 },
    ])).toEqual({ kcal: 471, protein_g: 37.5, carbs_g: 22.5, fat_g: 24 }));

  it("skips missing macros, null only if all are missing", () =>
    expect(dayTotals([
      { kcal: 200, protein_g: null, carbs_g: 25, fat_g: null },
      { kcal: 100, protein_g: 4, carbs_g: 10, fat_g: null },
    ])).toEqual({ kcal: 300, protein_g: 4, carbs_g: 35, fat_g: null }));

  it("0 g stays 0, not null", () =>
    expect(dayTotals([{ kcal: 90, protein_g: 0, carbs_g: 20, fat_g: 0 }]))
      .toEqual({ kcal: 90, protein_g: 0, carbs_g: 20, fat_g: 0 }));

  it("rounds away float noise (0.1 + 0.2)", () =>
    expect(dayTotals([
      { kcal: 100, protein_g: 0.1, carbs_g: 0, fat_g: 0 },
      { kcal: 100, protein_g: 0.2, carbs_g: 0, fat_g: 0 },
    ])).toEqual({ kcal: 200, protein_g: 0.3, carbs_g: 0, fat_g: 0 }));
});