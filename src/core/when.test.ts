import { describe, it, expect } from "vitest";
import { eatenAt, choicesFor } from "./when";

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m); // Oct 24, local time

describe("eatenAt", () => {
  it("now returns the same moment", () => {
    expect(eatenAt("now", at(15, 7)).getTime()).toBe(at(15, 7).getTime());
  });
  it("now returns a copy, not the same object", () => {
    const n = at(15);
    expect(eatenAt("now", n)).not.toBe(n);
  });
  it("lunch at 3pm means 12:30 today", () => {
    expect(eatenAt("lunch", at(15)).getTime()).toBe(at(12, 30).getTime());
  });
  it("breakfast at 9pm means 8:30 today", () => {
    expect(eatenAt("breakfast", at(21)).getTime()).toBe(at(8, 30).getTime());
  });
  it("dinner at 10pm means 18:30 today", () => {
    expect(eatenAt("dinner", at(22)).getTime()).toBe(at(18, 30).getTime());
  });
  it("never returns a time in the future", () => {
    expect(eatenAt("dinner", at(13)).getTime()).toBe(at(13).getTime());
  });
  it("stays on the same local day", () => {
    expect(eatenAt("lunch", at(23, 59)).getDate()).toBe(24);
  });
});

describe("choicesFor", () => {
  it("at 7am only now is offered", () => {
    expect(choicesFor(at(7))).toEqual(["now"]);
  });
  it("at 3pm offers now, breakfast, lunch", () => {
    expect(choicesFor(at(15))).toEqual(["now", "breakfast", "lunch"]);
  });
  it("exactly 12:30 does not offer lunch yet", () => {
    expect(choicesFor(at(12, 30))).toEqual(["now", "breakfast"]);
  });
  it("at 9pm offers all four", () => {
    expect(choicesFor(at(21))).toEqual(["now", "breakfast", "lunch", "dinner"]);
  });
});