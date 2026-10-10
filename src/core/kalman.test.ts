import { describe, it, expect } from "vitest";
import { initTrend, stepTrend, runTrend } from "./kalman";

// Deterministic "noise" so tests never flake. Swings of about +-0.8 kg.
const wobble = (d: number) => 0.8 * Math.sin(d * 2.3) * Math.cos(d * 0.7);

describe("kalman trend", () => {
  it("starts where the first reading is, with no slope", () => {
    const s = initTrend(70, 0);
    expect(s.w).toBe(70);
    expect(s.v).toBe(0);
    expect(s.t).toBe(0);
  });

  it("does not mutate the old state", () => {
    const s0 = initTrend(70, 0);
    const copy = JSON.parse(JSON.stringify(s0));
    stepTrend(s0, 71, 1);
    expect(s0).toEqual(copy);
  });

  it("a flat but noisy scale gives a flat trend", () => {
    const series = Array.from({ length: 28 }, (_, d) => ({ day: d, kg: 70 + wobble(d) }));
    const last = runTrend(series).at(-1)!;
    expect(last.w).toBeCloseTo(70, 0);               // within 0.5 kg
    expect(Math.abs(last.v)).toBeLessThan(0.02);     // under 0.14 kg/week
  });

  it("finds a real 0.5 kg/week loss under the noise", () => {
    const rate = -0.5 / 7;
    const series = Array.from({ length: 42 }, (_, d) => ({ day: d, kg: 70 + rate * d + wobble(d) }));
    const last = runTrend(series).at(-1)!;
    expect(last.v).toBeLessThan(-0.04);
    expect(last.v).toBeGreaterThan(-0.11);
    expect(last.w).toBeCloseTo(70 + rate * 41, 0);
  });

  it("handles skipped days (only weighs in some mornings)", () => {
    const rate = -0.5 / 7;
    const days = [0, 1, 3, 4, 7, 9, 10, 14, 15, 17, 21, 22, 24, 28, 29, 31, 35, 36, 38, 41];
    const last = runTrend(days.map(d => ({ day: d, kg: 70 + rate * d + wobble(d) }))).at(-1)!;
    expect(last.t).toBe(41);
    expect(last.v).toBeLessThan(-0.03);
  });

  it("gets more certain about weight as readings come in", () => {
    const series = Array.from({ length: 14 }, (_, d) => ({ day: d, kg: 70 + wobble(d) }));
    const states = runTrend(series);
    expect(states.at(-1)!.P[0][0]).toBeLessThan(states[0].P[0][0]);
  });
});
