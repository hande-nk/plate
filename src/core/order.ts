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

// "Nov", 2 -> "2026-11-02". Screenshots have no year: use today's year, unless that lands
// after today, then last year. Month can be any case and any length ("OCT", "September").
export function resolveDay(mon: string, d: number, today: string): string {
    throw new Error("resolveDay");
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
export function splitItems(lines: string[]): string[] {
  throw new Error("splitItems");
}

// The whole OCR text -> orders, in screen order.
// A header line looks like "<title> <Mon> <day> <bullet> $<price>", e.g. "Deli Lunch Meal Deal Nov2 + $15.89 |".
// Venue lines switch the place. Lines made only of app words (Home, Reorder, Rewards, Inbox, More, RETAIL) are skipped.
// Text before the first header is ignored.
export function parseReorder(ocr: string, today: string): ReorderOrder[] {
  throw new Error("parseReorder");
}