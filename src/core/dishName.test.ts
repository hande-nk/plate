import { describe, it, expect } from "vitest";
import { guessName } from "./dishName";

//Real Tesseract output fromthe Blackened Halal Chicken example
const chicken = `9:53 N\\ oul > (90
X
Blackened Halal <
Chicken
Serving Size 4 oz
|
Amount per serving
Calories 200`;

describe("guessName", () => {
    it("reads the real chicken screenshot", () => {
        expect(guessName(chicken)).toBe("Blackened Halal Chicken");
    });

    it("reads a one-line name", () => {
        expect(guessName("X\nAF O'Brien Potato\nServing Size 1 cup")).toBe("AF O'Brien Potato");
    });

    it("keeps symbols in the middle of a name", () => {
        expect(guessName("X\nMac & Cheese\nServing Size 6 oz")).toBe("Mac & Cheese");
    });

    it("drops the status bar line (starts with a time)", () => {
        expect(guessName("10:41 oul 5G\nLentil Soup\nServing Size 8 fl oz")).toBe("Lentil Soup");
    });

    it("strips icon junk from the ends of a line", () => {
        expect(guessName("© Pesto Pasta <\nServing Size 1 cup")).toBe("Pesto Pasta");
    });

    it("finds 'Serving Size' in any case", () => {
        expect(guessName("Rice\nSERVING SIZE 1 cup")).toBe("Rice");
    });

    it("returns null without a Serving Size line", () => {
        expect(guessName("Blackened Halal Chicken\nCalories 200")).toBeNull();
    });

    it("returns null when only junk sits above Serving Size", () => {
        expect(guessName("9:53 oul\nX\n|\nServing Size 4 oz")).toBeNull();
    });
    // Real OCR: this label has no Serving Size line, so stop at "Amount per serving".
    const muffin = `9:52 all T @
    X
    Egg & Cheese English  <
    Muffin
    |
    Amount per serving
    Calories 191`;

    describe("guessName without a Serving Size line", () => {
    it("reads the real egg muffin screenshot", () => {
        expect(guessName(muffin)).toBe("Egg & Cheese English Muffin");
    });
    });
});