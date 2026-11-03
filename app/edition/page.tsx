"use client";

// T20. The Sunday edition. Reads your week through your editionPicks.
// Private: weight shows only here, never in a push or a shared cover. Cravings never appear.
// Safiye only quotes clue lines you already approved; she never mentions food amounts or bodies.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPhoto } from "@/lib/photos";
import { runTrend } from "@/core/kalman";
import { editionPicks, type Edition, type EditionPlate, type WinKind } from "@/core/edition";
import type { Feeling } from "@/core/feel";
import { Safiye } from "@/components/Safiye";

const DAY_MS = 864e5;
const TOTAL_CLUES = 8;
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / DAY_MS);
const short = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekday = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmtKg = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1)} kg`;
const HALLS: Record<string, string> = { carm: "Carm", dewick: "Dewick", hodge: "Hodgdon", kindlevan: "Kindlevan" };
const WIN_TEXT: Record<WinKind, (n: number) => string> = {
    early: (n) => `${n === 1 ? "plate" : "plates"} logged before 6pm`,
    weighins: (n) => (n === 1 ? "weigh-in" : "weigh-ins"),
    treats: (n) => `planned ${n === 1 ? "treat" : "treats"}, enjoyed`,
};

type Row = { eaten_at: string; photo_key: string | null; dish_name: string | null; feeling: Feeling | null; dishes: { hall: string | null } | { hall: string | null }[] | null };
type Clue = { ord: number; title: string; body: string; place: string | null };
type Loaded = {
    tz: string; hideWeight: boolean; weekOf: string; number: number;
    edition: Edition; weekPlates: EditionPlate[]; photoKeys: Map<string, string>;
    change: number | null; clue: Clue | null; cluesFound: number;
};

// useSearchParams needs a Suspense boundary or the Next build fails.
export default function EditionRoute() {
    return <Suspense fallback={null}><EditionPage /></Suspense>;
}

function EditionPage() {
    const router = useRouter();
    const params = useSearchParams();
    const [data, setData] = useState<Loaded | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<Map<string, string>>(new Map());   // plate at -> object URL

    useEffect(() => {
        (async () => {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { router.replace("/login"); return; }
        const [p, m, w, t, c] = await Promise.all([
            supabase.from("profiles").select("tz, hide_weight").maybeSingle(),
            supabase.from("meals").select("eaten_at, photo_key, dish_name, feeling, dishes(hall)").order("eaten_at"),
            supabase.from("weigh_ins").select("day, kg").order("day"),
            supabase.from("planned_treats").select("day, eaten_at"),
            supabase.from("user_clues").select("found_at, clues(ord, title, body, place)").order("found_at"),
        ]);
        const err = p.error ?? m.error ?? w.error ?? t.error ?? c.error;
        if (err) { setError(err.message); return; }
        if (!p.data) { router.replace("/welcome"); return; }
        const tz: string = p.data.tz ?? "America/New_York";

        // Which week: the one ending on the most recent Sunday (today, if it's Sunday). ?week=YYYY-MM-DD overrides.
        const today = dayIn(new Date(), tz);
        const isSunday = new Date(`${today}T00:00:00Z`).getUTCDay() === 0;
        const asked = params.get("week");
        const weekOf = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? mondayOf(asked) : mondayOf(isSunday ? today : addDays(today, -7));
        const end = addDays(weekOf, 6);

        // Rows -> plates (one per eaten_at + photo_key).
        const byKey = new Map<string, Row[]>();
        for (const r of (m.data ?? []) as Row[]) {
            const k = `${r.eaten_at}|${r.photo_key ?? ""}`;
            byKey.set(k, [...(byKey.get(k) ?? []), r]);
        }
        const photoKeys = new Map<string, string>();
        const plates: EditionPlate[] = Array.from(byKey.values()).map((rows) => {
            const hallOf = (r: Row) => (Array.isArray(r.dishes) ? r.dishes[0]?.hall : r.dishes?.hall) ?? null;
            if (rows[0].photo_key) photoKeys.set(rows[0].eaten_at, rows[0].photo_key);
            return {
            at: rows[0].eaten_at,
            dishes: rows.map((r) => r.dish_name).filter((n): n is string => Boolean(n && n.trim())),
            hall: rows.map(hallOf).find((h) => h !== null) ?? null,
            feeling: rows[0].feeling,
            };
        });

        const weighs = ((w.data ?? []) as { day: string; kg: number }[]).map((r) => ({ day: r.day, kg: Number(r.kg) }));
        const treatsEnjoyed = ((t.data ?? []) as { day: string; eaten_at: string | null }[])
            .filter((r) => r.day >= weekOf && r.day <= end && r.eaten_at !== null).length;

        const edition = editionPicks({ weekOf, tz, plates, weighIns: weighs.map((x) => x.day), treatsEnjoyed });   // your code
        const weekPlates = plates.filter((pl) => { const d = dayIn(new Date(pl.at), tz); return d >= weekOf && d <= end; });

        // Weight change across the week, from your Kalman trend (needs a weigh-in this week and one before it or in it).
        let change: number | null = null;
        const upTo = weighs.filter((x) => x.day <= end);
        if (upTo.length >= 2) {
            const states = runTrend(upTo.map((x) => ({ day: dayNumber(x.day), kg: x.kg })));
            const startT = dayNumber(weekOf);
            const inWeek = states.filter((s) => s.t >= startT);
            const before = states.filter((s) => s.t < startT).at(-1) ?? (inWeek.length >= 2 ? inWeek[0] : undefined);
            const last = inWeek.at(-1);
            if (before && last && last !== before) change = last.w - before.w;
        }

        // Safiye: the latest clue found by the end of this week.
        type CRow = { found_at: string; clues: Clue | Clue[] | null };
        const found = ((c.data ?? []) as CRow[]).filter((r) => dayIn(new Date(r.found_at), tz) <= end);
        const lastRow = found.at(-1);
        const clue = lastRow ? (Array.isArray(lastRow.clues) ? lastRow.clues[0] ?? null : lastRow.clues) : null;

        const first = plates[0] ? mondayOf(dayIn(new Date(plates[0].at), tz)) : weekOf;
        const number = Math.max(1, Math.round((Date.parse(weekOf) - Date.parse(first)) / (7 * DAY_MS)) + 1);

        setData({ tz, hideWeight: Boolean(p.data.hide_weight), weekOf, number, edition, weekPlates, photoKeys, change, clue, cluesFound: found.length });
        })();
    }, [router, params]);

    // Photos come from this phone only (IndexedDB). Plates logged on another device just show their names.
    useEffect(() => {
        if (!data) return;
        const urls: string[] = [];
        let alive = true;
        (async () => {
        const next = new Map<string, string>();
        const wanted = [data.edition.best?.plate.at, ...data.weekPlates.map((p) => p.at)].filter((x): x is string => Boolean(x));
        for (const at of Array.from(new Set(wanted)).slice(0, 10)) {
            const key = data.photoKeys.get(at);
            if (!key) continue;
            try {
            const blob = await getPhoto(key);
            if (blob) { const u = URL.createObjectURL(blob); urls.push(u); next.set(at, u); }
            } catch { /* a missing photo is fine */ }
        }
        if (alive) setPhotos(next);
        })();
        return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
    }, [data]);

    if (error) return <main className="screen"><div className="alert" role="alert">{error}</div></main>;
    if (!data) return null;
    const { edition: e, weekOf, number, tz } = data;
    const best = e.best;
    const card: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 26 };
    const label: React.CSSProperties = { fontSize: 11, color: "var(--stone)" };
    const big: React.CSSProperties = { fontWeight: 500, fontSize: 34, letterSpacing: "-0.03em", lineHeight: 1 };
    const withPhotos = data.weekPlates.filter((p) => photos.has(p.at)).slice(-9);

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1 }}>The Week</h1>
            <span style={{ fontSize: 13, color: "var(--stone)" }}>No. {String(number).padStart(2, "0")}</span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
            {short(weekOf)} to {short(addDays(weekOf, 6))} · {plural(e.plates, "plate", "plates")} · {plural(e.weighIns, "weigh-in", "weigh-ins")}
        </div>

        {/* Best-feeling meal */}
        <div className="card" style={{ ...card, padding: 0, overflow: "hidden" }}>
            {best && photos.has(best.plate.at) && (
            <img src={photos.get(best.plate.at)} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
            )}
            <div style={{ ...card }}>
            <div style={label}>Best-feeling meal</div>
            {best ? (
                <>
                <div style={{ fontSize: 17, fontWeight: 500 }}>
                       {best.plate.dishes.join(", ").replace(/^./, (c) => c.toUpperCase())}{best.plate.hall ? `, ${HALLS[best.plate.hall] ?? best.plate.hall}` : ""}, {weekday(best.plate.at, tz)}.
                </div>
                <div style={{ fontSize: 13, color: "var(--stone)" }}>
                    You felt {best.plate.feeling} after it.
                    {best.sameDish.rated >= 2 && ` ${best.plate.dishes[0]} has felt good ${best.sameDish.good} of ${best.sameDish.rated} times.`}
                </div>
                </>
            ) : (
                <div style={{ fontSize: 15 }}>Tap how a plate felt after you eat, and next week&apos;s pick shows up here.</div>
            )}
            </div>
        </div>

        {/* Three numbers */}
        <div style={{ display: "grid", gridTemplateColumns: data.hideWeight ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
            {!data.hideWeight && (
            <div className="card" style={{ ...card, background: "var(--ink)", color: "var(--paper)", border: "none" }}>
                <div style={{ ...label, color: "#B8B8B2" }}>Trend</div>
                <div style={{ ...big, fontSize: 26, color: "var(--matcha)" }}>{data.change === null ? "–" : fmtKg(data.change)}</div>
                <div style={{ fontSize: 11, color: "#B8B8B2" }}>{data.change === null ? "Needs 2 weigh-ins" : "this week"}</div>
            </div>
            )}
            <div className="card" style={card}>
            <div style={label}>Felt good</div>
            <div style={{ ...big, fontSize: 26 }}>{e.feltGood.pct === null ? "–" : `${e.feltGood.pct}%`}</div>
            <div style={{ fontSize: 11, color: "var(--stone)" }}>{e.feltGood.rated ? `${e.feltGood.good} of ${e.feltGood.rated} rated` : "none rated"}</div>
            </div>
            <div className="card" style={card}>
            <div style={label}>New dishes</div>
            <div style={{ ...big, fontSize: 26 }}>{e.newDishes}</div>
            <div style={{ fontSize: 11, color: "var(--stone)" }}>tried this week</div>
            </div>
        </div>

        {/* The Dewick Dispatch: approved clue lines only */}
        <div className="card" style={{ ...card, background: "var(--ink)", color: "var(--paper)", border: "none" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--paper)", display: "grid", placeItems: "center", flex: "none" }}>
                <Safiye mood={data.clue ? "hmm" : "sleepy"} size={56} label="Safiye Hanım" />
            </div>
            <div>
                <div style={{ fontWeight: 500, fontSize: 17 }}>The Dewick Dispatch</div>
                <div style={{ fontSize: 11, color: "#B8B8B2" }}>From Safiye Hanım</div>
            </div>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.45 }}>
            {data.clue ? `“${data.clue.body}”` : "“Quiet week at the agency. Log a plate and I'll open the file.”"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#B8B8B2" }}>Case file No. 1 · {data.cluesFound} of {TOTAL_CLUES} clues</span>
            <span aria-hidden="true" style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                {Array.from({ length: TOTAL_CLUES }, (_, k) => (
                <span key={k} style={{ width: 8, height: 8, borderRadius: 4, background: k < data.cluesFound ? "var(--matcha)" : "#3A3A38" }} />
                ))}
            </span>
            </div>
        </div>

        {/* Your week in plates (photos on this phone only) */}
        {withPhotos.length > 0 && (
            <div className="card" style={card}>
            <div style={label}>Your week in plates</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {withPhotos.map((p) => (
                <img key={p.at} src={photos.get(p.at)} alt={p.dishes.join(", ")} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }} />
                ))}
            </div>
            </div>
        )}

        {/* Small wins */}
        <div className="card" style={card}>
            <div style={label}>Small wins</div>
            {e.wins.length === 0 ? (
            <div style={{ fontSize: 15 }}>A fresh week starts tomorrow.</div>
            ) : e.wins.map((w) => (
            <div key={w.kind} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ ...big, fontSize: 26, minWidth: 34 }}>{w.count}</span>
                <span style={{ fontSize: 15 }}>{WIN_TEXT[w.kind](w.count)}</span>
            </div>
            ))}
        </div>

        <Link href="/progress" style={{ alignSelf: "flex-end", fontSize: 13, color: "var(--stone)", textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>
            Full progress →
        </Link>
        </main>
    );
}