import { describe, it, expect } from "vitest";
import { shuffled, dishStats, suggestDishes, type Goal, type FeltPlate } from "./suggest";

const HITS: Record<Goal, string[]> = {
  energy: ["energized"],
  focus: ["focused"],
  comfort: ["cozy", "satisfied"],
  recovery: ["better"],
};
const NOW = new Date("2026-11-14T15:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 864e5).toISOString();
const D = [
  { id: 1, name: "Lentil Soup", hall: "dewick" },
  { id: 2, name: "Grilled Salmon", hall: "dewick" },
  { id: 3, name: "Mac and Cheese", hall: "dewick" },
  { id: 4, name: "Quinoa Bowl", hall: "dewick" },
  { id: 5, name: "Falafel", hall: "dewick" },
  { id: 6, name: "Omelet", hall: "carm" },
];
const plate = (dishIds: number[], feeling: string | null, daysAgo = 1): FeltPlate => ({ dishIds, feeling, at: ago(daysAgo) });
const zero = () => 0;

describe("shuffled", () => {
  it("returns a new array with the same items, input untouched", () => {
    const a = [1, 2, 3, 4];
    const r = shuffled(a, () => 0.42);
    expect(a).toEqual([1, 2, 3, 4]);
    expect([...r].sort()).toEqual([1, 2, 3, 4]);
  });
  it("Fisher-Yates from the end: rand 0 swaps each i with index 0", () => {
    expect(shuffled(["a", "b", "c", "d"], zero)).toEqual(["b", "c", "d", "a"]);
  });
  it("rand just under 1 keeps the order (j === i every time)", () => {
    expect(shuffled(["a", "b", "c", "d"], () => 0.9999)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("dishStats", () => {
  it("counts tries and wins per dish for the chosen goals", () => {
    const s = dishStats([plate([1, 2], "focused"), plate([1], "heavy"), plate([2], "energized")], ["focus"], HITS, NOW);
    expect(s.get(1)).toEqual({ wins: 1, tries: 2 });
    expect(s.get(2)).toEqual({ wins: 1, tries: 2 });   // energized is not a focus hit
  });
  it("two goals: a feeling that hits either one is a win", () => {
    const s = dishStats([plate([3], "cozy"), plate([3], "focused")], ["focus", "comfort"], HITS, NOW);
    expect(s.get(3)).toEqual({ wins: 2, tries: 2 });
  });
  it("skips plates with no feeling, older than 60 days, or in the future", () => {
    const s = dishStats([plate([1], null), plate([1], "focused", 61), plate([1], "focused", -1), plate([1], "focused", 60)], ["focus"], HITS, NOW);
    expect(s.get(1)).toEqual({ wins: 1, tries: 1 });  // exactly 60 days ago still counts
  });
  it("a dish listed twice on one plate counts once", () => {
    expect(dishStats([plate([1, 1], "focused")], ["focus"], HITS, NOW).get(1)).toEqual({ wins: 1, tries: 1 });
  });
});

describe("suggestDishes", () => {
  const base = { dishes: D, hits: HITS, now: NOW, rand: zero };

  it("no goals, no suggestions", () => {
    expect(suggestDishes({ ...base, goals: [], plates: [] })).toEqual([]);
  });
  it("score is (wins + 1) / (tries + 2): one good lunch is promising, not proof", () => {
    const r = suggestDishes({ ...base, goals: ["focus"], plates: [plate([2], "focused")], hall: "dewick" });
    const salmon = r.find((x) => x.dish.id === 2)!;
    expect(salmon.kind).toBe("worked");
    expect(salmon.score).toBeCloseTo(2 / 3);
  });
  it("worked dishes first (best score, then more tries, then name), and the last slot is a new dish", () => {
    const plates = [
      plate([1], "focused"), plate([1], "focused"), plate([1], "heavy"),   // soup 3/5 = 0.6
      plate([2], "focused"), plate([2], "focused"),                        // salmon 3/4 = 0.75
      plate([4], "focused"),                                               // quinoa 2/3
    ];
    const r = suggestDishes({ ...base, goals: ["focus"], plates, hall: "dewick" });
    // salmon 0.75, quinoa 0.67, soup 0.6 -> top 2 worked; untried [mac 3, falafel 5] shuffled with rand 0 -> [5, 3]
    expect(r.map((x) => x.dish.id)).toEqual([2, 4, 5]);
    expect(r.map((x) => x.kind)).toEqual(["worked", "worked", "new"]);
  });
  it("dishes that let you down (score 0.5 or less) are never suggested", () => {
    const plates = [plate([1], "heavy"), plate([2], "focused"), plate([2], "heavy")];  // soup 1/3, salmon 2/4
    const r = suggestDishes({ ...base, goals: ["focus"], plates, hall: "dewick", limit: 5 });
    expect(r.map((x) => x.dish.id)).not.toContain(1);
    expect(r.map((x) => x.dish.id)).not.toContain(2);
  });
  it("only the given hall; every dish when hall is null", () => {
    const r = suggestDishes({ ...base, goals: ["focus"], plates: [plate([6], "focused")], hall: "dewick", limit: 6 });
    expect(r.map((x) => x.dish.id)).not.toContain(6);
    const all = suggestDishes({ ...base, goals: ["focus"], plates: [plate([6], "focused")], hall: null, limit: 6 });
    expect(all[0].dish.id).toBe(6);
  });
  it("first day (no feelings yet): all new dishes, picked by the shuffle", () => {
    const r = suggestDishes({ ...base, goals: ["energy"], plates: [], hall: "dewick" });
    expect(r.every((x) => x.kind === "new")).toBe(true);
    // pool order [1,2,3,4,5] shuffled with rand 0 -> [2,3,4,5,1]
    expect(r.map((x) => x.dish.id)).toEqual([2, 3, 4]);
  });
  it("not enough new dishes: worked ones fill the rest, still best first", () => {
    const plates = [1, 2, 3, 4].flatMap((id) => Array.from({ length: id }, () => plate([id], "energized")));
    // soup 2/3, salmon 3/4, mac 4/5, quinoa 5/6; falafel untried
    const r = suggestDishes({ ...base, goals: ["energy"], plates, hall: "dewick", limit: 4 });
    expect(r.map((x) => x.dish.id)).toEqual([4, 3, 2, 5]);
    const r5 = suggestDishes({ ...base, goals: ["energy"], plates, hall: "dewick", limit: 5 });
    expect(r5.map((x) => x.dish.id)).toEqual([4, 3, 2, 1, 5]);
  });
  it("same score: more tries wins, then name", () => {
    const fourOfSix = (id: number) => [plate([id], "cozy"), plate([id], "cozy"), plate([id], "cozy"), plate([id], "heavy")];
    const plates = [...fourOfSix(4), ...fourOfSix(1), plate([5], "satisfied")];
    // soup 4/6, quinoa 4/6 (4 tries each), falafel 2/3 (1 try): all 0.667
    const r = suggestDishes({ ...base, goals: ["comfort"], plates, hall: "dewick", limit: 4 });
    expect(r.slice(0, 3).map((x) => x.dish.id)).toEqual([1, 4, 5]);   // Lentil before Quinoa by name, Falafel last (fewer tries)
    expect(r[3].kind).toBe("new");
  });
  it("keeps the caller's extra fields on dish", () => {
    const r = suggestDishes({ ...base, dishes: [{ id: 9, name: "Pho", hall: "carm", kcal: 400 }], goals: ["recovery"], plates: [], hall: "carm" });
    expect(r[0].dish.kcal).toBe(400);
  });
});