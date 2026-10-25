import { describe, it, expect } from "vitest";
import { hitAt1, recallAtK, type Case } from "./accuracy";

const dewick: Case = { truth: ["cutlet", "pita", "hummus", "rice"], ranked: ["cutlet", "salad", "hummus", "pita", "soup", "fries", "rice", "pasta"] };
const carm: Case = { truth: ["haddock", "edamame"], ranked: ["salmon", "edamame", "haddock", "rice"] };

describe("hitAt1", () => {
  it("no cases means no score yet", () => {
    expect(hitAt1([])).toBeNull();
  });
  it("counts a plate when the first suggestion is on it", () => {
    expect(hitAt1([dewick])).toBe(1);
  });
  it("misses when the first suggestion isn't on the plate", () => {
    expect(hitAt1([carm])).toBe(0);
  });
  it("is the share of plates, not dishes", () => {
    expect(hitAt1([dewick, carm])).toBe(0.5);
  });
  it("skips plates with nothing marked", () => {
    expect(hitAt1([dewick, { truth: [], ranked: ["soup"] }])).toBe(1);
  });
});

describe("recallAtK", () => {
  it("no dishes means no score yet", () => {
    expect(recallAtK([], 3)).toBeNull();
  });
  it("counts true dishes found in the first k", () => {
    expect(recallAtK([dewick], 3)).toBe(0.5); // cutlet, hummus
  });
  it("k = 8 finds all four Dewick dishes", () => {
    expect(recallAtK([dewick], 8)).toBe(1);
  });
  it("pools dishes across plates", () => {
    expect(recallAtK([dewick, carm], 3)).toBeCloseTo(4 / 6); // 2 of 4 + 2 of 2
  });
  it("a k longer than the list is fine", () => {
    expect(recallAtK([carm], 20)).toBe(1);
  });
  it("a dish marked twice counts once", () => {
    expect(recallAtK([{ truth: ["pita", "pita"], ranked: ["pita"] }], 1)).toBe(1);
  });
  it("throws on a bad k", () => {
    expect(() => recallAtK([dewick], 0)).toThrow();
    expect(() => recallAtK([dewick], 2.5)).toThrow();
  });
});