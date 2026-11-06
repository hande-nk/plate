import { describe, it, expect } from "vitest";
import { numberWord, weeklyDeduction } from "./deduce";
import type { EditionPlate } from "./edition";

const TZ = "America/New_York";       // EST: local = UTC - 5
const WEEK = "2026-11-02";           // Mon Nov 2 .. Sun Nov 8
const p = (at: string, hall: string | null, feeling: EditionPlate["feeling"], dishes = ["Tuna wrap"]): EditionPlate => ({ at, hall, feeling, dishes });
const lunch = (day: number, hall: string | null, f: EditionPlate["feeling"], dishes?: string[]) => p(`2026-11-0${day}T17:30:00Z`, hall, f, dishes);   // 12:30 local

describe("numberWord", () => {
    it("words up to twelve, digits after", () => {
        expect(numberWord(4)).toBe("four");
        expect(numberWord(12)).toBe("twelve");
        expect(numberWord(13)).toBe("13");
    });
    it("capital for the start of a sentence", () => {
        expect(numberWord(4, true)).toBe("Four");
        expect(numberWord(20, true)).toBe("20");
    });
});

describe("weeklyDeduction", () => {
    it("nothing logged this week -> null", () => {
        expect(weeklyDeduction([p("2026-10-27T17:30:00Z", "hodge", "satisfied")], WEEK, TZ)).toBeNull();   // last week only
    });
    it("a hall where 3+ rated plates felt good at least 75% of the time wins", () => {
        const d = weeklyDeduction([lunch(2, "hodge", "satisfied"), lunch(3, "hodge", "satisfied"), lunch(4, "hodge", "energized"), lunch(5, "hodge", "satisfied"), lunch(6, "hodge", "hungry")], WEEK, TZ);
        expect(d).toEqual({ kind: "hall", hall: "hodge", good: 4, rated: 5, feeling: "satisfied" });
    });
    it("feeling = the more common good feeling there; a tie goes to energized", () => {
        const d = weeklyDeduction([lunch(2, "carm", "energized"), lunch(3, "carm", "satisfied"), lunch(4, "carm", "energized"), lunch(5, "carm", "satisfied")], WEEK, TZ);
        expect(d).toMatchObject({ kind: "hall", feeling: "energized" });
    });
    it("unrated plates don't count, and under 3 rated is not enough", () => {
        const d = weeklyDeduction([lunch(2, "hodge", "satisfied"), lunch(3, "hodge", "satisfied"), lunch(4, "hodge", null), lunch(5, "hodge", null)], WEEK, TZ);
        expect(d?.kind).not.toBe("hall");
    });
    it("under 75% good is not a pattern", () => {
        const d = weeklyDeduction([lunch(2, "dewick", "satisfied"), lunch(3, "dewick", "heavy"), lunch(4, "dewick", "satisfied"), lunch(5, "dewick", "hungry")], WEEK, TZ);
        expect(d?.kind).not.toBe("hall");
    });
    it("two halls qualify: the higher share wins, then more plates, then the name", () => {
        const plates = [lunch(2, "carm", "satisfied"), lunch(3, "carm", "satisfied"), lunch(4, "carm", "satisfied"),
        lunch(2, "hodge", "satisfied"), lunch(3, "hodge", "satisfied"), lunch(4, "hodge", "satisfied"), lunch(5, "hodge", "heavy")];
        expect(weeklyDeduction(plates, WEEK, TZ)).toMatchObject({ hall: "carm" });
        const tie = [lunch(2, "hodge", "energized"), lunch(3, "hodge", "energized"), lunch(4, "hodge", "energized"),
        lunch(2, "carm", "energized"), lunch(3, "carm", "energized"), lunch(4, "carm", "energized")];
        expect(weeklyDeduction(tie, WEEK, TZ)).toMatchObject({ hall: "carm" });
    });
    it("no hall pattern: 3+ new dishes this week", () => {
        const d = weeklyDeduction([p("2026-10-27T17:30:00Z", "hodge", null, ["Tuna wrap"]),
        lunch(2, "hodge", null, ["Tuna wrap", "Miso soup"]), lunch(3, null, null, ["Kimchi"]), lunch(4, null, "heavy", ["Pho"])], WEEK, TZ);
        expect(d).toEqual({ kind: "new", count: 3 });
    });
    it("no hall, few new dishes: the part of the day that felt best (local time)", () => {
        // 13:30Z = 8:30 local, morning
        const d = weeklyDeduction([p("2026-11-02T13:30:00Z", null, "energized"), p("2026-11-03T13:30:00Z", null, "energized"), p("2026-11-04T13:30:00Z", null, "satisfied"),
        p("2026-11-04T23:30:00Z", null, "heavy")], WEEK, TZ);
        expect(d).toEqual({ kind: "time", slot: "morning", good: 3, rated: 3 });
    });
    it("nothing stands out: just how many plates you logged", () => {
        expect(weeklyDeduction([lunch(2, "hodge", "heavy"), lunch(3, null, null)], WEEK, TZ)).toEqual({ kind: "logged", count: 2 });
    });
});