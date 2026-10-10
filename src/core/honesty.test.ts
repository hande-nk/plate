import { describe, it, expect } from "vitest";
import { honestyCheck } from "./honesty";

describe("honesty check", () => {
  it("waits for 3 weeks of data and says how long is left", () => {
    const r = honestyCheck({ tdeeKcal: 2200, slopeKgPerDay: -0.05, loggedAvgKcal: 1600, daysOfData: 12 });
    expect(r.verdict).toBe("too-early");
    expect(r.daysUntilReady).toBe(9);
  });

  it("computes implied intake from the slope", () => {
    const r = honestyCheck({ tdeeKcal: 2200, slopeKgPerDay: -0.05, loggedAvgKcal: 1815, daysOfData: 28 });
    expect(r.impliedIntakeKcal).toBe(1815);
    expect(r.gapKcal).toBe(0);
    expect(r.verdict).toBe("matches");
    expect(r.daysUntilReady).toBe(0);
  });

  it("flags logging that is too low", () => {
    // implied 1815, logged 1500: gap -315
    const r = honestyCheck({ tdeeKcal: 2200, slopeKgPerDay: -0.05, loggedAvgKcal: 1500, daysOfData: 28 });
    expect(r.verdict).toBe("logging-low");
    expect(r.gapKcal).toBe(-315);
  });

  it("flags logging that is too high", () => {
    const r = honestyCheck({ tdeeKcal: 2200, slopeKgPerDay: 0, loggedAvgKcal: 2500, daysOfData: 21 });
    expect(r.verdict).toBe("logging-high");
  });

  it("respects a custom tolerance, edge included", () => {
    const r = honestyCheck({ tdeeKcal: 2200, slopeKgPerDay: 0, loggedAvgKcal: 2300, daysOfData: 30, toleranceKcal: 100 });
    expect(r.verdict).toBe("matches");
  });
});
