import { describe, it, expect } from "vitest";
import { protionFromCount, scaleDish } from "./portion";

describe("protionFromCount", () => {
    it("2 of 4 per serving is half", () => expect(protionFromCount(2, 4)).toBe(0.5));
    it("5 of 4 per serving is 1.25", () => expect(protionFromCount(5, 4)).toBe(1.25));
    it("3 of 1 per serving is 3", () => expect(protionFromCount(3, 1)).toBe(3));
    it("0 pieces is 0", () => expect(protionFromCount(0, 4)).toBe(0));
    it("rejects perServing of 0", () => expect(() => protionFromCount(2, 0)).toThrow());
    it("rejects a negative count", () => expect(() => protionFromCount(-1, 4)).toThrow());
    it("rejects half a piece", () => expect(() => protionFromCount(1.5, 4)).toThrow()); 
});

describe("scaleDish", () => {
    const falafel = { kcal: 320, protein_g: 12, carbs_g: 30, fat_g: 18};

    it("half a serving halves everything", () =>
        expect(scaleDish(falafel, 0.5)).toEqual({ kcal: 160, protein_g: 6, carbs_g: 15, fat_g: 9 }));

    it("one serving changes nothing", () =>
        expect(scaleDish(falafel, 1)).toEqual(falafel));

    it("unknown macros stay unknown", () =>
        expect(scaleDish({ kcal: 200, protein_g: null, carbs_g: 25, fat_g: null }, 2))
            .toEqual({ kcal: 400, protein_g: null, carbs_g: 50, fat_g: null }));

    it("a 0 g macro stays 0, not null", () =>
        expect(scaleDish({ kcal: 90, protein_g: 3, carbs_g: 20, fat_g: 0 }, 2))
            .toEqual({ kcal: 180, protein_g: 6, carbs_g: 40, fat_g: 0 }));

    it("rounds kcal to whole, macros to 1 decimal", () =>
        expect(scaleDish({ kcal: 215, protein_g: 7.4, carbs_g: 0.4, fat_g: 9 }, 1.5))
            .toEqual({ kcal: 323, protein_g: 11.1, carbs_g: 0.6, fat_g: 13.5 }));

    it.each([0, -1, NaN, Infinity])("rejects portion %s", (p) =>
        expect(() => scaleDish(falafel, p)).toThrow());
});