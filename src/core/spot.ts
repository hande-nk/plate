// T41b: tap the plate. Tap a spot on the photo, crop around it, let CLIP rank just that spot.
export type Pt = { x: number; y: number };
export type Size = { w: number; h: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Scored = { dishId: string; p: number };   // same shape as your scoreDishes output

export function toImagePoint(tap: Pt, shown: Size, natural: Size): Pt {
  const x = Math.round((tap.x / shown.w) * natural.w);
  const y = Math.round((tap.y / shown.h) * natural.h);
  // keep it on the photo: 0 .. last pixel
  return { x: Math.min(Math.max(x, 0), natural.w - 1), y: Math.min(Math.max(y, 0), natural.h - 1) };
}

export function cropBox(tap: Pt, img: Size, frac = 0.4): Box {
  const side = Math.min(Math.round(Math.min(img.w, img.h) * frac), img.w, img.h);
  let x = Math.round(tap.x - side / 2);           // center the square on the tap
  let y = Math.round(tap.y - side / 2);
  x = Math.min(Math.max(x, 0), img.w - side);         // slide back inside, keep the size
  y = Math.min(Math.max(y, 0), img.h - side);
  return { x, y, w: side, h: side };
}

export function spotPicks(
  crop: Scored[], full: Scored[], o: { exclude?: string[]; k?: number; alpha?: number } = {},
): Scored[] {
  const alpha = o.alpha ?? 0.8;
  const k = o.k ?? 5;
  const skip = new Set(o.exclude ?? []);
  const fullP = new Map(full.map((s) => [s.dishId, s.p]));
  return crop
    .filter((s) => !skip.has(s.dishId))                                 // not already on the plate
    .map((s) => ({ dishId: s.dishId, p: alpha * s.p + (1 - alpha) * (fullP.get(s.dishId) ?? 0) }))
    .sort((a, b) => b.p - a.p || a.dishId.localeCompare(b.dishId))
    .slice(0, k);
}