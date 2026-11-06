"use client";

// Sunday edition: next week's planned treat (your planTreats). Keep puts it on Today that day; Swap picks another;
// Skip is a normal choice, never a miss. Treats are planned and enjoyed, never "earned".

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { planTreats, type Treat, type Proposal } from "@/core/treats";
import { weekdayRoom } from "@/lib/treatRoom";
import Link from "next/link";

type Row = { id: number; treat_id: number; week_of: string; day: string; status: string };
type TreatRow = Treat & { place: string | null; link: string | null };

export function TreatProposal({ weekOf, tz, target }: { weekOf: string; tz: string; target: number | null }) {
    const [treats, setTreats] = useState<TreatRow[]>([]);
    const [current, setCurrent] = useState<Row | null>(null);
    const [state, setState] = useState<"loading" | "none" | "ready">("loading");
    const [busy, setBusy] = useState(false);

    async function propose(exclude: number[]) {
        const [t, h] = await Promise.all([
        supabase.from("treats").select("id, name, outing, place, link"),
        supabase.from("treat_proposals").select("id, treat_id, week_of, day, status"),
        ]);
        const all = (t.data ?? []) as TreatRow[];
        setTreats(all);
        const rows = (h.data ?? []) as Row[];
        const history: Proposal[] = rows.filter((r) => r.status !== "swapped" && r.week_of < weekOf).map((r) => ({ treatId: r.treat_id, weekOf: r.week_of, day: r.day }));
        const room = await weekdayRoom(target, tz);
        const [pick] = planTreats(weekOf, all.filter((x) => !exclude.includes(x.id)), history, room);     // your code
        if (!pick) { setCurrent(null); setState("none"); return; }
        const { data } = await supabase.from("treat_proposals").insert({ week_of: weekOf, treat_id: pick.treatId, day: pick.day }).select("id, treat_id, week_of, day, status").single();
        setCurrent(data as Row); setState("ready");
    }

    useEffect(() => {
        (async () => {
        await supabase.rpc("seed_starter_treats");
        const [{ data: t }, { data: p }] = await Promise.all([
            supabase.from("treats").select("id, name, outing, place, link"),
            supabase.from("treat_proposals").select("id, treat_id, week_of, day, status").eq("week_of", weekOf).neq("status", "swapped").order("created_at", { ascending: false }).limit(1),
        ]);
        setTreats((t ?? []) as TreatRow[]);
        const existing = ((p ?? []) as Row[])[0];
        if (existing) { setCurrent(existing); setState("ready"); }
        else await propose([]);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOf]);

    async function keep() {
        if (!current) return;
        setBusy(true);
        const t = treats.find((x) => x.id === current.treat_id);
        await supabase.from("planned_treats").upsert({ day: current.day, name: t?.name ?? "Treat", eaten_at: null }, { onConflict: "user_id,day" });
        await supabase.from("treat_proposals").update({ status: "kept" }).eq("id", current.id);
        setCurrent({ ...current, status: "kept" }); setBusy(false);
    }
    async function swap() {
        if (!current) return;
        setBusy(true);
        await supabase.from("treat_proposals").update({ status: "swapped" }).eq("id", current.id);
        const { data } = await supabase.from("treat_proposals").select("treat_id").eq("week_of", weekOf);
        await propose(((data ?? []) as { treat_id: number }[]).map((r) => r.treat_id));
        setBusy(false);
    }
    async function skip() {
        if (!current) return;
        setBusy(true);
        await supabase.from("treat_proposals").update({ status: "skipped" }).eq("id", current.id);
        setCurrent({ ...current, status: "skipped" }); setBusy(false);
    }

    if (state === "loading") return null;
    const t = current ? treats.find((x) => x.id === current.treat_id) : null;
    const dayLabel = current ? new Date(`${current.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : "";
    const btn = (primary: boolean): React.CSSProperties => ({ flex: 1, minHeight: 46, borderRadius: 16, fontFamily: "inherit", fontSize: 15, cursor: "pointer",
        border: primary ? "none" : "1.5px solid var(--ink)", background: primary ? "var(--ink)" : "#fff", color: primary ? "var(--paper)" : "var(--ink)" });

    return (
        <div className="card" style={{ display: "grid", gap: 10, padding: 16, borderRadius: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, color: "var(--stone)" }}>Next week&apos;s treat</div>
            <Link href="/treats" style={{ fontSize: 12, color: "var(--stone)" }}>Your board →</Link>
        </div>
        {state === "none" || !t || !current ? (
            <div style={{ fontSize: 15 }}>No treat planned for next week. Add a few to your board and one will show up here on Sunday.</div>
        ) : (
            <>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{t.name}</div>
            <div className="muted" style={{ fontSize: 14 }}>
                {dayLabel}{t.place ? ` · ${t.place}` : ""}{t.outing ? " · bring a friend" : ""}
            </div>
            {t.link && <a href={t.link} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open the link</a>}
            {current.status === "proposed" ? (
                <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={busy} onClick={keep} style={btn(true)}>Keep</button>
                <button type="button" disabled={busy} onClick={swap} style={btn(false)}>Swap</button>
                <button type="button" disabled={busy} onClick={skip} style={btn(false)}>Skip</button>
                </div>
            ) : (
                <div className="muted" style={{ fontSize: 13 }}>
                {current.status === "kept" ? `Planned. It shows on Today on ${dayLabel}.` : "Skipped this week. That's a fine choice too."}
                </div>
            )}
            </>
        )}
        </div>
    );
}