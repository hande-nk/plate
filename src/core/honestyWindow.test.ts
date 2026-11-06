import { describe, it, expect } from "vitest";
import { honestyWindow, dayNumber, type MealRow } from "./honestyWindow";

const TZ = "America/New_York";                 // EST from Nov 1: local = UTC - 5
const NOW = new Date("2026-11-14T15:00:00Z");  // Sat Nov 14, 10:00 local -> window ends Fri Nov 13
const meal = (at: string, kcal: number, photo: string | null = null): MealRow => ({ eaten_at: at, kcal, photo_key: photo });
const trend = [{ t: dayNumber("2026-10-24"), v: -0.02 }, { t: dayNumber("2026-11-13"), v: -0.05 }, { t: dayNumber("2026-11-14"), v: -0.09 }];

describe("honestyWindow", () => {
    it("no trend yet -> null", () => {
        expect(honestyWindow([], [], "2026-10-24", NOW, TZ, 2200)).toBeNull();
    });
    it("first weigh-in today or later -> null (nothing finished yet)", () => {
        expect(honestyWindow([], trend, "2026-11-14", NOW, TZ, 2200)).toBeNull();
    });
    it("window = first weigh-in to yesterday, local days", () => {
        const w = honestyWindow([], trend, "2026-10-24", NOW, TZ, 2200)!;
        expect([w.from, w.to]).toEqual(["2026-10-24", "2026-11-13"]);
        expect(w.input.daysOfData).toBe(21);
    });
    it("never more than the last 28 days, but daysOfData counts all of them", () => {
        const w = honestyWindow([], trend, "2026-09-01", NOW, TZ, 2200)!;
        expect(w.from).toBe("2026-10-17");
        expect(w.input.daysOfData).toBe(74);
    });
    it("averages only complete days (2+ plates); a lone snack day is skipped", () => {
        const meals = [
        meal("2026-11-12T13:00:00Z", 400), meal("2026-11-12T17:30:00Z", 600), meal("2026-11-12T23:30:00Z", 700),   // Thu: 3 plates, 1700
        meal("2026-11-13T17:30:00Z", 900), meal("2026-11-13T23:30:00Z", 1000),                                      // Fri: 2 plates, 1900
        meal("2026-11-11T20:00:00Z", 250),                                                                         // Wed: 1 plate, skipped
        ];
        const w = honestyWindow(meals, trend, "2026-11-11", NOW, TZ, 2200)!;
        expect(w.input.loggedAvgKcal).toBe(1800);
        expect([w.completeDays, w.skippedDays]).toEqual([2, 1]);
    });
    it("rows of one plate count once (same eaten_at + photo)", () => {
        const meals = [meal("2026-11-13T17:30:00Z", 300, "p1"), meal("2026-11-13T17:30:00Z", 200, "p1"), meal("2026-11-13T17:30:00Z", 100, "p1")];
        const w = honestyWindow(meals, trend, "2026-11-13", NOW, TZ, 2200)!;
        expect(w.completeDays).toBe(0);
    });
    it("local days: 11:30pm Friday counts for Friday, today's meals don't count", () => {
        const meals = [meal("2026-11-14T04:30:00Z", 500), meal("2026-11-13T17:00:00Z", 500), meal("2026-11-14T16:00:00Z", 9999)];
        const w = honestyWindow(meals, trend, "2026-11-13", NOW, TZ, 2200)!;
        expect(w.input.loggedAvgKcal).toBe(1000);
    });
    it("slope = the trend's v on the window's last day, not today's", () => {
        const w = honestyWindow([], trend, "2026-10-24", NOW, TZ, 2200)!;
        expect(w.input.slopeKgPerDay).toBe(-0.05);
        expect(w.input.tdeeKcal).toBe(2200);
    });
    it("no complete days -> average 0", () => {
        expect(honestyWindow([meal("2026-11-13T17:00:00Z", 500)], trend, "2026-11-10", NOW, TZ, 2200)!.input.loggedAvgKcal).toBe(0);
    });
});