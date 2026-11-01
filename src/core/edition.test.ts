import { describe, it, expect } from "vitest";
import { editionPicks, type EditionPlate } from "./edition";

// Week of Mon Nov 2 to Sun Nov 8, 2026, Boston. EST (UTC-5) from Nov 1.
const TZ = "America/New_York";
const WEEK = "2026-11-02";
const p = (at: string, dishes: string[], feeling: EditionPlate["feeling"], hall: string | null = "carm"): EditionPlate => ({ at, dishes, hall, feeling });
const base = { weekOf: WEEK, tz: TZ, weighIns: [] as string[], treatsEnjoyed: 0 };

describe("editionPicks", () => {
  it("an empty week is all zeros and no best meal", () => {
    const e = editionPicks({ ...base, plates: [] });
    expect(e).toEqual({ plates: 0, weighIns: 0, feltGood: { good: 0, rated: 0, pct: null }, best: null, newDishes: 0, wins: [] });
  });

  it("counts only plates whose LOCAL day is in Mon..Sun", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-02T04:30:00Z", ["Oatmeal"], null),   // Sun Nov 1, 23:30 local: last week
      p("2026-11-02T14:00:00Z", ["Oatmeal"], null),   // Mon 09:00: in
      p("2026-11-09T04:00:00Z", ["Pizza"], null),     // Sun Nov 8, 23:00 local: in
      p("2026-11-09T14:00:00Z", ["Pizza"], null),     // next Mon: out
    ] });
    expect(e.plates).toBe(2);
  });

  it("felt good uses the week's plates only", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-03T17:00:00Z", ["Haddock"], "energized"),
      p("2026-11-03T23:00:00Z", ["Pasta"], "heavy"),
      p("2026-11-04T17:00:00Z", ["Salad"], null),
      p("2026-10-28T17:00:00Z", ["Soup"], "hungry"),  // last week
    ] });
    expect(e.feltGood).toEqual({ good: 1, rated: 2, pct: 50 });
  });

  it("best meal: energized beats satisfied", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-05T17:00:00Z", ["Burrito bowl"], "satisfied"),
      p("2026-11-03T17:00:00Z", ["Haddock", "Edamame"], "energized"),
    ] });
    expect(e.best?.plate.dishes).toEqual(["Haddock", "Edamame"]);
  });

  it("best meal: a tie goes to the most recent plate", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-03T17:00:00Z", ["Haddock"], "energized"),
      p("2026-11-06T17:00:00Z", ["Miso salmon"], "energized"),
    ] });
    expect(e.best?.plate.dishes).toEqual(["Miso salmon"]);
  });

  it("no best meal when nothing felt good, even if plates were rated", () => {
    const e = editionPicks({ ...base, plates: [p("2026-11-03T17:00:00Z", ["Pasta"], "heavy"), p("2026-11-04T17:00:00Z", ["Soup"], "hungry")] });
    expect(e.best).toBeNull();
  });

  it("sameDish counts every rated plate EVER with the best plate's first dish, case and spaces ignored", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-05T17:00:00Z", ["Baked Haddock", "Edamame"], "energized"),
      p("2026-10-20T17:00:00Z", ["baked haddock "], "satisfied"),
      p("2026-10-13T17:00:00Z", ["Baked haddock"], "heavy"),
      p("2026-10-06T17:00:00Z", ["Baked haddock"], null),          // not rated: doesn't count
      p("2026-10-07T17:00:00Z", ["Edamame"], "hungry"),            // second dish: doesn't count
    ] });
    expect(e.best?.sameDish).toEqual({ good: 2, rated: 3 });
  });

  it("new dishes: names this week never seen before this week, counted once", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-10-20T17:00:00Z", ["Haddock", "Rice"], null),
      p("2026-11-03T17:00:00Z", ["haddock", "Miso salmon"], null),
      p("2026-11-04T17:00:00Z", ["Miso Salmon", "Kimchi"], null),
    ] });
    expect(e.newDishes).toBe(2);   // miso salmon, kimchi
  });

  it("weigh-ins: only this week's days, duplicates once", () => {
    const e = editionPicks({ ...base, plates: [], weighIns: ["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-04", "2026-11-09"] });
    expect(e.weighIns).toBe(2);
  });

  it("early win counts week plates before 18:00 local", () => {
    const e = editionPicks({ ...base, plates: [
      p("2026-11-03T22:59:00Z", ["A"], null),   // 17:59 local: early
      p("2026-11-03T23:00:00Z", ["B"], null),   // 18:00 local: not early
      p("2026-11-04T13:00:00Z", ["C"], null),   // 08:00: early
    ] });
    expect(e.wins).toEqual([{ kind: "early", count: 2 }]);
  });

  it("wins come in a fixed order and drop zeros", () => {
    const e = editionPicks({ ...base, treatsEnjoyed: 1, weighIns: ["2026-11-02", "2026-11-04", "2026-11-06"], plates: [p("2026-11-03T17:00:00Z", ["A"], null)] });
    expect(e.wins).toEqual([{ kind: "early", count: 1 }, { kind: "weighins", count: 3 }, { kind: "treats", count: 1 }]);
    expect(editionPicks({ ...base, treatsEnjoyed: 1, plates: [] }).wins).toEqual([{ kind: "treats", count: 1 }]);
  });

  it("skips plates with no dish names when picking the best meal", () => {
    const e = editionPicks({ ...base, plates: [p("2026-11-06T17:00:00Z", [], "energized"), p("2026-11-03T17:00:00Z", ["Haddock"], "satisfied")] });
    expect(e.best?.plate.dishes).toEqual(["Haddock"]);
  });
});