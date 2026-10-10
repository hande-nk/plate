import { describe, it, expect } from "vitest";
import { routeItem, type ItemSignals } from "./router";

const base: ItemSignals = { hasNutritionLabel: false, hasTuftsSticker: false, container: "unknown", hall: null };

describe("item router", () => {
  it("a label always wins", () => {
    expect(routeItem({ ...base, hasNutritionLabel: true, hall: "dewick", container: "plate" }).route).toBe("outside-snack");
  });

  it("a Tufts sticker means packaged", () => {
    expect(routeItem({ ...base, hasTuftsSticker: true, container: "wrapper" })).toEqual({ route: "tufts-packaged", confirm: false });
  });

  it("a plate at Carm or Dewick is a plate", () => {
    expect(routeItem({ ...base, container: "plate", hall: "carm" })).toEqual({ route: "plate", confirm: false });
    expect(routeItem({ ...base, container: "plate", hall: "dewick" })).toEqual({ route: "plate", confirm: false });
  });

  it("a box at Hodgdon is a Hodgdon box", () => {
    expect(routeItem({ ...base, container: "box", hall: "hodge" })).toEqual({ route: "hodgdon-box", confirm: false });
  });

  it("guesses but asks when signals are thin", () => {
    const r = routeItem({ ...base, container: "plate", hall: null });
    expect(r.route).toBe("plate");
    expect(r.confirm).toBe(true);
  });

  it("a wrapper with no label or sticker asks", () => {
    expect(routeItem({ ...base, container: "wrapper" }).confirm).toBe(true);
  });

  it("an online food order", ()=> {
    expect(routeItem({...base, container: "app"}).confirm).toBe(true);
  })
});
