import { readFileSync } from "node:fs";
import { hitAt1, recallAtK, type Case } from "../src/core/accuracy";

type Plate = Case & { hall: string; missing: number; ms: number };

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run eval:summary -- <results.json>");
  process.exit(1);
}

const { plates } = JSON.parse(readFileSync(path, "utf8")) as { plates: Plate[] };
const pct = (x: number | null) => (x === null ? "-" : `${Math.round(x * 100)}%`);

function row(group: string, ps: Plate[]) {
  return {
    group,
    plates: ps.length,
    dishes: ps.reduce((s, p) => s + new Set(p.truth).size, 0),
    "hit@1": pct(hitAt1(ps)),
    "recall@3": pct(recallAtK(ps, 3)),
    "recall@8": pct(recallAtK(ps, 8)),
    "avg ms": ps.length ? Math.round(ps.reduce((s, p) => s + p.ms, 0) / ps.length) : 0,
    "not in library": ps.reduce((s, p) => s + p.missing, 0),
  };
}

const halls = [...new Set(plates.map((p) => p.hall))];
console.table([row("all", plates), ...halls.map((h) => row(h, plates.filter((p) => p.hall === h)))]);