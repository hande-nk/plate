import { describe, it, expect } from "vitest";
import { iou, nms, countItems, type Box, type Detection } from "./count";

const box = (xmin: number, ymin: number, xmax: number, ymax: number): Box => ({ xmin, ymin, xmax, ymax });
const det = (label: string, score: number, b: Box): Detection => ({ label, score, box: b });

describe("iou", () => {
    it("same box is 1", ()=> expect(iou(box(0, 0, 1, 1), box(0, 0, 1, 1))).toBe(1));
    it("disjount boxes are 0", () => expect(iou(box(0, 0, 1 , 1), box(2, 2, 3, 3))).toBe(0));
    it("half-overlap is 1/3", () => expect(iou(box(0, 0, 2, 1), box(1, 0, 3, 1))).toBeCloseTo(1 / 3));
});


describe("nms", () => {
    it("keeps the higher score of two near-duplicates", () => {
        const out = nms([det("f", 0.3, box(0, 0, 1, 1)), det("f", 0.6, box(0.05, 0, 1.05, 1))]);
        expect(out).toHaveLength(1);
        expect(out[0].score).toBe(0.6);
    });
    it("keeps boxes that don't overlap", () => {
        expect(nms([det("f", 0.5, box(0, 0, 1, 1)), det("f", 0.4, box(2, 2, 3, 3))])).toHaveLength(2);
    });
});

describe("countItems", () => {
  const plate: Detection[] = [
    det("a falafel ball", 0.42, box(0.1, 0.1, 0.2, 0.2)),
    det("a falafel ball", 0.31, box(0.11, 0.1, 0.21, 0.2)), // duplicate
    det("a falafel ball", 0.38, box(0.4, 0.4, 0.5, 0.5)),
    det("a falafel ball", 0.04, box(0.7, 0.7, 0.8, 0.8)),   // too weak
    det("a cookie", 0.5, box(0.6, 0.1, 0.8, 0.3)),
  ];
    it("counts 2 falafel", () => expect(countItems(plate, "a falafel ball")).toBe(2));
    it("counts 1 cookie", () => expect(countItems(plate, "a cookie")).toBe(1));
    it("returns 0 for a missing label", () => expect(countItems(plate, "rice")).toBe(0));
});
