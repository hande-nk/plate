import { describe, it, expect } from "vitest";
import { feltGood } from "./feel";

describe("feltGood", () => {
  it("no plates means no percentage yet", () => {
    expect(feltGood([])).toEqual({ good: 0, rated: 0, pct: null });
  });
  it("only skipped plates also means no percentage yet", () => {
    expect(feltGood([null, null])).toEqual({ good: 0, rated: 0, pct: null });
  });
  it("energized and satisfied count as good", () => {
    expect(feltGood(["energized", "satisfied"])).toEqual({ good: 2, rated: 2, pct: 100 });
  });
  it("heavy and hungry are rated but not good", () => {
    expect(feltGood(["heavy", "hungry"])).toEqual({ good: 0, rated: 2, pct: 0 });
  });
  it("skipped plates don't count against you", () => {
    expect(feltGood(["satisfied", null, "heavy", null])).toEqual({ good: 1, rated: 2, pct: 50 });
  });
  it("rounds to a whole percent", () => {
    expect(feltGood(["energized", "heavy", "hungry"]).pct).toBe(33);
    expect(feltGood(["energized", "satisfied", "heavy"]).pct).toBe(67);
  });
  it("matches the edition sample: 12 of 17 is 71%", () => {
    const plates = [...Array(12).fill("satisfied"), ...Array(5).fill("heavy")];
    expect(feltGood(plates).pct).toBe(71);
  });
});