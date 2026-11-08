// T22: the glass puzzle. A sliding tile puzzle on a frosted plate photo.
// Board is row by row. Tile k belongs at index k-1. 0 is the empty slot (always last when solved).
export type Board = number[];

// [1, 2, ..., n*n-1, 0]
export function solved(n: number): Board {
  throw new Error("TODO");
}

// true when every tile is home and the gap is last.
export function isSolved(b: Board): boolean {
  throw new Error("TODO");
}

// Indexes of tiles that can slide into the gap, sorted ascending.
// Up and down: e - n, e + n. Left and right: e - 1, e + 1.
// Careful: left/right must stay on the gap's row (no wrapping from column 0 to the row above).
export function movable(b: Board, n: number): number[] {
  throw new Error("TODO");
}

// Slide tile at index i into the gap. Returns a NEW board.
// Illegal tap (not in movable): return the same board reference, unchanged.
export function move(b: Board, n: number, i: number): Board {
  throw new Error("TODO");
}

// Inversions: pairs of tiles (ignore 0) where a bigger number comes before a smaller one.
// Odd n: solvable when inversions are even.
// Even n: let rowFromBottom = the gap's row counted from the bottom, starting at 1.
//         solvable when inversions + rowFromBottom is odd.
export function isSolvable(b: Board, n: number): boolean {
  throw new Error("TODO");
}

// Start from solved(n) and make `steps` random legal moves.
// Pick with rand() in [0, 1). Never slide back the tile you just moved (no undo).
// If you end up solved, keep moving until you are not.
export function shuffle(n: number, steps: number, rand: () => number): Board {
  throw new Error("TODO");
}