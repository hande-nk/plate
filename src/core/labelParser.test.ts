import { describe, it, expect } from "vitest";
import { parseLabel } from "./labelParser";

describe("label parser", () => {
  it("reads a clean label", () => {
    const text = `Nutrition Facts
Serving size 1 bar (68g)
Calories 250
Total Fat 6g 8%
Total Carbohydrate 43g 16%
Protein 10g`;
    expect(parseLabel(text)).toEqual({ kcal: 250, servingSize: "1 bar (68g)", proteinG: 10, carbsG: 43, fatG: 6 });
  });

  it("survives common OCR mistakes", () => {
    const text = `Nutr1tion Facts
Serving Size 2 cookies (30g)
Calor1es 14O
Total Fat 7 g
Sodium 95mg
Total Carbohydrate 19q
  Dietary Fiber 1g
  Total Sugars 10g
Prote in 2g`;
    const r = parseLabel(text)!;
    expect(r.kcal).toBe(140);
    expect(r.carbsG).toBe(19);
    expect(r.proteinG).toBe(2);
    expect(r.fatG).toBe(7);
  });

  it("does not confuse 'Calories from Fat' or '% Daily Value' numbers", () => {
    const text = `Calories 200  Calories from Fat 80
Total Fat 9g 12%
Saturated Fat 1.5g
Total Carbohydrate 26g 9%`;
    const r = parseLabel(text)!;
    expect(r.kcal).toBe(200);
    expect(r.fatG).toBe(9);
    expect(r.carbsG).toBe(26);
  });

  it("keeps decimals", () => {
    expect(parseLabel("Calories 90\nProtein 2.5g")!.proteinG).toBe(2.5);
  });

  it("returns null with no calories", () => {
    expect(parseLabel("INGREDIENTS: oats, honey, almonds")).toBeNull();
  });
  it("fixes ounces OCR'd as 0z", () => {
    expect(parseLabel("Serving Size 40z\nCalories 104")!.servingSize).toBe("4 oz");
  });

  it("drops a stray slash inside calories", () => {
    expect(parseLabel("Calories 15/7")!.kcal).toBe(157);
  });

  it("keeps real fractions in the serving size", () => {
    expect(parseLabel("Serving Size 1/2 cup\nCalories 90")!.servingSize).toBe("1/2 cup");
  });

  it.each([
    ["40Zz", "4 oz"],
    ["1 0Z", "1 oz"],
    ["40z",  "4 oz"],
  ])("normalizes ounce OCR %s → %s", (raw, want) => {
    expect(parseLabel(`Serving Size ${raw}\nCalories 100`)!.servingSize).toBe(want);
  });
});
