import { describe, it, expect } from "vitest";
import { scoreDishes, buildPrior } from "./matcher";

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
