"use client";

// T27. Log Hodgdon / Kindlevan mobile orders from one screenshot of the app's Reorder screen.
// OCR runs on the phone; the screenshot is never uploaded or saved.
// Parts come from your parseReorder; calories come from your dish library.
// A part you've never logged is entered once, then every future order reuses it.
// No Safiye here. No totals when "hide calorie numbers" is on.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabase";
import { parseReorder, type ReorderOrder } from "@/core/order";
import { clueAfterSave } from "@/lib/clueAfterSave";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
type Dish = { id: number; name: string; hall: string | null; kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null };
type NewPart = { name: string; kcal: string; protein: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

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

// The order screen has no times: lunch 12:30, dinner 18:30, breakfast 8:30, otherwise noon. Local time in tz.
function guessAt(o: ReorderOrder, tz: string): string {
  const t = o.title.toLowerCase();
  const [h, m] = t.includes("dinner") ? [18, 30] : t.includes("breakfast") ? [8, 30] : t.includes("lunch") ? [12, 30] : [12, 0];
  const [y, mo, d] = o.day.split("-").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, m);
  let at = wall;
  for (let k = 0; k < 2; k++) {                       // twice, so a clock-change day lands right
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(at)).map((x) => [x.type, x.value]));
    const seen = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    at += wall - seen;
  }
  return new Date(at).toISOString();
}

export default function OrderPage() {
  const router = useRouter();
  const workerRef = useRef<OcrWorker | null>(null);
  const [tz, setTz] = useState("America/New_York");
  const [hideNumbers, setHideNumbers] = useState(false);
  const [library, setLibrary] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<ReorderOrder[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [logged, setLogged] = useState<Set<string>>(new Set());     // eaten_at values already in meals
  const [newParts, setNewParts] = useState<Map<string, NewPart>>(new Map());   // key: norm(raw part)
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
      const found = parseReorder(data.text, dayIn(new Date(), tz));          // your code
      if (found.length === 0) { setStatus("No orders found. Screenshot the Reorder tab so the dates and prices show."); return; }

      // Which of these are already logged? Same guessed time, route app-order.
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

  // Parts in the picked orders that aren't in your library yet.
  const chosen = (orders ?? []).filter((_, i) => picked.has(i));
  const unknown = new Map<string, { raw: string; place: string | null }>();
  for (const o of chosen) for (const part of o.items) {
    if (!findDish(part, library, o.place)) unknown.set(norm(part), { raw: part, place: o.place });
  }
  useEffect(() => {
    setNewParts((prev) => {
      const next = new Map(prev);
      for (const [k, v] of unknown) if (!next.has(k)) next.set(k, { name: v.raw, kcal: "", protein: "" });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(unknown.keys()).join("|")]);

  const missing = Array.from(unknown.keys()).filter((k) => { const v = newParts.get(k); return !v || !v.name.trim() || !(num(v.kcal) >= 0); });
  const canLog = chosen.length > 0 && missing.length === 0 && !busy;

  const partKcal = (part: string, place: string | null) => {
    const d = findDish(part, library, place);
    if (d) return d.kcal;
    const v = newParts.get(norm(part));
    return v ? num(v.kcal) || 0 : 0;
  };

  async function onLog() {
    setBusy(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    // 1. Save new parts to your library, once.
    let lib = library;
    const toAdd = Array.from(unknown.entries())
      .filter(([k, v]) => !findDish(newParts.get(k)!.name, lib, v.place))   // you renamed it to a dish you already have
      .map(([k, v]) => {
      const np = newParts.get(k)!;
      const protein = num(np.protein);
      return { user_id: session.user.id, hall: v.place, name: np.name.trim(), kcal: num(np.kcal), protein_g: Number.isFinite(protein) ? protein : null, source: "order" };
    });
    if (toAdd.length) {
      const { data, error } = await supabase.from("dishes").insert(toAdd).select("id, name, hall, kcal, protein_g, carbs_g, fat_g");
      if (error) { setBusy(false); setError(error.message); return; }
      lib = [...lib, ...((data ?? []) as Dish[]).map((x) => ({ ...x, kcal: Number(x.kcal) }))];
      setLibrary(lib);
    }

    // 2. One plate per order: every part shares the order's eaten_at.
    const rows = chosen.flatMap((o) => {
      const at = guessAt(o, tz);
      return o.items.map((part) => {
        const d = findDish(part, lib, o.place) ?? findDish(newParts.get(norm(part))?.name ?? "", lib, o.place);
        return {
          user_id: session.user.id, eaten_at: at, route: "app-order", place: o.place,
          dish_id: d?.id ?? null, dish_name: d?.name ?? part, portion: 1,
          kcal: d?.kcal ?? 0, protein_g: d?.protein_g ?? null, carbs_g: d?.carbs_g ?? null, fat_g: d?.fat_g ?? null,
          photo_key: null,
        };
      });
    });
    const { error } = await supabase.from("meals").insert(rows);
    if (error) { setBusy(false); setError(error.message); return; }
    const latest = rows.map((r) => r.eaten_at).sort().at(-1)!;
    const earned = await clueAfterSave(session.user.id, latest);
    router.push(earned ? `/?clue=${earned}` : "/");
  }

  const field: React.CSSProperties = { minHeight: 44, borderRadius: 14, border: "1px solid #DADAD4", padding: "0 12px", fontSize: 16, fontFamily: "inherit", background: "#fff", minWidth: 0 };
  const dateLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 34, letterSpacing: "-0.02em" }}>Mobile orders</h1>

      <label className="card" style={{ display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
        <span style={{ fontWeight: 500 }}>{orders ? "Read another screenshot" : "Screenshot your Reorder tab"}</span>
        <span className="muted" style={{ fontSize: 13 }}>One screenshot logs every order on it. Read on your phone; the image isn&apos;t saved.</span>
        <input type="file" accept="image/*" onChange={onPick} disabled={reading || busy} />
      </label>

      {status && <div className="card" role="status">{status}</div>}

      {orders && orders.map((o, i) => {
        const at = guessAt(o, tz);
        const done = logged.has(at);
        const on = picked.has(i);
        const total = o.items.reduce((s, p) => s + partKcal(p, o.place), 0);
        return (
          <label key={i} className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", opacity: done ? 0.55 : 1, cursor: done ? "default" : "pointer" }}>
            <input type="checkbox" checked={on} disabled={done} style={{ width: 22, height: 22, marginTop: 2 }}
              onChange={() => setPicked((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
            <div style={{ display: "grid", gap: 4, flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{o.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {dateLabel(o.day)} · {new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}
                {o.place === "hodge" ? " · Hodgdon" : o.place === "kindlevan" ? " · Kindlevan" : ""}
                {done ? " · already logged" : !hideNumbers && on ? ` · ${Math.round(total)} kcal` : ""}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{o.items.join(" · ")}</div>
            </div>
          </label>
        );
      })}

      {unknown.size > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 500 }}>New to your library ({unknown.size})</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Enter each one once; next time it fills itself. Fix any name the reader got wrong. Use 0 for water or a part that&apos;s just a label.
          </div>
          {Array.from(unknown.keys()).map((k) => {
            const v = newParts.get(k) ?? { name: unknown.get(k)!.raw, kcal: "", protein: "" };
            const set = (patch: Partial<NewPart>) => setNewParts((prev) => new Map(prev).set(k, { ...v, ...patch }));
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 76px 76px", gap: 6 }}>
                <input aria-label="Part name" value={v.name} onChange={(e) => set({ name: e.target.value })} style={field} />
                <input aria-label={`Calories for ${v.name}`} inputMode="decimal" placeholder="kcal" value={v.kcal} onChange={(e) => set({ kcal: e.target.value })} style={field} />
                <input aria-label={`Protein grams for ${v.name}`} inputMode="decimal" placeholder="prot g" value={v.protein} onChange={(e) => set({ protein: e.target.value })} style={field} />
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
          {busy ? "Logging…" : chosen.length === 0 ? "Pick an order" : missing.length ? `${missing.length} part${missing.length === 1 ? "" : "s"} still need calories` : `Log ${chosen.length} order${chosen.length === 1 ? "" : "s"}`}
        </button>
      )}
    </main>
  );
}