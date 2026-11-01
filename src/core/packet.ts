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
    const round2 = (x: number) => Math.round(x * 100) / 100;

    if (pick.kind === "servings") {
        if (!Number.isFinite(pick.n) || pick.n <= 0) throw new Error("bad servings");
        return round2(pick.n);
    }

    // from here on, TypeScript knows pick is { kind: "fraction"; of }
    if (!Number.isFinite(pick.of) || pick.of <= 0  || pick.of > 1) throw new Error("bad fraction");
    if (servingsPerPacket === null) return null;
    if (servingsPerPacket <= 0 || !Number.isFinite(servingsPerPacket)) throw new Error("bad packet");
    return round2(pick.of * servingsPerPacket);
}

// parseLabel doesn't read this line, so this does. Formats seen on real labels:
//   "2 servings per container"            (2016+ layout)
//   "About 2.5 servings per container"
//   "Servings Per Container: 3"           (old layout)
//   "Servings per container about 8"
//   "1 serving per package", "about 2,5 servings per bag"
export function readServingsPerPacket(ocr: string): number | null {
    const t = ocr.toLowerCase().replace(/(\d),(\d)/g, "$1.$2");   // case-proof, "2,5" -> "2.5"

    const NUM = String.raw`(\d+(?:\.\d+)?)`;
    const WORDS = String.raw`servings?\s*per\s*(?:container|package|packet|bag)`;

    const before = t.match(new RegExp(NUM + String.raw`\s*` + WORDS));
    if (before) return Number(before[1]);

    const after = t.match(new RegExp(WORDS + String.raw`\s*:?\s*(?:about\s*)?` + NUM));
    return after ? Number(after[1]) : null;
}