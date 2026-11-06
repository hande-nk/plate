import { describe, it, expect } from "vitest";
import { planTreats, type Treat, type Proposal } from "./treats";

const WEEK = "2026-11-09";   // Mon Nov 9 .. Sun Nov 15
const T = (id: number, outing = false): Treat => ({ id, name: `T${id}`, outing });
const treats = [T(1), T(2), T(3), T(4, true)];
const flat = [100, 100, 100, 100, 100, 100, 100];    // room left vs your range, Mon..Sun

describe("planTreats: the day", () => {
    it("one treat on the day with the most room", () => {
        expect(planTreats(WEEK, [T(1)], [], [50, 300, 80, 0, 120, 90, 60])).toEqual([{ treatId: 1, day: "2026-11-10" }]);
    });
    it("never on a big day (room below 0)", () => {
        const p = planTreats(WEEK, [T(1)], [], [-50, -200, -10, -1, -300, -20, 0]);
        expect(p).toEqual([{ treatId: 1, day: "2026-11-15" }]);
    });
    it("every day is big -> no treat this week (that's fine)", () => {
        expect(planTreats(WEEK, [T(1)], [], [-1, -1, -1, -1, -1, -1, -1])).toEqual([]);
    });
    it("unknown room counts as 0, so a known roomy day wins over it", () => {
        expect(planTreats(WEEK, [T(1)], [], [null, null, 40, null, null, null, null])).toEqual([{ treatId: 1, day: "2026-11-11" }]);
    });
    it("a tie goes to the later day (closer to the weekend)", () => {
        expect(planTreats(WEEK, [T(1)], [], flat)).toEqual([{ treatId: 1, day: "2026-11-15" }]);
    });
    it("an outing with a friend only goes Fri to Sun", () => {
        expect(planTreats(WEEK, [T(4, true)], [], [500, 400, 300, 200, 10, 20, 30])).toEqual([{ treatId: 4, day: "2026-11-15" }]);
    });
});

describe("planTreats: never two in a row", () => {
    it("two treats are never on neighbouring days", () => {
        const p = planTreats(WEEK, [T(1), T(2)], [], [0, 0, 0, 0, 0, 300, 290], 2);
        expect(p.map((x) => x.day)).toEqual(["2026-11-12", "2026-11-14"]);
    });
    it("not on Monday if last week's treat was on Sunday", () => {
        const history: Proposal[] = [{ treatId: 9, weekOf: "2026-11-02", day: "2026-11-08" }];
        expect(planTreats(WEEK, [T(1)], history, [999, 0, 0, 0, 0, 0, 0])[0].day).not.toBe("2026-11-09");
    });
});

describe("planTreats: variety", () => {
    it("skips treats proposed in the last two weeks", () => {
        const history: Proposal[] = [{ treatId: 1, weekOf: "2026-11-02", day: "2026-11-05" }, { treatId: 2, weekOf: "2026-10-26", day: "2026-10-29" }];
        expect(planTreats(WEEK, [T(1), T(2), T(3)], history, flat)[0].treatId).toBe(3);
    });
    it("three weeks ago is fine again", () => {
        const history: Proposal[] = [{ treatId: 1, weekOf: "2026-10-19", day: "2026-10-22" }];
        expect(planTreats(WEEK, [T(1)], history, flat)[0].treatId).toBe(1);
    });
    it("if every treat is recent, it still picks one", () => {
        const history: Proposal[] = [{ treatId: 1, weekOf: "2026-11-02", day: "2026-11-04" }];
        expect(planTreats(WEEK, [T(1)], history, flat)).toHaveLength(1);
    });
    it("prefers the treat proposed least often; a tie goes to the lower id", () => {
        const history: Proposal[] = [
        { treatId: 1, weekOf: "2026-09-07", day: "2026-09-10" }, { treatId: 1, weekOf: "2026-09-21", day: "2026-09-24" },
        { treatId: 2, weekOf: "2026-09-14", day: "2026-09-17" },
        ];
        expect(planTreats(WEEK, [T(1), T(2), T(3)], history, flat)[0].treatId).toBe(3);
        expect(planTreats(WEEK, [T(1), T(2)], history, flat)[0].treatId).toBe(2);
    });
    it("two treats come back in date order", () => {
        const p = planTreats(WEEK, treats, [], [300, 0, 0, 0, 0, 0, 200], 2);
        expect(p.map((x) => x.day)).toEqual(["2026-11-09", "2026-11-15"]);
    });
});