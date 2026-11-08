import { describe, it, expect } from "vitest";
import { solved, isSolved, movable, move, isSolvable, shuffle } from "./puzzle";

// Seeded random so tests are repeatable (mulberry32).
function seeded(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe("solved / isSolved", () => {
  it("3x3: 1..8 then the gap", () => {
    expect(solved(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(solved(3))).toBe(true);
    expect(isSolved(solved(4))).toBe(true);
  });
  it("one tile out of place is not solved", () => {
    expect(isSolved([1, 2, 3, 4, 5, 6, 7, 0, 8])).toBe(false);
  });
});

describe("movable / move", () => {
  it("gap in the corner: two tiles can slide", () => {
    expect(movable(solved(3), 3)).toEqual([5, 7]);
  });
  it("gap in the middle: four tiles, never wrapping across rows", () => {
    expect(movable([1, 2, 3, 4, 0, 5, 6, 7, 8], 3)).toEqual([1, 3, 5, 7]);
    expect(movable([1, 2, 0, 3, 4, 5, 6, 7, 8], 3)).toEqual([1, 5]);   // 3 is on the next row: not a neighbour
  });
  it("sliding a neighbour swaps it into the gap, and returns a NEW board", () => {
    const b = solved(3);
    const after = move(b, 3, 7);
    expect(after).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(b).toEqual(solved(3));          // the old board is untouched
  });
  it("tapping a tile that can't slide changes nothing (same board back)", () => {
    const b = solved(3);
    expect(move(b, 3, 0)).toBe(b);
  });
});

describe("isSolvable", () => {
  it("solved boards are solvable (3x3 and 4x4)", () => {
    expect(isSolvable(solved(3), 3)).toBe(true);
    expect(isSolvable(solved(4), 4)).toBe(true);
  });
  it("swapping two tiles makes a 3x3 impossible", () => {
    expect(isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0], 3)).toBe(false);
  });
  it("4x4 counts the gap's row too", () => {
    expect(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0], 4)).toBe(false);
    expect(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 13, 14, 15, 12], 4)).toBe(true);
  });
});

describe("shuffle", () => {
  it("every shuffle is solvable and never already solved (200 seeds, 3x3 and 4x4)", () => {
    for (let s = 1; s <= 200; s++) {
      for (const n of [3, 4]) {
        const b = shuffle(n, 40, seeded(s));
        expect(isSolvable(b, n)).toBe(true);
        expect(isSolved(b)).toBe(false);
        expect([...b].sort((x, y) => x - y)).toEqual([...Array(n * n).keys()]);
      }
    }
  });
  it("same seed, same board (so a test can replay it)", () => {
    expect(shuffle(3, 30, seeded(7))).toEqual(shuffle(3, 30, seeded(7)));
  });
  it("0 steps still returns an unsolved board", () => {
    expect(isSolved(shuffle(3, 0, seeded(3)))).toBe(false);
  });
});