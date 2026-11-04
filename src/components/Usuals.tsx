"use client";

// T38. "Your usuals" on the + screen: plates you log again and again (your topUsuals), one tap to log again now.
// Hidden until something has been logged twice in 30 days. No Safiye here. No kcal when numbers are hidden.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { plateKey, topUsuals, type Usual, type UsualPlate } from "@/core/usuals";
import { clueAfterSave } from "@/lib/clueAfterSave";

type Row = {
  eaten_at: string; photo_key: string | null; route: string; place: string | null;
  dish_id: number | null; dish_name: string; portion: number | null;
  kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null;
};

// routes: only usuals of these kinds (the snack screen passes ["label"], the order screen ["app-order"]). Omit for all.
export function Usuals({ routes }: { routes?: string[] } = {}) {
    const router = useRouter();
    const [usuals, setUsuals] = useState<Usual[]>([]);
    const [full, setFull] = useState<Map<string, Row[]>>(new Map());   // plateKey -> the latest full rows (with macros)
    const [hideNumbers, setHideNumbers] = useState(false);
    const [open, setOpen] = useState<Usual | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
        const since = new Date(Date.now() - 31 * 864e5).toISOString();
        const [p, m] = await Promise.all([
            supabase.from("profiles").select("hide_numbers, tz").maybeSingle(),
            supabase.from("meals").select("eaten_at, photo_key, route, place, dish_id, dish_name, portion, kcal, protein_g, carbs_g, fat_g")
            .gte("eaten_at", since).order("eaten_at"),
        ]);
        setHideNumbers(Boolean(p.data?.hide_numbers));
        const tz: string = p.data?.tz ?? "America/New_York";

        // Rows -> plates (same eaten_at + photo_key), as everywhere else in Plate.
        const byPlate = new Map<string, Row[]>();
        for (const r of (m.data ?? []) as Row[]) {
            const k = `${r.eaten_at}|${r.photo_key ?? ""}`;
            byPlate.set(k, [...(byPlate.get(k) ?? []), r]);
        }
        const plates: UsualPlate[] = [];
        const latest = new Map<string, Row[]>();
        for (const rows of byPlate.values()) {
            if (routes && !routes.includes(rows[0].route)) continue;
            const uRows = rows.map((r) => ({ dish_id: r.dish_id, dish_name: r.dish_name, portion: r.portion ?? 1, kcal: Number(r.kcal) }));
            plates.push({ at: rows[0].eaten_at, route: rows[0].route, place: rows[0].place, rows: uRows });
            latest.set(plateKey(uRows), rows);                 // ordered by time, so the last one wins
        }
        setFull(latest);
        setUsuals(topUsuals(plates, new Date(), tz));      // your code
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routes?.join(",")]);

    async function logAgain(u: Usual) {
        setBusy(true); setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login"); return; }
        const at = new Date().toISOString();
        const rows = (full.get(u.key) ?? []).map((r) => ({
        user_id: session.user.id, eaten_at: at, route: r.route, place: r.place,
        dish_id: r.dish_id, dish_name: r.dish_name, portion: r.portion ?? 1,
        kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g,
        photo_key: null,
        }));
        const { error } = await supabase.from("meals").insert(rows);
        if (error) { setBusy(false); setError(error.message); return; }
        const earned = await clueAfterSave(session.user.id, at);
        router.push(earned ? `/?clue=${earned}` : "/");
    }

    if (usuals.length === 0) return null;
    const total = open ? Math.round(open.rows.reduce((s, r) => s + r.kcal, 0)) : 0;

    return (
        <>
        <div style={{ display: "grid", gap: 8 }}>
            <div className="muted" style={{ fontSize: 13 }}>Your usuals</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {usuals.map((u) => (
                <button key={u.key} type="button" onClick={() => setOpen(u)}
                style={{ flex: "none", maxWidth: 220, minHeight: 44, padding: "8px 14px", borderRadius: 16, border: "1px solid var(--hairline, #E2E2DC)",
                    background: "#fff", fontFamily: "inherit", fontSize: 14, textAlign: "left", cursor: "pointer", color: "var(--ink)" }}>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.label}</div>
                <div className="muted" style={{ fontSize: 11 }}>{u.count}× this month</div>
                </button>
            ))}
            </div>
        </div>

        {open && (
            <div role="dialog" aria-modal="true" aria-label="Log this again" onClick={() => !busy && setOpen(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: 430, background: "var(--paper)", borderRadius: "28px 28px 0 0", padding: "20px 18px 36px", display: "grid", gap: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 500 }}>Log this again now?</div>
                <div style={{ fontSize: 15, lineHeight: 1.45 }}>
                {open.rows.map((r) => (r.portion !== 1 ? `${r.dish_name} × ${r.portion}` : r.dish_name)).join(", ")}
                </div>
                {!hideNumbers && <div className="muted" style={{ fontSize: 13 }}>≈ {total} kcal</div>}
                {error && <div className="alert" role="alert">{error}</div>}
                <button type="button" onClick={() => logAgain(open)} disabled={busy}
                style={{ minHeight: 52, borderRadius: 18, border: "none", fontSize: 17, fontFamily: "inherit", background: "var(--ink)", color: "var(--paper)" }}>
                {busy ? "Logging…" : "Log it"}
                </button>
                <button type="button" onClick={() => setOpen(null)} disabled={busy}
                style={{ minHeight: 44, border: "none", background: "none", fontSize: 15, fontFamily: "inherit", color: "var(--stone)" }}>
                Not this time
                </button>
            </div>
            </div>
        )}
        </>
    );
}