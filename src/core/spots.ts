// T41b: tap the plate. Tap a spot on the photo, crop around it, let CLIP rank just that spot.
export type Pt = { x: number; y: number };
export type Size = { w: number; h: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Scored = { dishId: string; p: number };   // same shape as your scoreDishes output

const todo = (): never => { throw new Error("todo"); };

// A tap on the photo as shown on screen -> the same spot in the real photo's pixels.
// Scale x by natural.w / shown.w (y the same way), round, then clamp into 0..natural-1.
export function toImagePoint(tap: Pt, shown: Size, natural: Size): Pt {
  throw new Error();
}

// A square crop centered on the tap.
// side = round(min(w, h) * frac), but never bigger than the photo's width or height.
// x = round(tap.x - side / 2), same for y; then slide it back inside: 0 <= x <= img.w - side.
export function cropBox(tap: Pt, img: Size, frac = 0.4): Box {
  throw new Error();
}

// What's in that spot? Blend two CLIP rankings:
//   p = alpha * (spot crop's p) + (1 - alpha) * (whole photo's p, or 0 if it's not there)
// Only dishes in the crop list count. Skip ids in exclude (already on the plate).
// Sort by p high -> low, ties by dishId A -> Z. Keep the top k. Don't change the inputs.
// Defaults: alpha 0.8, k 5.
export function spotPicks(
  crop: Scored[], full: Scored[], o: { exclude?: string[]; k?: number; alpha?: number } = {},
): Scored[] {
  throw new Error();
}