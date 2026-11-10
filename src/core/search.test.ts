import { describe, it, expect } from "vitest";
import { normalize, withinOne, searchDishes, type SearchDish } from "./search";

const D: SearchDish[] = [
    { id: 1, name: "Broccoli", hall: "Dewick" },
    { id: 2, name: "Roasted Broccoli", hall: "Carm" },
    { id: 3, name: "Chicken Cutlet", hall: "Dewick" },
    { id: 4, name: "Chicken Tikka Masala", hall: "Carm" },
    { id: 5, name: "Hummus", hall: "Dewick" },
    { id: 6, name: "Crêpe with Nutella", hall: null },
    { id: 7, name: "Tzatziki Sauce", hall: "Dewick" },
    { id: 8, name: "Basmati Rice", hall: "Carm" },
    { id: 9, name: "Brown Rice", hall: "Dewick" },
    { id: 10, name: "Rice Krispies Treat", hall: "Hodgdon" },
];
const ids = (r: SearchDish[]) => r.map((d) => d.id);

describe("normalize", () => {
    it("lowercases, drops accents and punctuation, collapses spaces", () => {
        expect(normalize("  Crêpe w/ NUTELLA!! ")).toBe("crepe w nutella");
        expect(normalize("Mac & Cheese")).toBe("mac cheese");
    });
    it("keeps numbers", () => {
        expect(normalize("7-Grain Bread")).toBe("7 grain bread");
    });
});

describe("withinOne", () => {
    it("same word, one swap, one extra, one missing", () => {
        expect(withinOne("rice", "rice")).toBe(true);
        expect(withinOne("brocoli", "broccoli")).toBe(true);   // missing letter
        expect(withinOne("hummus", "humus")).toBe(true);       // extra letter
        expect(withinOne("tikka", "tikki")).toBe(true);        // one swap
    });
    it("two edits or length gap of 2 is too far", () => {
        expect(withinOne("brocli", "broccoli")).toBe(false);
        expect(withinOne("rice", "ricotta")).toBe(false);
        expect(withinOne("cat", "dog")).toBe(false);
    });
    it("edit at the very end or start", () => {
        expect(withinOne("rices", "rice")).toBe(true);
        expect(withinOne("xrice", "rice")).toBe(true);
    });
});

describe("searchDishes", () => {
    it("blank query gives nothing", () => {
        expect(searchDishes("   ", D)).toEqual([]);
        expect(searchDishes("!!", D)).toEqual([]);
    });
    it("prefix of any word matches, every query word must match", () => {
        expect(ids(searchDishes("chick", D))).toEqual([3, 4]);
        expect(ids(searchDishes("chick tik", D))).toEqual([4]);
        expect(searchDishes("chicken pizza", D)).toEqual([]);
    });
    it("exact > starts-with > word prefixes, then shorter name", () => {
        // "broccoli" exact (1), "roasted broccoli" word prefix (2)
        expect(ids(searchDishes("broccoli", D))).toEqual([1, 2]);
        // all three are word-prefix or starts-with: "rice krispies" starts with "rice" -> first
        expect(ids(searchDishes("rice", D))).toEqual([10, 9, 8]);
    });
    it("one typo still finds it (words of 4+ letters only), ranked below clean hits", () => {
        expect(ids(searchDishes("brocoli", D))).toEqual([1, 2]);
        expect(ids(searchDishes("humus", D))).toEqual([5]);
        expect(ids(searchDishes("rive", D))).toEqual([9, 8, 10]);  // all typo hits: shortest name first
        expect(searchDishes("ric", D).length).toBe(3);         // prefix, not typo
        expect(searchDishes("rcie", D)).toEqual([]);            // two edits
    });
    it("same hall gets a nudge up, but never above a better kind of match", () => {
        // hall Carm: Basmati Rice (Carm) beats Brown Rice; Rice Krispies still first (starts-with 80 > 60+10)
        expect(ids(searchDishes("rice", D, { hall: "Carm" }))).toEqual([10, 8, 9]);
        expect(ids(searchDishes("broccoli", D, { hall: "Carm" }))).toEqual([1, 2]);
    });
    it("accents in names or the query don't matter", () => {
        expect(ids(searchDishes("crepe", D))).toEqual([6]);
        expect(ids(searchDishes("CRÊPE nut", D))).toEqual([6]);
    });
    it("skips dishes already picked", () => {
        expect(ids(searchDishes("chicken", D, { exclude: [3] }))).toEqual([4]);
    });
    it("limit caps the list (default 8)", () => {
        const many = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, name: `Soup ${i}`, hall: null }));
        expect(searchDishes("soup", many).length).toBe(8);
        expect(searchDishes("soup", many, { limit: 3 }).length).toBe(3);
    });
    it("ties on score and length go alphabetical", () => {
        const t = [{ id: 1, name: "Pear Tart", hall: null }, { id: 2, name: "Peach Tart", hall: null }, { id: 3, name: "Plum Tart", hall: null }];
        expect(ids(searchDishes("tart", t))).toEqual([1, 3, 2]);   // Pear, Plum (9 letters), then Peach (10)
    });
    it("keeps the caller's extra fields", () => {
        const r = searchDishes("hum", [{ id: 5, name: "Hummus", hall: "Dewick", kcal: 70 }]);
        expect(r[0].kcal).toBe(70);
    });
});