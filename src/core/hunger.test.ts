import { describe, it, expect } from "vitest";
import { hungerCheck, type HungerInput } from "./hunger";

// Thu Oct 29, 2026 in Boston (UTC-4). 21:30Z = 5:30pm local.
const at = (iso: string) => new Date(iso);
const base: HungerInput = { kind: "hungry", now: at("2026-10-29T21:30:00Z"), lastPlateAt: at("2026-10-29T21:00:00Z"),
  platesToday: 3, plannedTreat: null, tz: "America/New_York" };

describe("hungerCheck", () => {
  it("ate 30 minutes ago on a normal day: offer the optional wait", () => {
    expect(hungerCheck(base)).toEqual({ path: "wait", minutesSincePlate: 30 });
  });
  it("nothing logged yet today: eat", () => {
    expect(hungerCheck({ ...base, lastPlateAt: null, platesToday: 0 })).toEqual({ path: "eat", reason: "long-gap" });
  });
  it("3 hours or more since the last plate: eat", () => {
    expect(hungerCheck({ ...base, lastPlateAt: at("2026-10-29T18:30:00Z") })).toEqual({ path: "eat", reason: "long-gap" });
  });
  it("2 h 59 min is still a wait", () => {
    expect(hungerCheck({ ...base, lastPlateAt: at("2026-10-29T18:31:00Z") })).toEqual({ path: "wait", minutesSincePlate: 179 });
  });
  it("a light day after 3pm: eat, even if the last plate was recent", () => {
    expect(hungerCheck({ ...base, platesToday: 1 })).toEqual({ path: "eat", reason: "low-day" });
  });
  it("a light day before 3pm is not flagged yet", () => {
    const noon = { ...base, now: at("2026-10-29T16:00:00Z"), lastPlateAt: at("2026-10-29T15:30:00Z"), platesToday: 1 };
    expect(hungerCheck(noon)).toEqual({ path: "wait", minutesSincePlate: 30 });
  });
  it("3pm means your local 3pm, not UTC", () => {
    // 19:30Z is 3:30pm in Boston but 12:30pm in Los Angeles
    const c = { ...base, now: at("2026-10-29T19:30:00Z"), lastPlateAt: at("2026-10-29T19:00:00Z"), platesToday: 1 };
    expect(hungerCheck(c).path).toBe("eat");
    expect(hungerCheck({ ...c, tz: "America/Los_Angeles" }).path).toBe("wait");
  });
  it("dessert with today's treat still waiting: it's planned", () => {
    expect(hungerCheck({ ...base, kind: "dessert", plannedTreat: { name: "Double chocolate cookie", eaten: false } }))
      .toEqual({ path: "planned", treat: "Double chocolate cookie" });
  });
  it("a treat already eaten doesn't count again", () => {
    expect(hungerCheck({ ...base, kind: "dessert", plannedTreat: { name: "Cookie", eaten: true } }).path).toBe("wait");
  });
  it("a planned treat only answers dessert, not hunger", () => {
    expect(hungerCheck({ ...base, plannedTreat: { name: "Cookie", eaten: false } }).path).toBe("wait");
  });
  it("planned beats long gap for dessert", () => {
    expect(hungerCheck({ ...base, kind: "dessert", lastPlateAt: null, platesToday: 0, plannedTreat: { name: "Cookie", eaten: false } }).path).toBe("planned");
  });
  it("a plate time slightly in the future never gives negative minutes", () => {
    expect(hungerCheck({ ...base, lastPlateAt: at("2026-10-29T21:31:00Z") })).toEqual({ path: "wait", minutesSincePlate: 0 });
  });
});