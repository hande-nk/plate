import { describe, it, expect } from "vitest";
import { portionOfPacket, readServingsPerPacket } from "./packet";

describe("portionOfPacket", () => {
  it("half of a 2-serving bag is 1 serving", () => {
    expect(portionOfPacket({ kind: "fraction", of: 0.5 }, 2)).toBe(1);
  });
  it("the whole packet is every serving in it", () => {
    expect(portionOfPacket({ kind: "fraction", of: 1 }, 3)).toBe(3);
  });
  it("works with 'about 2.5 servings' packets", () => {
    expect(portionOfPacket({ kind: "fraction", of: 0.75 }, 2.5)).toBe(1.88);
  });
  it("a quarter of a single-serve bar is 0.25", () => {
    expect(portionOfPacket({ kind: "fraction", of: 0.25 }, 1)).toBe(0.25);
  });
  it("returns null for a fraction when the packet size is unknown (the app asks)", () => {
    expect(portionOfPacket({ kind: "fraction", of: 0.5 }, null)).toBeNull();
  });
  it("typed servings don't need the packet size", () => {
    expect(portionOfPacket({ kind: "servings", n: 1.5 }, null)).toBe(1.5);
    expect(portionOfPacket({ kind: "servings", n: 2 }, 4)).toBe(2);
  });
  it("rounds to 2 decimals", () => {
    expect(portionOfPacket({ kind: "servings", n: 1 / 3 }, null)).toBe(0.33);
  });
  it("throws on a fraction outside (0, 1]", () => {
    expect(() => portionOfPacket({ kind: "fraction", of: 0 }, 2)).toThrow();
    expect(() => portionOfPacket({ kind: "fraction", of: 1.5 }, 2)).toThrow();
    expect(() => portionOfPacket({ kind: "fraction", of: NaN }, 2)).toThrow();
  });
  it("throws on zero, negative or NaN servings", () => {
    expect(() => portionOfPacket({ kind: "servings", n: 0 }, 2)).toThrow();
    expect(() => portionOfPacket({ kind: "servings", n: -1 }, 2)).toThrow();
    expect(() => portionOfPacket({ kind: "servings", n: NaN }, 2)).toThrow();
  });
  it("throws on a broken packet size (unknown is null, not 0)", () => {
    expect(() => portionOfPacket({ kind: "fraction", of: 0.5 }, 0)).toThrow();
    expect(() => portionOfPacket({ kind: "fraction", of: 0.5 }, NaN)).toThrow();
  });
});

describe("readServingsPerPacket", () => {
  it("reads '2 servings per container'", () => {
    expect(readServingsPerPacket("Nutrition Facts\n2 servings per container\nServing size 1 cup")).toBe(2);
  });
  it("reads 'About 2.5 servings per container'", () => {
    expect(readServingsPerPacket("About 2.5 servings per container")).toBe(2.5);
  });
  it("reads the old layout 'Servings Per Container: 3'", () => {
    expect(readServingsPerPacket("Serving Size 28g\nServings Per Container: 3")).toBe(3);
  });
  it("reads 'Servings per container about 8'", () => {
    expect(readServingsPerPacket("Servings per container about 8")).toBe(8);
  });
  it("reads a single serving and a comma decimal", () => {
    expect(readServingsPerPacket("1 serving per package")).toBe(1);
    expect(readServingsPerPacket("about 2,5 servings per bag")).toBe(2.5);
  });
  it("returns null when the line isn't there", () => {
    expect(readServingsPerPacket("Calories 250\nProtein 10g")).toBeNull();
  });
});