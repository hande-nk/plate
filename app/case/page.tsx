"use client";

// Story v2: the Case File. Every clue pinned to the plate that found it; locked clues show how close the next one is.
// Your own plate photos fill the polaroids when they're on this phone.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPhoto } from "@/lib/photos";
import { THRESHOLDS } from "@/core/clue";
import { loadCase, saveChoice, type ClueRow, type FoundClue } from "@/lib/caseFile";
import { ClueSheetV2 } from "@/components/ClueSheetV2";
import { FOOD_CROISSANT, FOOD_PLATE, FOOD_WRAP } from "@/lib/storyArt";
import { Safiye } from "@/components/Safiye";

const HALL: Record<string, string> = { hodge: "Hodgdon", carm: "Carm", dewick: "Dewick", kindlevan: "Kindlevan" };
const RED = "#B3261E";

function foodFor(f: FoundClue) {
  const n = (f.ctx?.dishes ?? []).join(" ").toLowerCase();
  return /croissant|bagel|muffin|pastry/.test(n) ? FOOD_CROISSANT : /wrap|sando|sub|sandwich|burrito/.test(n) ? FOOD_WRAP : FOOD_PLATE;
}

export default function CaseRoute() {
  return <Suspense fallback={null}><CasePage /></Suspense>;
}

function CasePage() {
    const router = useRouter();
    const params = useSearchParams();
    const [clues, setClues] = useState<ClueRow[]>([]);
    const [found, setFound] = useState<FoundClue[] | null>(null);
    const [choices, setChoices] = useState<Map<number, string>>(new Map());
    const [platesEver, setPlatesEver] = useState(0);
    const [photos, setPhotos] = useState<Map<number, string>>(new Map());
    const [open, setOpen] = useState<number | null>(null);

    async function load() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { router.replace("/login"); return; }
        const [k, m] = await Promise.all([loadCase(), supabase.from("meals").select("eaten_at, photo_key")]);
        setClues(k.clues); setFound(k.found); setChoices(k.choices);
        setPlatesEver(new Set(((m.data ?? []) as { eaten_at: string; photo_key: string | null }[]).map((r) => `${r.eaten_at}|${r.photo_key ?? ""}`)).size);
        const n = Number(params.get("open"));
        if (n && k.found.some((f) => f.clue.ord === n)) setOpen(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (!found) return;
        const urls: string[] = []; let alive = true;
        (async () => {
        const next = new Map<number, string>();
        for (const f of found) {
            if (!f.photoKey) continue;
            try { const b = await getPhoto(f.photoKey); if (b) { const u = URL.createObjectURL(b); urls.push(u); next.set(f.clue.ord, u); } } catch { /* fine */ }
        }
        if (alive) setPhotos(next);
        })();
        return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
    }, [found]);

    if (!found) return null;
    const total = clues.length || 8;
    const byOrd = new Map(found.map((f) => [f.clue.ord, f]));
    const nextLocked = clues.find((c) => !byOrd.has(c.ord))?.ord ?? null;
    const away = nextLocked ? Math.max(1, (THRESHOLDS[nextLocked - 1] ?? 0) - platesEver) : null;
    const openF = open ? byOrd.get(open) ?? null : null;
    const fmt = (f: FoundClue) => f.ctx
        ? `${f.ctx.hall ? `${HALL[f.ctx.hall] ?? ""} · ` : ""}${new Date(f.ctx.at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: f.ctx.tz })}`
        : new Date(f.foundAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: "#fff", overflow: "hidden", flex: "none" }}><Safiye mood="hmm" size={56} /></div>
            <div>
            <h1 style={{ margin: 0, fontWeight: 500, fontSize: 30, letterSpacing: "-0.02em" }}>Case File No. 1</h1>
            <div className="muted" style={{ fontSize: 13 }}>The Blue Notebook · {found.length} of {total} clues</div>
            </div>
        </div>

        <div style={{ borderRadius: 26, background: "#E7DCC8", padding: "22px 14px 18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "22px 10px", position: "relative" }}>
            {clues.map((c, i) => {
            const f = byOrd.get(c.ord);
            const tilt = [-4, 3, -2, 4, -3, 2, -4, 3][i % 8];
            return (
                <button key={c.ord} type="button" disabled={!f} onClick={() => f && setOpen(c.ord)}
                aria-label={f ? `Clue ${c.ord}, ${c.title}` : `Clue ${c.ord}, locked`}
                style={{ position: "relative", transform: `rotate(${tilt}deg)`, background: "#fff", border: "2px solid var(--ink)", borderRadius: 4, padding: "6px 6px 8px",
                    fontFamily: "inherit", cursor: f ? "pointer" : "default", display: "grid", gap: 4, textAlign: "center", boxShadow: "0 4px 10px rgba(18,18,18,.12)" }}>
                <span aria-hidden="true" style={{ position: "absolute", top: -7, left: "50%", marginLeft: -6, width: 12, height: 12, borderRadius: 6, background: f ? RED : "#B9B2A4" }} />
                <span style={{ aspectRatio: "1", background: f ? "#E9E4DA" : "#EDEDE7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {f && photos.get(c.ord) ? <img src={photos.get(c.ord)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : f ? <svg viewBox="0 0 80 70" width="80%" aria-hidden="true" dangerouslySetInnerHTML={{ __html: foodFor(f) }} />
                    : <span style={{ fontSize: 26, fontWeight: 600, color: "#BDBDB6" }}>?</span>}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{f ? c.title : `Clue ${c.ord}`}</span>
                <span className="muted" style={{ fontSize: 9, lineHeight: 1.2, minHeight: 11 }}>
                    {f ? fmt(f) : c.ord === nextLocked && away ? `${away} ${away === 1 ? "plate" : "plates"} away` : ""}
                </span>
                </button>
            );
            })}
        </div>
        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>Tap a clue to reread it. Every plate you log is a page of her notebook.</div>

        {openF && (
            <ClueSheetV2 f={openF} total={total}
            earlierChoice={openF.clue.choice_from ? choices.get(openF.clue.choice_from) ?? null : null}
            onChoose={async (id) => { await saveChoice(openF.clue.ord, id); await load(); }}
            onClose={() => { setOpen(null); router.replace("/case"); }} />
        )}
        </main>
    );
}