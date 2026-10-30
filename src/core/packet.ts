

/*
 T17. "I ate half the bag" -> how many label servings that is.
 The label's numbers are per serving, so the result goes straight into scaleDish(labelFacts, servings).
*/

export type PacketPick =
  | { kind: "fraction"; of: number }   // from the chips: 0.25, 0.5, 0.75, 1
  | { kind: "servings"; n: number };   // typed, e.g. 1.5

// servingsPerPacket: null means unknown (the label line wasn't read). Then a fraction can't be
// turned into servings, so return null and the screen asks "How many servings in the packet?"
export function portionOfPacket(pick: PacketPick, servingsPerPacket: number | null): number | null {
  throw new Error("TODO");
}

// parseLabel doesn't read this line, so this does. Formats seen on real labels:
//   "2 servings per container"            (2016+ layout)
//   "About 2.5 servings per container"
//   "Servings Per Container: 3"           (old layout)
//   "Servings per container about 8"
//   "1 serving per package", "about 2,5 servings per bag"
export function readServingsPerPacket(ocr: string): number | null {
  throw new Error("TODO");
}