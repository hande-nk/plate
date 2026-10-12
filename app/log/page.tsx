"use client"

import { useEffect, useState, useRef } from "react";
import type { Hall } from "@/core/router";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


const HALLS: { id: Hall; label: string } [] = [
    { id: "carm", label: "Carm" },
    { id: "dewick", label: "Dewick" },
    { id: "hodge", label: "Hodge" },
    { id: "kindlevan", label:"Kindlevan" },
];

export default function LogPage() {
    const worker = useRef<Worker | null>(null);
    const [ready, setReady] = useState(false);
    const [hall, setHall] = useState<Hall>("kindlevan");
    const router = useRouter();
    const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
    const [tries, setTries] = useState(0);
    const [busy, setBusy] = useState(false);
    
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);

        });
    }, [router]);

    function fail(text: string) { setNotice({kind: "error", text: text}); setTries((t) => t + 1); }
    
    async function onSnap(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if(!file) return;
    }
    
    type Dish = { id: number; name: string; kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null};
    const [dishes, setDishes] = useState<Dish[]> ([]);

    useEffect(() => {
        if(!ready) return; //waiting for the login check
        supabase
            .from("dishes")
            .select("id, name, kcal, protein_g, carbs_g, fat_g")
            .eq("hall", hall) //only this hall's dishes
            .then(({data, error}) => {
                if (error) fail(error.message);
                else setDishes(data ?? []); 
            });
    }, [ready, hall]); //rerun when the hall changes

    if (!ready) return null;

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="muted"> Log a meal</div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>
                What's on your plate?
            </h1>

            <div role="group" aria-label="Dining hall" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {HALLS.map((h) => {
                    const selected = hall === h.id;
                    return (
                    <button
                        key={h.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setHall(h.id)}
                        style={{
                        minHeight: "var(--tap)", borderRadius: "var(--radius-control)",
                        fontSize: 15, fontFamily: "inherit", cursor: "pointer", color: "var(--ink)",
                        border: selected ? "1px solid var(--matcha-line)" : "1px solid var(--hairline)",
                        background: selected ? "var(--matcha)" : "var(--card)",
                        }}
                    >
                        {h.label}
                    </button>
                    );
                })}
            </div>

            <div className="muted">{dishes.length} dishes at  {HALLS.find((h) => h.id === hall)?.label}</div>

            <label className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center"}}>
                {busy ? "Matching...." : "Sanp your plate"}
                <input type="file" accept="image/*" capture="environment" onChange={onSnap} disabled={busy || dishes.length === 0} hidden />
            </label>
            {notice && (
                <div key={tries} role={notice.kind === "error" ? "alert" : "status"}
                    className={notice.kind === "error" ? "alert" : "ok"}>{notice.text}</div>
            )}
        </main>
        
    );
}