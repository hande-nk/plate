import { describe, it, expect } from "vitest";
import { dailyRange } from "./range";

const testObejct = { heightCm: 165, ageYears: 20, sex: "female" as const, activity: "moderate" as const};

describe("dailyRange", () => {
    it("no weigh-in yet means no range yer", () => {
        expect(dailyRange(testObejct, null, "gentle")).toBeNull();
    });
    it("gentle: maintenance minus 275, rounded", () => {
        expect(dailyRange(testObejct,  60, "gentle")).toEqual({
            target: 1849, maintenance: 2124, resting: 1370, protein: { min: 72, max: 96 }, floored: false,
        });
    });
    it("steady: maintenance minus 550", () => {
        expect(dailyRange(testObejct, 60, "steady")!.target).toBe(1574);
    });
    it("just track: no target, but resting and protein still shown", () => {
        expect(dailyRange(testObejct, 60, "track")).toEqual({
        target: null, maintenance: 2124, resting: 1370, protein: { min: 72, max: 96 }, floored: false,
        });
    });
    it("never below resting, and says so", () => {
        const small = { heightCm: 150, ageYears: 40, sex: "female" as const, activity: "light" as const };
        const r = dailyRange(small, 45, "steady")!;
        expect(r.target).toBe(r.resting);   // 1027, the floor
        expect(r.floored).toBe(true);
    });
    it("activity changes maintenance", () => {
        expect(dailyRange({ ...testObejct, activity: "light" }, 60, "gentle")!.maintenance).toBe(1987);
        expect(dailyRange({ ...testObejct, activity: "active" }, 60, "gentle")!.maintenance).toBe(2398);
    });
    it("uses the weight you pass, not a stored one", () => {
        expect(dailyRange(testObejct, 62, "gentle")!.protein).toEqual({ min: 74, max: 99 });
    });
    it("throws on a weight that can't be real", () => {
        expect(() => dailyRange(testObejct, 0, "gentle")).toThrow();
        expect(() => dailyRange(testObejct, NaN, "gentle")).toThrow();
    });
});