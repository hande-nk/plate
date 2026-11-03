import { describe, it, expect } from "vitest";
import { resolveDay, splitItems, parseReorder } from "./order";

// Real Tesseract output of Naz's Hodgdon "Reorder" screenshot (Nov 2, 2026). Typos are real: keep them.
const REORDER = `7:56N al > 52

Ka
REORDER ca
doa ~Hodgdon Food-On-The-Run
DON RETAIL
Deli Lunch Meal Deal Nov2 + $15.89 |

Hodge Podge BYO Sando « Gluten-Free Wrap =
Chicken Cutlet * Sharp Cheddar * Mixed Greens *
Shredded Lettuce * Green Goddess + Toasted
(Not gluten free) * Sunchips Cheddar (1.5 02) +
Fountain Beverage

Deli Lunch Meal Deal Oct 30 + $15.89
Hodge Podge BYO Sando « Gluten-Free Wrap =

Tuna Salad * Sharp Cheddar * Green Goddess

Mixed Greens + Shredded Lettuce * Toasted (Not

gluten free) + Rice Crispy Treat Original (1.3 02.) +

Poland Springs Bottled Water (.5 It)

Deli Dinner Meal Deal Oct 27 + $17.46
Hodge Podge BYO Sando « Gluten-Free Wrap =

Tuna Salad * Sharp Cheddar * Green Goddess

Mixed Greens * Sliced Tomato * Shredded Lettuce

* Toasted (Not gluten free) * Sunchips Cheddar

(1.5 oz) * Rice Crispy Treat Original (1.3 oz.)

Poland Springs Bottled Water (.5 It)

Deli Lunch Meal Deal Oct 27 + $15.89
Hodge Podge BYO Sando « Gluten-Free Wrap =

Chicken Cutlet * Sharp Cheddar * Green Goddess +

ixed Greens * Shredded Lettuce * Toasted (Not

uten free) * Sunchips Cheddar (1.5 oz) * Poland

prings Bottled Water (.5 It)

Deli Lunch Meal Deal Oct 22 + $15.89

All-Nighter Chicken Marinara * Gluten-Free Sub
Roll + Basil Pesto * Mozzarella + Toasted (Not
gluten free) * Welchs Island Fruit Snack (2.25 02) +
Poland Springs Bottled Water (.5 It)

(epee)

Kindlevan Cafe
RETAIL

Eqq & Cheese CROISSANT Oct 30 + $9.00

Oo 6 =

Reorder Rewards

`;

describe("resolveDay", () => {
  it("same year when the date isn't in the future", () => {
    expect(resolveDay("Nov", 2, "2026-11-02")).toBe("2026-11-02");
    expect(resolveDay("Oct", 22, "2026-11-02")).toBe("2026-10-22");
  });
  it("last year when the date would be in the future", () => {
    expect(resolveDay("Dec", 28, "2027-01-03")).toBe("2026-12-28");
  });
  it("accepts any case and long month names", () => {
    expect(resolveDay("OCT", 5, "2026-11-02")).toBe("2026-10-05");
    expect(resolveDay("September", 30, "2026-11-02")).toBe("2026-09-30");
  });
});

describe("splitItems", () => {
  it("splits on every bullet OCR invents: • · * + « » =", () => {
    expect(splitItems(["A wrap • B salad · C bar * D chips + E tea « F soup » G roll = H rice"]))
      .toEqual(["A wrap", "B salad", "C bar", "D chips", "E tea", "F soup", "G roll", "H rice"]);
  });
  it("a line break is a separator when the next line starts a new capitalized item", () => {
    expect(splitItems(["Tuna Salad * Green Goddess", "Mixed Greens * Sliced Tomato"]))
      .toEqual(["Tuna Salad", "Green Goddess", "Mixed Greens", "Sliced Tomato"]);
  });
  it("joins across lines inside an open parenthesis", () => {
    expect(splitItems(["Sunchips Cheddar (1.5", "oz) * Rice Crispy Treat"])).toEqual(["Sunchips Cheddar (1.5 oz)", "Rice Crispy Treat"]);
  });
  it("joins when the next line starts lowercase or with '(' (a word cut in half)", () => {
    expect(splitItems(["Sunchips Cheddar * Poland", "prings Bottled Water"])).toEqual(["Sunchips Cheddar", "Poland prings Bottled Water"]);
    expect(splitItems(["Sunchips Cheddar", "(1.5 oz) * Water"])).toEqual(["Sunchips Cheddar (1.5 oz)", "Water"]);
  });
  it("joins when the next line's first piece is a single word ('Sub' / 'Roll')", () => {
    expect(splitItems(["Chicken Marinara * Gluten-Free Sub", "Roll + Basil Pesto"])).toEqual(["Chicken Marinara", "Gluten-Free Sub Roll", "Basil Pesto"]);
  });
  it("drops 'Toasted', notes in parentheses without digits, and junk with under 3 letters", () => {
    expect(splitItems(["Mozzarella + Toasted (Not", "gluten free) * Oo 6 = Basil Pesto (epee)"])).toEqual(["Mozzarella", "Basil Pesto"]);
  });
  it("fixes OCR sizes: 02 -> oz, It) -> lt)", () => {
    expect(splitItems(["Welchs Island Fruit Snack (2.25 02) + Poland Springs Bottled Water (.5 It)"]))
      .toEqual(["Welchs Island Fruit Snack (2.25 oz)", "Poland Springs Bottled Water (.5 lt)"]);
  });
  it("blank lines and a leading separator don't make empty items", () => {
    expect(splitItems(["Hodge Podge BYO Sando « Gluten-Free Wrap =", "", "* Tuna Salad"])).toEqual(["Hodge Podge BYO Sando", "Gluten-Free Wrap", "Tuna Salad"]);
  });
});

describe("parseReorder on the real screenshot", () => {
  const orders = parseReorder(REORDER, "2026-11-02");

  it("finds all 6 orders, newest first, with day, title, price and place", () => {
    expect(orders.map((o) => [o.day, o.title, o.price, o.place])).toEqual([
      ["2026-11-02", "Deli Lunch Meal Deal", 15.89, "hodge"],
      ["2026-10-30", "Deli Lunch Meal Deal", 15.89, "hodge"],
      ["2026-10-27", "Deli Dinner Meal Deal", 17.46, "hodge"],
      ["2026-10-27", "Deli Lunch Meal Deal", 15.89, "hodge"],
      ["2026-10-22", "Deli Lunch Meal Deal", 15.89, "hodge"],
      ["2026-10-30", "Eqq & Cheese CROISSANT", 9, "kindlevan"],
    ]);
  });
  it("reads every part of the Nov 2 sandwich and the snack", () => {
    expect(orders[0].items).toEqual([
      "Hodge Podge BYO Sando", "Gluten-Free Wrap", "Chicken Cutlet", "Sharp Cheddar", "Mixed Greens",
      "Shredded Lettuce", "Green Goddess", "Sunchips Cheddar (1.5 oz)", "Fountain Beverage",
    ]);
  });
  it("keeps the dinner's 11 parts, including the line that starts with a bullet", () => {
    expect(orders[2].items).toHaveLength(11);
    expect(orders[2].items).toContain("Sliced Tomato");
    expect(orders[2].items).not.toContain("Toasted");
  });
  it("Oct 22: 'Sub' + 'Roll' joined, and the junk under the order is gone", () => {
    expect(orders[4].items).toEqual([
      "All-Nighter Chicken Marinara", "Gluten-Free Sub Roll", "Basil Pesto", "Mozzarella",
      "Welchs Island Fruit Snack (2.25 oz)", "Poland Springs Bottled Water (.5 lt)",
    ]);
  });
  it("a cut-off order with no parts uses its title as the one item", () => {
    expect(orders[5].items).toEqual(["Eqq & Cheese CROISSANT"]);
  });
  it("ignores app chrome and anything before the first order", () => {
    expect(parseReorder("REORDER\nHome\nRewards\nsome text\n", "2026-11-02")).toEqual([]);
  });
});