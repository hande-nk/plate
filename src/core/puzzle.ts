// T22: the glass puzzle. A sliding tile puzzle on a frosted plate photo.
// Board is row by row. Tile k belongs at index k-1. 0 is the empty slot (always last when solved).
export type Board = number[];

export function solved(n: number): Board {
  // index i holds i + 1, except the last index, which holds the gap
  return Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
}

export function isSolved(b: Board): boolean {
  // same rule as solved, checked at every index
  return b.every((v, i) => v === (i === b.length - 1 ? 0 : i + 1));
}

export function movable(b: Board, n: number): number[] {
  const e = b.indexOf(0);
  const r = Math.floor(e / n), c = e % n;
  const out: number[] = [];
  if (r > 0)     out.push(e - n); // tile above the gap
  if (r < n - 1) out.push(e + n); // tile below
  if (c > 0)       out.push(e - 1); // tile on the left
  if (c < n - 1) out.push(e + 1);   // tile on the right
  return out.sort((a, b2) => a - b2);
}

export function move(b: Board, n: number, i: number): Board {
  if (!movable(b, n).includes(i)) return b;// illegal tap: return the same board
  const next = b.slice();         // copy first, never change b
  const e = b.indexOf(0);
  [next[e], next[i]] = [next[i], next[e]];
  return next;
}

export function isSolvable(b: Board, n: number): boolean {
  const tiles = b.filter((v) => v !== 0);
  let inv = 0;
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tiles[i] > tiles[j]) inv++;
  if (n % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(b.indexOf(0) / n);
  return (inv + rowFromBottom) % 2 === 1;
}

export function shuffle(n: number, steps: number, rand: () => number): Board {
  let b = solved(n);
  let prev = -1;                  // where the gap was before the last move
  for (let k = 0; k < steps || isSolved(b); k++) {
    const options = movable(b, n).filter((i) => i !== prev);
    const i = options[Math.floor(rand() * options.length)];
    prev = b.indexOf(0);
    b = move(b, n, i);
  }
  return b;
}