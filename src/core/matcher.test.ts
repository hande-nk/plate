import { describe, it, expect } from "vitest";
import { toSims, scoreDishes, buildPrior } from "./matcher";

const sum = (xs: { p: number }[]) => xs.reduce((a, b) => a + b.p, 0);

describe("dish scoring", () => {
  const sims = { haddock: 0.31, salmon: 0.305, pasta: 0.22 };

  it("returns probabilities that sum to 1, best first", () => {
    const r = scoreDishes(sims, {});
    expect(sum(r)).toBeCloseTo(1, 6);
    expect(r.map(d => d.dishId)).toEqual(["haddock", "salmon", "pasta"]);
  });

  it("only scores dishes on today's menu", () => {
    const r = scoreDishes(sims, { haddock: 1, sushi: 50 });
    expect(r.find(d => d.dishId === "sushi")).toBeUndefined();
  });

  it("your history breaks a near tie", () => {
    const r = scoreDishes(sims, { salmon: 0.6, haddock: 0.05 });
    expect(r[0].dishId).toBe("salmon");
  });

  it("strong photo evidence beats history", () => {
    const r = scoreDishes({ haddock: 0.33, pasta: 0.21 }, { pasta: 0.9, haddock: 0.01 });
    expect(r[0].dishId).toBe("haddock");
  });

  it("alpha = 0 ignores history completely", () => {
    const a = scoreDishes(sims, {}, { alpha: 0 });
    const b = scoreDishes(sims, { pasta: 0.99 }, { alpha: 0 });
    expect(b.map(d => d.p)).toEqual(a.map(d => d.p).map(p => expect.closeTo(p, 9)));
  });

  it("does not overflow with big similarities", () => {
    const r = scoreDishes({ a: 30, b: 29.9 }, {});
    expect(Number.isFinite(r[0].p)).toBe(true);
    expect(sum(r)).toBeCloseTo(1, 6);
  });
});

describe("personal prior", () => {
  it("counts with add-one smoothing over the menu", () => {
    const prior = buildPrior(["salmon", "salmon", "pasta", "sushi"], ["salmon", "pasta", "haddock"]);
    // counts+1: salmon 3, pasta 2, haddock 1 -> /6
    expect(prior.salmon).toBeCloseTo(3 / 6, 9);
    expect(prior.pasta).toBeCloseTo(2 / 6, 9);
    expect(prior.haddock).toBeCloseTo(1 / 6, 9);
    expect(prior.sushi).toBeUndefined();
  });
});

const dishes = [{ id: "a", name: "Lentil Soup" }, { id: "b", name: "Pesto Pasta" }, { id: "c", name: "Rice" }];

describe("toSims", () => {
  it("keys by dish id", () => {
    expect(Object.keys(toSims([{ label: "Rice", score: 0.5 }, { label: "Pesto Pasta", score: 0.3 }, { label: "Lentil Soup", score: 0.2 }], dishes)).sort()).toEqual(["a", "b", "c"]);
  });
  it("undoes CLIP's softmax: softmax(sim / 0.01) gives the scores back", () => {
    const out = [{ label: "Lentil Soup", score: 0.7 }, { label: "Pesto Pasta", score: 0.2 }, { label: "Rice", score: 0.1 }];
    const s = toSims(out, dishes);
    const ex = Object.values(s).map((v) => Math.exp(v / 0.01));
    const z = ex.reduce((x, y) => x + y, 0);
    expect(Math.exp(s.a / 0.01) / z).toBeCloseTo(0.7, 6);
  });
  it("keeps the order: higher score, higher sim", () => {
    const s = toSims([{ label: "Rice", score: 0.6 }, { label: "Pesto Pasta", score: 0.4 }], dishes);
    expect(s.c).toBeGreaterThan(s.b);
  });
  it("skips labels that aren't in your dishes", () => {
    expect(toSims([{ label: "Mystery Stew", score: 1 }], dishes)).toEqual({});
  });
  it("skips a zero score instead of making -Infinity", () => {
    expect(toSims([{ label: "Rice", score: 0 }], dishes)).toEqual({});
  });
});
