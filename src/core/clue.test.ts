import { describe, it, expect } from "vitest";
import { nextClue } from "./clue";

const tz = "America/New_York";
const now = new Date("2026-10-29T18:00:00Z");          // Thu Oct 29, 2pm in Boston
const yesterday = new Date("2026-10-28T18:00:00Z");
const thisMorning = new Date("2026-10-29T13:00:00Z");  // 9am today

describe("nextClue", () => {
  it("the first plate ever opens the case", () => {
    expect(nextClue(1, [], null, now, tz)).toBe(1);
  });
  it("no plates, no clue", () => {
    expect(nextClue(0, [], null, now, tz)).toBeNull();
  });
  it("clue 2 needs 4 plates", () => {
    expect(nextClue(3, [1], yesterday, now, tz)).toBeNull();
    expect(nextClue(4, [1], yesterday, now, tz)).toBe(2);
  });
  it("at most one clue a day", () => {
    expect(nextClue(4, [1], thisMorning, now, tz)).toBeNull();
  });
  it("'today' means your local day, not UTC", () => {
    const lastNight = new Date("2026-10-29T03:30:00Z");  // Oct 28, 11:30pm in Boston
    expect(nextClue(4, [1], lastNight, now, tz)).toBe(2);
  });
  it("only the next clue, even if you're far ahead", () => {
    expect(nextClue(20, [1], yesterday, now, tz)).toBe(2);
  });
  it("picks the lowest clue not found yet", () => {
    expect(nextClue(13, [1, 2, 3], yesterday, now, tz)).toBe(4);
  });
  it("case closed after eight", () => {
    expect(nextClue(99, [1, 2, 3, 4, 5, 6, 7, 8], yesterday, now, tz)).toBeNull();
  });
  it("throws on a count that can't be real", () => {
    expect(() => nextClue(-1, [], null, now, tz)).toThrow();
    expect(() => nextClue(2.5, [], null, now, tz)).toThrow();
  });
});