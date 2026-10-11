import { describe, it, expect} from "vitest";
import { optionalNumber, toDishRow } from "./dish";
import type { LabelFacts } from "./labelParser";

//The Blackend Halal Chicken Label
const chicken: LabelFacts = {
    kcal: 200,
    servingSize: "4 oz",
    proteinG: 22,
    carbsG: 0,
    fatG:12,
};

describe("toDishRow", () => {
    it("builds a full row with snake_case names", () => {
        expect(toDishRow(chicken, "Blackened Halal Chicken", "dewick" )).toEqual({
            hall: "dewick",
            name: "Blackened Halal Chicken",
            serving_size: "4 oz",
            kcal: 200,
            protein_g: 22,
            carbs_g: 0,
            fat_g: 12,
            source: "screenshot",
        });
    });
    
    it("trims the name", () => {
        expect(toDishRow(chicken, "  AF O'Brien Potato  ", "carm")?.name).toBe("AF O'Brien Potato");
    });

    it.each(["", "   "])("returns null for an empty name (%j)", (name) => {
        expect(toDishRow(chicken, name, "carm")).toBeNull();
    });

    it("turns 'outside' into a null hall", () => {
        expect(toDishRow(chicken, "Clif Bar", "outside")?.hall).toBeNull();
    });

    it("keeps a zero macro as 0, not null", () => {
        expect(toDishRow(chicken, "Chicken", "dewick")?.carbs_g).toBe(0);
    });

    it("keeps a missing macro as null, not 0", () => {
        const noProtein = { ...chicken, proteinG: null };
        expect(toDishRow(noProtein, "Chicken", "dewick")?.protein_g).toBeNull();
    });

    // kcal comes from an input you can edit, so it can arrive broken.
    it.each([NaN, -5, Infinity])("returns null when kcal is %s", (kcal) => {
        expect(toDishRow({ ...chicken, kcal }, "Chicken", "dewick")).toBeNull();
    });

    it("allows 0 kcal (black coffee is real)", () => {
        expect(toDishRow({ ...chicken, kcal: 0 }, "Coffee", "carm")?.kcal).toBe(0);
    });
});

describe("optionalNumber", () => {
  it.each([["22", 22], [" 1.6 ", 1.6], ["0", 0]])("%j → %s", (s, n) => {
    expect(optionalNumber(s)).toBe(n);
  });
  it.each(["", "   ", "abc"])("%j → null", (s) => {
    expect(optionalNumber(s)).toBeNull();
  });
});