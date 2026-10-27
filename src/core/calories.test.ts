import { describe, it, expect } from "vitest";
import { weekCalories } from "./calories";

const tz = "America/New_York";
const now = new Date("2026-10-29T18:00:00Z");   // Thursday 2pm in Boston
const week = "2026-10-26";                        // Monday
const target = 1849;                              // band 1664 to 2034

const meals = [
  { eaten_at: "2026-10-26T16:30:00Z", kcal: 900 },  // Mon lunch
  { eaten_at: "2026-10-26T22:00:00Z", kcal: 950.4 }, // Mon dinner -> Mon 1850
  { eaten_at: "2026-10-27T16:30:00Z", kcal: 2400 }, // Tue
  { eaten_at: "2026-10-29T15:00:00Z", kcal: 600 },  // Thu, today
];

describe("weekCalories", () => {
  it("always returns seven days, Monday first", () => {
    const { days } = weekCalories([], week, now, tz, target);
    expect(days.map((d) => d.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(days[0].date).toBe("2026-10-26");
    expect(days[6].date).toBe("2026-11-01");
  });
  it("adds up a day's meals and rounds", () => {
    expect(weekCalories(meals, week, now, tz, target).days[0].kcal).toBe(1850);
  });
  it("in range, above range", () => {
    const { days } = weekCalories(meals, week, now, tz, target);
    expect(days[0].status).toBe("in");
    expect(days[1].status).toBe("above");
  });
  it("below range is its own status", () => {
    const light = [{ eaten_at: "2026-10-26T16:30:00Z", kcal: 1200 }];
    expect(weekCalories(light, week, now, tz, target).days[0].status).toBe("below");
  });
  it("the band edges count as in range", () => {
    const edge = [{ eaten_at: "2026-10-26T16:30:00Z", kcal: 1664 }, { eaten_at: "2026-10-27T16:30:00Z", kcal: 2034 }];
    const { days } = weekCalories(edge, week, now, tz, target);
    expect([days[0].status, days[1].status]).toEqual(["in", "in"]);
  });
  it("a day with nothing logged is 'none', never zero", () => {
    const wed = weekCalories(meals, week, now, tz, target).days[2];
    expect(wed).toEqual({ label: "W", date: "2026-10-28", kcal: null, status: "none" });
  });
  it("today and later stay open, even with meals logged", () => {
    const { days } = weekCalories(meals, week, now, tz, target);
    expect(days[3]).toMatchObject({ kcal: 600, status: "open" });
    expect(days[4].status).toBe("open");
  });
  it("a late dinner belongs to your local day", () => {
    const late = [{ eaten_at: "2026-10-27T02:30:00Z", kcal: 1800 }];  // Mon 10:30pm in Boston
    const { days } = weekCalories(late, week, now, tz, target);
    expect(days[0].kcal).toBe(1800);
    expect(days[1].kcal).toBeNull();
  });
  it("just tracking (no target): past days are 'logged'", () => {
    expect(weekCalories(meals, week, now, tz, null).days[0].status).toBe("logged");
  });
  it("counts in-range days and days with data", () => {
    const r = weekCalories(meals, week, now, tz, target);
    expect(r.inRange).toBe(1);
    expect(r.counted).toBe(2);
  });
});