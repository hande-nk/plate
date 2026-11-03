import { describe, it, expect } from "vitest";
import { parseConfirm } from "./order";

// Real Tesseract output of Naz's Hodgdon "Confirm order" screenshot (Nov 3, 2026).
const CONFIRM = `1:39 7 eal > 73

< CONFIRM ORDER

Hoos Hodgdon Food-On-The-Run Pick up in
DON etait 72 min

Deli Lunch Meal Deal

Hodge Podge BYO Sando $15.89
Gluten-Free Wrap
Tuna Salad
Sharp Cheddar
Green Goddess
Mixed Greens
Shredded Lettuce
Toasted (Not gluten free)
Sunchips Cheddar (1.5 02)
Poland Springs Bottled Water (.5 It)

Subtotal $15.89

Tax

Total $15.89

Campus Card

Lunch Meal Equivalency $15.89

PAY 1 LUNCH MEAL EQUIVALENCY

`;

describe("parseConfirm on the real screenshot", () => {
  const o = parseConfirm(CONFIRM)!;
  it("reads place, title, total and pickup time", () => {
    expect(o).toMatchObject({ place: "hodge", title: "Deli Lunch Meal Deal", price: 15.89, pickupMin: 72 });
  });
  it("reads every part, one per line, prices stripped, Toasted dropped, sizes fixed", () => {
    expect(o.items).toEqual([
      "Hodge Podge BYO Sando", "Gluten-Free Wrap", "Tuna Salad", "Sharp Cheddar", "Green Goddess",
      "Mixed Greens", "Shredded Lettuce", "Sunchips Cheddar (1.5 oz)", "Poland Springs Bottled Water (.5 lt)",
    ]);
  });
});

describe("parseConfirm rules", () => {
  it("null when it isn't a confirm screen (no Subtotal)", () => {
    expect(parseConfirm("Deli Lunch Meal Deal Nov2 + $15.89\nTuna Salad")).toBeNull();
  });
  it("each line is its own item, even without bullets", () => {
    const o = parseConfirm("Kindlevan Cafe\nBreakfast\nBagel $3.50\nCream cheese\nSubtotal $3.50\nTotal $3.50")!;
    expect(o.items).toEqual(["Bagel", "Cream cheese"]);
    expect(o.place).toBe("kindlevan");
  });
  it("Subtotal is not the total", () => {
    const o = parseConfirm("Hodgdon\nSnack\nChips $2.00\nSubtotal $2.00\nTax $0.13\nTotal $2.13")!;
    expect(o.price).toBe(2.13);
  });
  it("no pickup time -> null; no Total line -> price null", () => {
    const o = parseConfirm("Hodgdon\nSnack\nChips $2.00\nSubtotal $2.00")!;
    expect(o.pickupMin).toBeNull();
    expect(o.price).toBeNull();
  });
  it("a one-line order uses its title when no parts are left", () => {
    const o = parseConfirm("Kindlevan Cafe\nEgg & Cheese Croissant\nToasted $9.00\nSubtotal $9.00")!;
    expect(o.items).toEqual(["Egg & Cheese Croissant"]);
  });
});