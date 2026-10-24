import { describe, it, expect } from "vitest";
import { startOfWeek, weekWins } from "./week";

//A local time in Oct 2026: at(19, 12, 30) = Mon Oct 19, 12:30pm
const at = ( day: number, hour: number, min = 0) => new Date(2026, 9, day, hour, min);
const F = false, T = true;

describe("startOfWeek", () => {
  it("Wednesday goes back to Monday", () => expect(startOfWeek(at(21, 15))).toEqual(at(19, 0)));
  it("Sunday belongs to the week before it", () => expect(startOfWeek(at(25, 10))).toEqual(at(19, 0)));
  it("Monday midnight stays put", () => expect(startOfWeek(at(19, 0))).toEqual(at(19, 0)));
  it("next Monday starts a new week", () => expect(startOfWeek(at(26, 8))).toEqual(at(26, 0)));
});

describe("weekWins", () => {
  it("no plates, no wins", () =>
    expect(weekWins([], at(21, 15))).toEqual({ count: 0, days: [F, F, F, F, F, F, F] }));

  const plates = [
    at(19, 12, 30), // Mon 12:30 yes
    at(19, 17, 59), // Mon 5:59pm yes (same day, still one segment)
    at(20, 18, 0),  // Tue 6:00pm no (6pm is not before 6pm)
    at(21, 9),      // Wed 9:00 yes
    at(18, 12),     // last Sunday no (previous week)
  ];

  it("counts plates before 6pm this week", () =>
    expect(weekWins(plates, at(21, 15))).toEqual({ count: 3, days: [T, F, T, F, F, F, F] }));

  it("cutoff can move", () =>
    expect(weekWins(plates, at(21, 15), 20)).toEqual({ count: 4, days: [T, T, T, F, F, F, F] }));

  it("Sunday is the last segment; next Monday doesn't count yet", () =>
    expect(weekWins([at(25, 17), at(26, 9)], at(25, 20))).toEqual({ count: 1, days: [F, F, F, F, F, F, T] }));
});