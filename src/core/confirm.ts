export type ConfirmOrder = { place: Place | null; title: string; price: number | null; pickupMin: number | null; items: string[] };

export function parseConfirm(ocr: string): ConfirmOrder | null {
  const lines = ocr.split("\n").map((l) => l.trim()).filter(Boolean);

  const sub = lines.findIndex((l) => /subtotal/i.test(l));             // where the parts end
  if (sub === -1) return null;                                      // not a confirm screen

  const place = VENUES.find(([re]) => lines.slice(0, sub).some((l) => re.test(l)))?.[1] ?? null;
  const pick = lines.slice(0, sub).map((l) => l.match(/(\d+)\s*min\b/i)).find(Boolean);
  const total = lines.slice(sub).map((l) => l.match(/total\s*\$(\d+\.\d{2})/i))
    .find((m) => m && !/sub/i.test(m.input ?? ""));                // "Subtotal" also contains "total"!

  const firstPrice = lines.findIndex((l, i) => i < sub && /\$\d/.test(l));
  if (firstPrice < 1) return null;
  const title = lines[firstPrice - 1];                           // the line just above the first price

  const body = lines.slice(firstPrice, sub)                               // from the first price line up to Subtotal
    .map((l) => l.replace(/\$\s*\d+(\.\d{2})?/g, "").trim() + " •");
  const items = splitItems(body);

  return { place, title, price: total ? Number(total[1]) : null, pickupMin: pick ? Number(pick[1]) : null, items: items.length ? items : [title] };
}