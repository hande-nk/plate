import { describe, it, expect } from "vitest";
import { toImagePoint, cropBox, spotPicks } from "./spot";

describe("toImagePoint", () => {
  it("scales a tap on the shown photo to the real photo's pixels", () => {
    // shown 360 x 480, real 1080 x 1440 (3x)
    expect(toImagePoint({ x: 120, y: 200 }, { w: 360, h: 480 }, { w: 1080, h: 1440 })).toEqual({ x: 360, y: 600 });
  });
  it("rounds to whole pixels", () => {
    expect(toImagePoint({ x: 1, y: 1 }, { w: 3, h: 3 }, { w: 10, h: 10 })).toEqual({ x: 3, y: 3 });
  });
  it("a tap on the very edge stays inside the photo", () => {
    expect(toImagePoint({ x: 360, y: 480 }, { w: 360, h: 480 }, { w: 1080, h: 1440 })).toEqual({ x: 1079, y: 1439 });
    expect(toImagePoint({ x: -4, y: -1 }, { w: 360, h: 480 }, { w: 1080, h: 1440 })).toEqual({ x: 0, y: 0 });
  });
});

describe("cropBox", () => {
  const img = { w: 1080, h: 1440 };
  it("a square, 40% of the short side, centered on the tap", () => {
    // side = 0.4 * 1080 = 432; tap (540, 720) -> x = 540 - 216 = 324, y = 720 - 216 = 504
    expect(cropBox({ x: 540, y: 720 }, img)).toEqual({ x: 324, y: 504, w: 432, h: 432 });
  });
  it("slides back inside near the top-left corner (keeps its size)", () => {
    expect(cropBox({ x: 10, y: 20 }, img)).toEqual({ x: 0, y: 0, w: 432, h: 432 });
  });
  it("slides back inside near the bottom-right corner", () => {
    expect(cropBox({ x: 1079, y: 1439 }, img)).toEqual({ x: 1080 - 432, y: 1440 - 432, w: 432, h: 432 });
  });
  it("frac changes the size", () => {
    expect(cropBox({ x: 540, y: 720 }, img, 0.25)).toEqual({ x: 405, y: 585, w: 270, h: 270 });
  });
  it("never bigger than the photo, even with frac above 1", () => {
    // side = short side (60); x = 50 - 30 = 20 fits; y has to be 0
    expect(cropBox({ x: 50, y: 50 }, { w: 100, h: 60 }, 2)).toEqual({ x: 20, y: 0, w: 60, h: 60 });
  });
  it("rounds odd sizes to whole pixels", () => {
    // side = round(0.4 * 101) = 40; x = round(50 - 20) = 30
    const b = cropBox({ x: 50, y: 50 }, { w: 101, h: 101 });
    expect(b).toEqual({ x: 30, y: 30, w: 40, h: 40 });
  });
});

describe("spotPicks", () => {
  const crop = [
    { dishId: "broccoli", p: 0.6 }, { dishId: "rice", p: 0.25 }, { dishId: "hummus", p: 0.1 }, { dishId: "pita", p: 0.05 },
  ];
  const full = [
    { dishId: "rice", p: 0.7 }, { dishId: "broccoli", p: 0.05 }, { dishId: "hummus", p: 0.2 }, { dishId: "pita", p: 0.05 },
  ];
  it("blends the spot and the whole photo: 0.8 x crop + 0.2 x full", () => {
    const r = spotPicks(crop, full);
    expect(r[0].dishId).toBe("broccoli");
    expect(r[0].p).toBeCloseTo(0.8 * 0.6 + 0.2 * 0.05);   // 0.49
    expect(r[1].dishId).toBe("rice");
    expect(r[1].p).toBeCloseTo(0.8 * 0.25 + 0.2 * 0.7);   // 0.34
  });
  it("alpha 1 = spot only, alpha 0 = whole photo only", () => {
    expect(spotPicks(crop, full, { alpha: 1 }).map((s) => s.dishId)).toEqual(["broccoli", "rice", "hummus", "pita"]);
    expect(spotPicks(crop, full, { alpha: 0 }).map((s) => s.dishId)).toEqual(["rice", "hummus", "broccoli", "pita"]);
  });
  it("skips dishes already on the plate", () => {
    expect(spotPicks(crop, full, { exclude: ["broccoli"] }).map((s) => s.dishId)).toEqual(["rice", "hummus", "pita"]);
  });
  it("a dish missing from the whole-photo list counts as 0 there", () => {
    const r = spotPicks([{ dishId: "falafel", p: 0.5 }], []);
    expect(r).toEqual([{ dishId: "falafel", p: 0.4 }]);
  });
  it("keeps the top k (default 5); ties go to the dish id A to Z", () => {
    const many = ["e", "d", "c", "b", "a", "f"].map((id) => ({ dishId: id, p: 0.1 }));
    expect(spotPicks(many, [], {}).map((s) => s.dishId)).toEqual(["a", "b", "c", "d", "e"]);
    expect(spotPicks(many, [], { k: 2 }).map((s) => s.dishId)).toEqual(["a", "b"]);
  });
  it("doesn't change the lists you pass in", () => {
    const c = crop.map((s) => ({ ...s }));
    spotPicks(c, full, { exclude: ["rice"] });
    expect(c).toEqual(crop);
  });
});