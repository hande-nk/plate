"use client";

// T27 + T31. Log Hodgdon / Kindlevan mobile orders from a screenshot:
// today's Confirm order screen (one order, real time) or the Reorder tab (many past orders).
// OCR runs on the phone; the screenshot is never uploaded or saved.
// Parts come from your parseReorder. Known parts use your library. New parts get a USDA estimate
// (your pickFood + estimatePart) that you check once; then they live in your library.
// Estimates are always labeled as estimates. No Safiye here. No kcal shown when "hide calorie numbers" is on.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabase";
import { parseConfirm, parseReorder, type ReorderOrder } from "@/core/order";
import { estimatePart, packSizeG, pickFood, type Estimate, type Portion, type UsdaFood } from "@/core/estimate";
import { clueAfterSave } from "@/lib/clueAfterSave";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
type Ord = ReorderOrder & { at?: string };     // a Confirm-order screenshot knows its real time
type Dish = { id: number; name: string; hall: string | null; kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null };
type NewPart = {
  name: string; skip: boolean; portion: Portion;
  foods: UsdaFood[]; pick: number;           // index into foods
  status: "idle" | "loading" | "done" | "none" | "error";
  manual: string;                            // kcal typed by hand when USDA has nothing
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

// Not food, or zero: skipped by default (you can un-skip).
const AUTO_SKIP = /\b(water|byo sando|sando)\b/i;
// Better USDA searches for Tufts menu words, and a typical deli portion in grams. All estimates; edit freely.
const QUERY: [RegExp, string, number | null][] = [
  [/gluten.?free wrap/i, "gluten free tortilla", 60],
  [/gluten.?free sub roll|sub roll/i, "gluten free roll", 85],
  [/chicken cutlet/i, "chicken breast breaded fried", 85],
  [/chicken marinara/i, "chicken parmesan", 120],
  [/tuna salad/i, "tuna salad", 100],
  [/sharp cheddar|cheddar$/i, "cheddar cheese", 28],
  [/mozzarella/i, "mozzarella cheese", 28],
  [/green goddess/i, "green goddess dressing", 30],
  [/basil pesto|pesto/i, "pesto sauce", 15],
  [/mixed greens/i, "mixed salad greens", 20],
  [/shredded lettuce/i, "lettuce iceberg", 20],
  [/sliced tomato|tomato/i, "tomato raw", 30],
  [/sunchips/i, "sunchips harvest cheddar", null],
  [/rice crisp/i, "rice krispies treats original", null],
  [/welch/i, "welch's fruit snacks", null],
  [/fountain beverage/i, "cola soft drink", 355],
  [/croissant/i, "egg and cheese croissant", 140],
];
function searchFor(part: string): { q: string; typical: number | null } {
  const hit = QUERY.find(([re]) => re.test(part));
  if (hit) return { q: hit[1], typical: hit[2] };
  return { q: part.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim(), typical: null };
}

// Same name, or OCR dropped the first letter or two ("ixed greens" -> "mixed greens").
function findDish(part: string, library: Dish[], place: string | null): Dish | null {
  const n = norm(part);
  if (!n) return null;
  const hits = library.filter((d) => {
    const dn = norm(d.name);
    return dn === n || (n.length >= 5 && dn.endsWith(n) && dn.length - n.length <= 2);
  });
  return hits.find((d) => d.hall === place) ?? hits[0] ?? null;
}

// A Confirm-order screenshot: eaten at pickup (now + "Pick up in" minutes).
// The Reorder screen has no times: lunch 12:30, dinner 18:30, breakfast 8:30, otherwise noon, in your time zone.
function guessAt(o: Ord, tz: string): string {
  if (o.at) return o.at;
  const t = o.title.toLowerCase();
  const [h, m] = t.includes("dinner") ? [18, 30] : t.includes("breakfast") ? [8, 30] : t.includes("lunch") ? [12, 30] : [12, 0];
  const [y, mo, d] = o.day.split("-").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, m);
  let at = wall;
  for (let k = 0; k < 2; k++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(at)).map((x) => [x.type, x.value]));
    at += wall - Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  }
  return new Date(at).toISOString();
}

// One new part's numbers: your estimate, or the hand-typed kcal, or 0 when skipped.
function partValue(p: NewPart): { est: Estimate | null; kcal: number | null } {
  if (p.skip) return { est: null, kcal: 0 };
  const food = p.foods[p.pick];
  if (food) {
    const est = estimatePart(food, p.name, p.portion, searchFor(p.name).typical);   // your code
    return { est, kcal: est.kcal };
  }
  const k = num(p.manual);
  return { est: null, kcal: k >= 0 ? k : null };
}

export default function OrderPage() {
  const router = useRouter();
  const workerRef = useRef<OcrWorker | null>(null);
  const asked = useRef<Set<string>>(new Set());
  const [tz, setTz] = useState("America/New_York");
  const [hideNumbers, setHideNumbers] = useState(false);
  const [library, setLibrary] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Ord[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [parts, setParts] = useState<Map<string, NewPart>>(new Map());   // key: norm(raw part)
  const [status, setStatus] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      const [p, d] = await Promise.all([
        supabase.from("profiles").select("hide_numbers, tz").maybeSingle(),
        supabase.from("dishes").select("id, name, hall, kcal, protein_g, carbs_g, fat_g"),
      ]);
      setHideNumbers(Boolean(p.data?.hide_numbers));
      if (p.data?.tz) setTz(p.data.tz);
      setLibrary(((d.data ?? []) as Dish[]).map((x) => ({ ...x, kcal: Number(x.kcal) })));
    })();
    return () => { workerRef.current?.terminate(); };
  }, [router]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOrders(null); setError(null); setReading(true);
    try {
      if (!workerRef.current) { setStatus("Getting the reader ready (first time only)…"); workerRef.current = await createWorker("eng"); }
      setStatus("Reading your orders…");
      const { data } = await workerRef.current.recognize(file);
      let found: Ord[] = parseReorder(data.text, dayIn(new Date(), tz));     // your code: the Reorder tab
      if (found.length === 0) {
        const c = parseConfirm(data.text);                                    // your code: one Confirm-order screen
        if (c) {
          const at = new Date(Date.now() + Math.min(c.pickupMin ?? 0, 180) * 60000);
          at.setSeconds(0, 0);
          found = [{ place: c.place, title: c.title, day: dayIn(at, tz), price: c.price ?? 0, items: c.items, at: at.toISOString() }];
        }
      }
      if (found.length === 0) { setStatus("No orders found. Use the Confirm order screen or the Reorder tab, with the prices showing."); return; }
      const ats = found.map((o) => guessAt(o, tz));
      const { data: have } = await supabase.from("meals").select("eaten_at").eq("route", "app-order").in("eaten_at", ats);
      const already = new Set(((have ?? []) as { eaten_at: string }[]).map((r) => new Date(r.eaten_at).toISOString()));
      setLogged(already);
      setPicked(new Set(found.map((_, i) => i).filter((i) => !already.has(ats[i]))));
      setOrders(found);
      setStatus(null);
    } catch (err) {
      setStatus(`The reader failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReading(false);
    }
  }

  // New parts in the picked orders.
  const chosen = (orders ?? []).filter((_, i) => picked.has(i));
  const unknown = new Map<string, { raw: string; place: string | null }>();
  for (const o of chosen) for (const part of o.items) {
    if (!findDish(part, library, o.place)) unknown.set(norm(part), { raw: part, place: o.place });
  }
  const unknownKey = Array.from(unknown.keys()).join("|");

  // Give each new part a row, then ask USDA about it (one at a time, each part once).
  useEffect(() => {
    setParts((prev) => {
      const next = new Map(prev);
      for (const [k, v] of unknown) if (!next.has(k)) {
        next.set(k, { name: v.raw, skip: AUTO_SKIP.test(v.raw), portion: "normal", foods: [], pick: 0, status: "idle", manual: "" });
      }
      return next;
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      for (const [k, v] of unknown) {
        if (asked.current.has(k) || AUTO_SKIP.test(v.raw)) continue;
        asked.current.add(k);
        setParts((prev) => new Map(prev).set(k, { ...prev.get(k)!, status: "loading" }));
        try {
          const res = await fetch(`/api/usda?q=${encodeURIComponent(searchFor(v.raw).q)}`, { headers: { Authorization: `Bearer ${token}` } });
          const body = (await res.json()) as { foods?: UsdaFood[] };
          const foods = res.ok ? body.foods ?? [] : [];
          const best = pickFood(foods, v.raw);                                   // your code
          const ordered = best ? [best, ...foods.filter((f) => f.fdcId !== best.fdcId)] : foods;
          setParts((prev) => new Map(prev).set(k, { ...prev.get(k)!, foods: ordered, pick: 0, status: !res.ok ? "error" : ordered.length ? "done" : "none" }));
        } catch {
          setParts((prev) => new Map(prev).set(k, { ...prev.get(k)!, status: "error" }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknownKey]);

  const rows = Array.from(unknown.keys()).map((k) => [k, parts.get(k)] as const).filter((r): r is readonly [string, NewPart] => Boolean(r[1]));
  const waiting = rows.filter(([, p]) => !p.skip && p.status === "loading").length;
  const missing = rows.filter(([, p]) => partValue(p).kcal === null || !p.name.trim()).length;
  const canLog = chosen.length > 0 && rows.length === unknown.size && missing === 0 && waiting === 0 && !busy;

  const kcalOf = (part: string, place: string | null) => findDish(part, library, place)?.kcal ?? (parts.get(norm(part)) ? partValue(parts.get(norm(part))!).kcal ?? 0 : 0);

  async function onLog() {
    setBusy(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    // 1. New parts go into your library once (skipped ones as 0, so they never ask again).
    let lib = library;
    const toAdd = rows
      .filter(([k, p]) => !findDish(p.name, lib, unknown.get(k)!.place))
      .map(([k, p]) => {
        const { est, kcal } = partValue(p);
        return {
          user_id: session.user.id, hall: unknown.get(k)!.place, name: p.name.trim(), source: "order",
          kcal: kcal ?? 0, protein_g: est?.protein_g ?? null, carbs_g: est?.carbs_g ?? null, fat_g: est?.fat_g ?? null,
          serving_size: p.skip ? "skipped" : est ? `≈ ${est.grams} g · estimate · ${est.source}` : "typed by you",
        };
      });
    if (toAdd.length) {
      const { data, error } = await supabase.from("dishes").insert(toAdd).select("id, name, hall, kcal, protein_g, carbs_g, fat_g");
      if (error) { setBusy(false); setError(error.message); return; }
      lib = [...lib, ...((data ?? []) as Dish[]).map((x) => ({ ...x, kcal: Number(x.kcal) }))];
      setLibrary(lib);
    }

    // 2. One plate per order; skipped parts aren't logged.
    const mealRows = chosen.flatMap((o) => {
      const at = guessAt(o, tz);
      return o.items.flatMap((part) => {
        const p = parts.get(norm(part));
        if (p?.skip) return [];
        const d = findDish(part, lib, o.place) ?? (p ? findDish(p.name, lib, o.place) : null);
        return [{
          user_id: session.user.id, eaten_at: at, route: "app-order", place: o.place,
          dish_id: d?.id ?? null, dish_name: d?.name ?? part, portion: 1,
          kcal: d?.kcal ?? 0, protein_g: d?.protein_g ?? null, carbs_g: d?.carbs_g ?? null, fat_g: d?.fat_g ?? null,
          photo_key: null,
        }];
      });
    });
    const { error } = await supabase.from("meals").insert(mealRows);
    if (error) { setBusy(false); setError(error.message); return; }
    const latest = mealRows.map((r) => r.eaten_at).sort().at(-1);
    const earned = latest ? await clueAfterSave(session.user.id, latest) : null;
    router.push(earned ? `/?clue=${earned}` : "/");
  }

  const field: React.CSSProperties = { minHeight: 44, borderRadius: 14, border: "1px solid #DADAD4", padding: "0 12px", fontSize: 16, fontFamily: "inherit", background: "#fff", minWidth: 0 };
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 36, padding: "0 12px", borderRadius: 12, border: "none", fontFamily: "inherit", fontSize: 14, cursor: "pointer", background: on ? "var(--ink)" : "#ECECE6", color: on ? "var(--paper)" : "var(--ink)" });
  const dateLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const set = (k: string, patch: Partial<NewPart>) => setParts((prev) => new Map(prev).set(k, { ...prev.get(k)!, ...patch }));

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 34, letterSpacing: "-0.02em" }}>Mobile orders</h1>

      <label className="card" style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", position: "relative" }}>
        <span style={{ fontWeight: 500 }}>{orders ? "Read another screenshot" : "Screenshot your order"}</span>
        <span className="muted" style={{ fontSize: 13 }}>Today&apos;s order: the Confirm order screen. Past days: the Reorder tab logs every order on it. Read on your phone; the image isn&apos;t saved.</span>
        <input type="file" accept="image/*" onChange={onPick} disabled={reading || busy}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <span style={{ minHeight: 48, borderRadius: 16, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {reading ? "Reading…" : "Choose screenshot"}
        </span>
      </label>

      {status && <div className="card" role="status">{status}</div>}

      {orders && orders.map((o, i) => {
        const at = guessAt(o, tz);
        const done = logged.has(at);
        const on = picked.has(i);
        const total = o.items.reduce((s, p) => s + kcalOf(p, o.place), 0);
        return (
          <label key={i} className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", opacity: done ? 0.55 : 1, cursor: done ? "default" : "pointer" }}>
            <input type="checkbox" checked={on} disabled={done} style={{ width: 22, height: 22, marginTop: 2 }}
              onChange={() => setPicked((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
            <div style={{ display: "grid", gap: 4, flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{o.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {dateLabel(o.day)} · {new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}
                {o.place === "hodge" ? " · Hodgdon" : o.place === "kindlevan" ? " · Kindlevan" : ""}
                {done ? " · already logged" : !hideNumbers && on ? ` · ≈ ${Math.round(total)} kcal` : ""}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{o.items.join(" · ")}</div>
            </div>
          </label>
        );
      })}

      {rows.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 500 }}>New to your library ({rows.length})</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Estimates from USDA FoodData Central. Check each once; next time they fill themselves. Skip anything that isn&apos;t food.
          </div>
          {rows.map(([k, p]) => {
            const { est } = partValue(p);
            const food = p.foods[p.pick];
            const isPack = packSizeG(p.name) !== null;
            return (
              <div key={k} style={{ display: "grid", gap: 8, paddingTop: 12, borderTop: "1px solid var(--hairline, #ECECE6)", opacity: p.skip ? 0.5 : 1 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input aria-label="Part name" value={p.name} onChange={(e) => set(k, { name: e.target.value })} style={{ ...field, flex: 1 }} />
                  <button type="button" onClick={() => set(k, { skip: !p.skip })} style={chip(p.skip)} aria-pressed={p.skip}>{p.skip ? "Skipped" : "Skip"}</button>
                </div>
                {!p.skip && (
                  <>
                    {p.status === "loading" && <div className="muted" style={{ fontSize: 13 }}>Looking it up…</div>}
                    {food && est && (
                      <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                        {hideNumbers ? "Estimate ready" : <><b style={{ fontWeight: 500 }}>≈ {est.kcal} kcal</b> <span className="muted">({est.low} to {est.high}) · {est.grams} g</span></>}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {food.name.toLowerCase()}{food.brand ? `, ${food.brand}` : ""} · USDA
                          {p.foods.length > 1 && (
                            <button type="button" onClick={() => set(k, { pick: (p.pick + 1) % p.foods.length })}
                              style={{ marginLeft: 8, border: "none", background: "none", padding: 0, color: "var(--ink)", textDecoration: "underline", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                              Not it? Next match
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {food && !isPack && (
                      <div role="radiogroup" aria-label="Portion" style={{ display: "flex", gap: 6 }}>
                        {(["light", "normal", "extra"] as Portion[]).map((pt) => (
                          <button key={pt} type="button" role="radio" aria-checked={p.portion === pt} onClick={() => set(k, { portion: pt })} style={chip(p.portion === pt)}>
                            {pt[0].toUpperCase() + pt.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                    {(p.status === "none" || p.status === "error") && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <span className="muted">{p.status === "error" ? "USDA didn't answer." : "No USDA match."} kcal:</span>
                        <input inputMode="decimal" value={p.manual} onChange={(e) => set(k, { manual: e.target.value })} style={{ ...field, width: 90 }} aria-label={`Calories for ${p.name}`} />
                      </label>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="alert" role="alert">{error}</div>}
      {orders && (
        <button type="button" onClick={onLog} disabled={!canLog}
          style={{ minHeight: 52, borderRadius: 18, border: "none", fontSize: 17, fontFamily: "inherit",
            background: canLog ? "var(--ink)" : "#DADAD4", color: canLog ? "var(--paper)" : "var(--stone)" }}>
          {busy ? "Logging…" : chosen.length === 0 ? "Pick an order" : waiting ? "Looking up estimates…" : missing ? `${missing} part${missing === 1 ? "" : "s"} still need a number` : `Log ${chosen.length} order${chosen.length === 1 ? "" : "s"}`}
        </button>
      )}
    </main>
  );
}