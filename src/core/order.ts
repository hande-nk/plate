/*
 T26 (moved up from Dec 7). Read a screenshot of the Tufts mobile-order "Reorder" screen.
 One screenshot = several past orders, each with a day, a title, a price and its parts.
 OCR is messy on purpose in the tests: bullets come out as * + « = ·, "oz" as "02",
 first letters fall off ("ixed Greens"). Fuzzy names get fixed later by matching your library.
*/

export type Place = "hodge" | "kindlevan";
export type ReorderOrder = {
  place: Place | null;   // from the last venue line seen ("Hodgdon Food-On-The-Run", "Kindlevan Cafe")
  title: string;         // "Deli Lunch Meal Deal"
  day: string;           // "YYYY-MM-DD"
  price: number;         // 15.89
  items: string[];       // the parts; if none were read, [title]
};

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function resolveDay(mon: string, d: number, today: string): string {
  const m = MONTHS.indexOf(mon.slice(0, 3).toLowerCase()) + 1;     
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (y: number) => `${y}-${pad(m)}-${pad(d)}`;
  const y = Number(today.slice(0, 4));
  return iso(y) > today ? iso(y - 1) : iso(y);
}

// The text lines under one order header -> clean part names.
// 1. Glue the lines into one string. A line break counts as a separator (" • ") UNLESS:
//    the text so far ends with a separator, or has an unclosed "(",
//    or the next line starts lowercase or with "(",
//    or the next line's first piece (before its first separator) is a single word.
// 2. Split on any of • · * + « » = (with spaces around).
// 3. Clean each piece: remove "( ... )" groups that have no digit, "02"/"0z" after a digit -> "oz",
//    "It)" -> "lt)", squash spaces, trim.
// 4. Drop pieces with fewer than 3 letters, and pieces starting with "Toasted".
const SEP = /\s*[•·*+«»=]\s*/;           // a bullet, with any spaces around it
const SEP_END = /[•·*+«»=]\s*$/;         // text ends with a bullet
const openParen = (s: string) => (s.match(/\(/g) ?? []).length > (s.match(/\)/g) ?? []).length;

export function splitItems(lines: string[]): string[] {
  // 1. Glue
  let text = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!text) { text = line; continue; }
    const firstPiece = line.split(SEP)[0].trim();
    const join =
        SEP_END.test(text) ||
        openParen(text) ||
        /^[a-z(]/.test(line) ||
        (firstPiece !== "" && !/\s/.test(firstPiece));
    text += (join ? " " : " • ") + line;
  }

  // 2 to 4. Split, clean, drop
  return text.split(SEP)
    .map((s) => s
      .replace(/\([^()\d]*\)/g, " ")            // "(Not gluten free)", "(epee)" go; "(1.5 oz)" stays
      .replace(/(\d)\s*(02|0z)\b/g, "$1 oz")
      .replace(/\bIt\)/g, "lt)")
      .replace(/\s+/g, " ")
      .trim())
    .filter((s) => (s.match(/[a-z]/gi) ?? []).length >= 3)
    .filter((s) => !/^toasted\b/i.test(s));
}

// The whole OCR text -> orders, in screen order.
// A header line looks like "<title> <Mon> <day> <bullet> $<price>", e.g. "Deli Lunch Meal Deal Nov2 + $15.89 |".
// Venue lines switch the place. Lines made only of app words (Home, Reorder, Rewards, Inbox, More, RETAIL) are skipped.
// Text before the first header is ignored.
const HEADER = /^(.*?)\s*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s?(\d{1,2})\s*[•·*+«»=]?\s*\$(\d+\.\d{2})/i;
const CHROME = /^(home|reorder|rewards|inbox|more|retail|\W)+$/i;
const VENUES: [RegExp, Place][] = [[/hodgdon/i, "hodge"], [/kindlevan/i, "kindlevan"]];

export function parseReorder(ocr: string, today: string): ReorderOrder[] {
    const out: ReorderOrder[] = [];
    let place: Place | null = null;
    let cur: { o: ReorderOrder; lines: string[] } | null = null;

    const close = () => {
        if (!cur) return;
        const items = splitItems(cur.lines);
        cur.o.items = items.length ? items : [cur.o.title];
        out.push(cur.o);
        cur = null;
    };

    for (const raw of ocr.split("\n")) {
        const line = raw.trim();
        if (!line || CHROME.test(line)) continue;

        const venue = VENUES.find(([re]) => re.test(line));
        if (venue) { close(); place = venue[1]; continue; }

        const h = line.match(HEADER);
        if (h) {
        close();
        cur = { o: { place, title: h[1].trim(), day: resolveDay(h[2], Number(h[3]), today), price: Number(h[4]), items: [] }, lines: [] };
        continue;
        }
        if (cur) cur.lines.push(line);
    }
    close();              // the last order never meets a "next header", so close it yourself
    return out;
}