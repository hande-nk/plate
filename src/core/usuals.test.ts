import { describe, it, expect } from "vitest";
import { plateKey, usualLabel, topUsuals, type UsualPlate, type UsualRow } from "./usuals";

const TZ = "America/New_York";                    // EST from Nov 1: local = UTC - 5
const NOW = new Date("2026-11-04T17:30:00Z");     // Wed 12:30 local, midday slot
const wrap: UsualRow[] = [
    { dish_id: 1, dish_name: "Gluten-Free Wrap", portion: 1, kcal: 180 },
    { dish_id: 2, dish_name: "Tuna Salad", portion: 1, kcal: 190 },
    { dish_id: 3, dish_name: "Sharp Cheddar", portion: 1, kcal: 113 },
];
const chips: UsualRow[] = [{ dish_id: 9, dish_name: "Sunchips Cheddar (1.5 oz)", portion: 1, kcal: 215 }];
const p = (at: string, rows: UsualRow[], route = "app-order", place: string | null = "hodge"): UsualPlate => ({ at, route, place, rows });

describe("plateKey", () => {
    it("same dishes in any order -> same key", () => {
        expect(plateKey([wrap[2], wrap[0], wrap[1]])).toBe(plateKey(wrap));
    });
    it("portion is part of the key", () => {
        expect(plateKey([{ ...chips[0], portion: 0.5 }])).not.toBe(plateKey(chips));
    });
    it("no dish id -> the trimmed, lowercased name", () => {
        expect(plateKey([{ dish_id: null, dish_name: " Apple ", portion: 1, kcal: 95 }])).toBe("applex1");
    });
    });

    describe("usualLabel", () => {
    it("the two biggest parts by kcal, then how many more", () => {
        expect(usualLabel(wrap)).toBe("Tuna Salad, Gluten-Free Wrap + 1 more");
    });
    it("one or two parts: no 'more'", () => {
        expect(usualLabel(chips)).toBe("Sunchips Cheddar (1.5 oz)");
        expect(usualLabel(wrap.slice(0, 2))).toBe("Tuna Salad, Gluten-Free Wrap");
    });
});

describe("topUsuals", () => {
    it("needs at least 2 times in the last 30 days", () => {
        expect(topUsuals([p("2026-11-02T17:30:00Z", wrap)], NOW, TZ)).toEqual([]);
        expect(topUsuals([p("2026-11-02T17:30:00Z", wrap), p("2026-10-01T17:30:00Z", wrap)], NOW, TZ)).toEqual([]);
    });
    it("ignores plates after now and empty plates", () => {
        expect(topUsuals([p("2026-11-02T17:30:00Z", wrap), p("2026-11-05T17:30:00Z", wrap), p("2026-11-03T17:30:00Z", [])], NOW, TZ)).toEqual([]);
    });
    it("returns count, label, the latest time, route, place and the latest rows", () => {
        const u = topUsuals([p("2026-10-27T17:30:00Z", wrap), p("2026-11-02T17:30:00Z", wrap, "app-order", "hodge")], NOW, TZ);
        expect(u).toEqual([{ key: plateKey(wrap), label: "Tuna Salad, Gluten-Free Wrap + 1 more", count: 2, lastAt: "2026-11-02T17:30:00Z", route: "app-order", place: "hodge", rows: wrap }]);
    });
    it("score = count + 2 for each time it was eaten in the same part of the day as now", () => {
        // chips: 3 times, all evening (19:00 local). wrap: 2 times at lunch, like now -> 2 + 4 = 6 beats 3.
        const plates = [
        p("2026-11-01T00:00:00Z", chips, "label", null), p("2026-11-02T00:00:00Z", chips, "label", null), p("2026-11-03T00:00:00Z", chips, "label", null),
        p("2026-10-30T17:30:00Z", wrap), p("2026-11-02T17:30:00Z", wrap),
        ];
        expect(topUsuals(plates, NOW, TZ).map((u) => u.label)).toEqual(["Tuna Salad, Gluten-Free Wrap + 1 more", "Sunchips Cheddar (1.5 oz)"]);
    });
    it("slots use local time: before 11, 11 to 15, 15 to 18, after 18", () => {
        // 10:59 local is morning, not midday like NOW
        const plates = [p("2026-11-02T15:59:00Z", chips, "label", null), p("2026-11-03T15:59:00Z", chips, "label", null),
                        p("2026-11-02T16:00:00Z", wrap), p("2026-11-03T16:00:00Z", wrap)];
        expect(topUsuals(plates, NOW, TZ)[0].label).toBe("Tuna Salad, Gluten-Free Wrap + 1 more");
    });
    it("a tie goes to the one eaten most recently, and limit caps the list", () => {
        const a = [{ ...chips[0], dish_id: 20, dish_name: "A" }], b = [{ ...chips[0], dish_id: 21, dish_name: "B" }];
        const plates = [p("2026-11-01T01:00:00Z", a), p("2026-11-02T01:00:00Z", a), p("2026-11-01T01:00:00Z", b), p("2026-11-03T01:00:00Z", b)];
        expect(topUsuals(plates, NOW, TZ).map((u) => u.label)).toEqual(["B", "A"]);
        expect(topUsuals(plates, NOW, TZ, 1)).toHaveLength(1);
    });
});