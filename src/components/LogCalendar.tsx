"use client";

// Month calendar on Today. A day's tint = how many plates you logged (never calories, never "good/bad").
// Tap a day with plates -> a sheet with everything you logged that day. Days are in your time zone.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlatePhoto } from "@/components/PlatePhoto";

type Row = {
    id: number; eaten_at: string; dish_name: string; portion: number | null; kcal: number;
    photo_key: string | null; feeling: string | null; route: string;
};
type Plate = { key: string; at: string; rows: Row[] };

const DAY_MS = 864e5;
const dayIn = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const pad = (n: number) => String(n).padStart(2, "0");
const ROUTE: Record<string, string> = { "app-order": "Mobile order", label: "Snack", plate: "Plate", "hodgdon-box": "Hodgdon box", "tufts-packaged": "Packaged", "outside-snack": "Snack" };
const FEEL: Record<string, string> = { energized: "Energized", satisfied: "Satisfied", heavy: "Heavy", hungry: "Hungry" };

export function LogCalendar({ tz, hideNumbers }: { tz: string; hideNumbers: boolean }) {
    const today = dayIn(new Date().toISOString(), tz);
    const [ym, setYm] = useState(today.slice(0, 7));                 // "YYYY-MM"
    const [byDay, setByDay] = useState<Map<string, Plate[]>>(new Map());
    const [open, setOpen] = useState<string | null>(null);          // "YYYY-MM-DD"

    useEffect(() => {
        const [y, m] = ym.split("-").map(Number);
        // One extra day on each side, then sort into local days.
    const from = new Date(Date.UTC(y, m - 1, 1) - DAY_MS).toISOString();
        const to = new Date(Date.UTC(y, m, 1) + DAY_MS).toISOString();
        supabase.from("meals").select("id, eaten_at, dish_name, portion, kcal, photo_key, feeling, route")
        .gte("eaten_at", from).lt("eaten_at", to).order("eaten_at")
        .then(({ data }: { data: unknown }) => {
            const days = new Map<string, Map<string, Plate>>();
            for (const r of (data ?? []) as Row[]) {
            const d = dayIn(r.eaten_at, tz);
            if (!d.startsWith(ym)) continue;
            const key = `${r.eaten_at}|${r.photo_key ?? ""}`;
            const plates = days.get(d) ?? new Map<string, Plate>();
            const p = plates.get(key) ?? { key, at: r.eaten_at, rows: [] };
            p.rows.push(r);
            plates.set(key, p);
            days.set(d, plates);
            }
            setByDay(new Map(Array.from(days, ([d, ps]) => [d, Array.from(ps.values())])));
        });
    }, [ym, tz]);

    const [y, m] = ym.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7;                         // Monday-first blanks
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`)];
    const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`); };
    const isThisMonth = ym === today.slice(0, 7);
    const title = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const tint = (n: number) => (n === 0 ? "transparent" : n <= 1 ? "#E6EDD5" : n <= 2 ? "#CFDDB0" : "var(--matcha)");
    const navBtn: React.CSSProperties = { minWidth: 44, minHeight: 44, border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" };

    const plates = open ? byDay.get(open) ?? [] : [];
    const openLabel = open ? new Date(`${open}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "";

return (
        <>
        <div className="card" style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button type="button" onClick={() => shift(-1)} style={navBtn} aria-label="Previous month">‹</button>
            <div style={{ fontWeight: 500 }}>{title}</div>
            <button type="button" onClick={() => shift(1)} style={{ ...navBtn, visibility: isThisMonth ? "hidden" : "visible" }} aria-label="Next month">›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => <div key={i} className="muted" style={{ fontSize: 11 }}>{l}</div>)}
            {cells.map((d, i) => {
                if (!d) return <div key={`b${i}`} />;
                const n = byDay.get(d)?.length ?? 0;
                const future = d > today;
                return (
                <button key={d} type="button" disabled={n === 0} onClick={() => setOpen(d)}
                    aria-label={`${d}: ${n === 0 ? "nothing logged" : `${n} ${n === 1 ? "plate" : "plates"}`}`}
                    style={{
                    aspectRatio: "1", minHeight: 40, borderRadius: 12, fontFamily: "inherit", fontSize: 14, cursor: n ? "pointer" : "default",
                    background: tint(n), color: future ? "#BDBDB6" : "var(--ink)",
                    border: d === today ? "1.5px solid var(--ink)" : "none",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                    }}>
                    <span>{Number(d.slice(8))}</span>
                    {n > 0 && <span style={{ fontSize: 9, lineHeight: 1 }}>{"•".repeat(Math.min(n, 4))}</span>}
                </button>
                );
            })}
            </div>
        </div>

        {open && (
            <div role="dialog" aria-modal="true" aria-label={`What you logged on ${openLabel}`}
            onClick={() => setOpen(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: 430, maxHeight: "82vh", overflowY: "auto", background: "var(--paper)", borderRadius: "28px 28px 0 0", padding: "18px 18px 40px", display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 500 }}>{openLabel}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                    {plates.length} {plates.length === 1 ? "plate" : "plates"}
                    {!hideNumbers && ` · ${Math.round(plates.flatMap((p) => p.rows).reduce((s, r) => s + Number(r.kcal), 0)).toLocaleString("en-US")} kcal`}
                    </div>
                </div>
                <button type="button" onClick={() => setOpen(null)} style={{ ...navBtn, fontSize: 24 }} aria-label="Close">×</button>
                </div>
                {plates.map((p) => (
                <article key={p.key} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    {p.rows[0].photo_key && <PlatePhoto photoKey={p.rows[0].photo_key} />}
                    <div style={{ display: "grid", gap: 6, padding: 16 }}>
                    <div className="muted" style={{ fontSize: 13 }}>
                        {new Date(p.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}
                        {" · "}{ROUTE[p.rows[0].route] ?? "Plate"}
                        {p.rows[0].feeling && ` · ${FEEL[p.rows[0].feeling] ?? p.rows[0].feeling}`}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35 }}>
                        {p.rows.map((r) => (r.portion !== null && r.portion !== 1 ? `${r.dish_name} × ${r.portion}` : r.dish_name)).join(", ")}
                    </div>
                    {!hideNumbers && (
                        <div className="muted" style={{ fontSize: 13 }}>{Math.round(p.rows.reduce((s, r) => s + Number(r.kcal), 0))} kcal</div>
                    )}
                    </div>
                </article>
                ))}
            </div>
            </div>
        )}
        </>
    );
}