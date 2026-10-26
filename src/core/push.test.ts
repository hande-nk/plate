import { describe, it, expect } from "vitest";
import { duePushes, type Candidate } from "./push";

const base: Candidate = { tz: "America/New_York", quietFrom: 21, lunchNudge: true, weighReminder: true,
  sundayEdition: true, platesToday: [], weighedToday: false, sentToday: [] };
const kinds = (c: Candidate, iso: string) => duePushes(c, new Date(iso)).map((p) => p.kind);

// Oct 29, 2026 is a Thursday; New York is UTC-4 until Nov 1, then UTC-5.
describe("lunch nudge", () => {
  it("is due at 11:50 with no plates", () => {
    expect(kinds(base, "2026-10-29T15:50:00Z")).toEqual(["lunch"]);
  });
  it("waits until 11:45", () => {
    expect(kinds(base, "2026-10-29T15:40:00Z")).toEqual([]);
  });
  it("stops at 13:00", () => {
    expect(kinds(base, "2026-10-29T17:05:00Z")).toEqual([]);
  });
  it("is skipped once a plate is logged after 10:30", () => {
    expect(kinds({ ...base, platesToday: ["2026-10-29T14:45:00Z"] }, "2026-10-29T15:50:00Z")).toEqual([]);
  });
  it("breakfast at 8:15 doesn't count as lunch", () => {
    expect(kinds({ ...base, platesToday: ["2026-10-29T12:15:00Z"] }, "2026-10-29T15:50:00Z")).toEqual(["lunch"]);
  });
  it("respects the toggle", () => {
    expect(kinds({ ...base, lunchNudge: false }, "2026-10-29T15:50:00Z")).toEqual([]);
  });
  it("never sends twice in a day", () => {
    expect(kinds({ ...base, sentToday: ["lunch"] }, "2026-10-29T16:20:00Z")).toEqual([]);
  });
  it("uses local time, not the server's", () => {
    expect(kinds({ ...base, tz: "America/Los_Angeles" }, "2026-10-29T15:50:00Z")).toEqual([]); // 8:50 in LA
  });
  it("still works after the clocks change", () => {
    expect(kinds(base, "2026-11-02T16:50:00Z")).toEqual(["lunch"]); // Mon 11:50 EST
  });
});

describe("weigh-in and edition", () => {
  it("weigh-in on Monday at 8:00", () => {
    expect(kinds(base, "2026-11-02T13:00:00Z")).toEqual(["weigh"]);
  });
  it("no weigh-in on Tuesday", () => {
    expect(kinds(base, "2026-11-03T13:00:00Z")).toEqual([]);
  });
  it("no weigh-in reminder after you weighed", () => {
    expect(kinds({ ...base, weighedToday: true }, "2026-11-02T13:00:00Z")).toEqual([]);
  });
  it("edition on Sunday at 9:30", () => {
    expect(kinds(base, "2026-11-01T14:30:00Z")).toEqual(["edition"]);
  });
  it("no edition after 10:00", () => {
    expect(kinds(base, "2026-11-01T15:15:00Z")).toEqual([]);
  });
});

describe("limits", () => {
  it("two sent today means nothing more", () => {
    expect(kinds({ ...base, sentToday: ["weigh", "edition"] }, "2026-10-29T15:50:00Z")).toEqual([]);
  });
  it("every push has a title and a body", () => {
    const [p] = duePushes(base, new Date("2026-10-29T15:50:00Z"));
    expect(p.title).toBe("Plate");
    expect(p.body.length).toBeGreaterThan(0);
  });
});