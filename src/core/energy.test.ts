//all energy tests passed
import { describe, it, expect } from "vitest";
import { bmr, tdee, dailyDeficit, calorieTarget, proteinRange, type Profile } from "./energy";

// A made-up student, not you. Work these out by hand first, then make them pass.
const naz: Profile = { weightKg: 65, heightCm: 168, ageYears: 20, sex: "female", activity: "moderate" };

describe("energy", () => {
  it("bmr uses Mifflin-St Jeor", () => {
    expect(bmr(naz)).toBeCloseTo(1439, 2);
    expect(bmr({ ...naz, sex: "female" })).toBeCloseTo(1439, 2);
  });

  it("tdee multiplies by the activity level", () => {
    expect(tdee(naz)).toBeCloseTo(1439 * 1.55, 2);
    expect(tdee({ ...naz, activity: "light" })).toBeCloseTo(1439 * 1.45, 2);
    expect(tdee({ ...naz, activity: "active" })).toBeCloseTo(1439 * 1.75, 2);
  });

  it("deficit comes from 7700 kcal per kg", () => {
    expect(dailyDeficit("gentle")).toBe(275);
    expect(dailyDeficit("steady")).toBe(550);
  });

  it("target = tdee - deficit, rounded", () => {
    expect(calorieTarget(naz, "steady")).toBe(Math.round(1439 * 1.55 - 550));
  });

  it("target never goes below BMR", () => {
    const smallAndStill: Profile = { weightKg: 48, heightCm: 152, ageYears: 20, sex: "female", activity: "light" };
    expect(calorieTarget(smallAndStill, "steady")).toBe(Math.round(bmr(smallAndStill)));
  });

  it("protein is 1.2 to 1.6 g/kg", () => {
    expect(proteinRange(naz)).toEqual({ min: 78, max: 104 });
  });
});
