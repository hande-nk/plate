"use client";

// T41a: "Missing something?" under the matcher's top 8 on /log.
// Search your whole library (same hall first) with Naz's searchDishes; tap a result to add it to the plate.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { searchDishes } from "@/core/search";

export type LibraryDish = {
  id: number; name: string; hall: string | null; serving_size: string | null;
  kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null;
  source: string; count_per_serving: number | null;
};

export function MissingDish({ hall, pickedIds, onPick, hideNumbers = false }: {
  hall: string | null;              // the hall the photo was taken at, if known
  pickedIds: number[];              // dishes already on the plate (top 8 picks + earlier searches)
  onPick: (dish: LibraryDish) => void;
  hideNumbers?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [lib, setLib] = useState<LibraryDish[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);

    // Load the library once, the first time the box opens
    useEffect(() => {
        if (!open || lib) return;
        supabase.from("dishes")
        .select("id, name, hall, serving_size, kcal, protein_g, carbs_g, fat_g, source, count_per_serving")
        .then(({ data, error }) => {
            if (error) return setError(error.message);
            // order parts you skipped are saved at 0 kcal so they never ask again; keep them out of search
            setLib(((data ?? []) as LibraryDish[]).filter((d) => !(d.source === "order" && d.kcal === 0)));
        });
    }, [open, lib]);

    useEffect(() => { if (open) input.current?.focus(); }, [open]);

    const results = lib ? searchDishes(q, lib, { hall, exclude: pickedIds, limit: 8 }) : [];

    if (!open) {
        return (
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)} style={{ border: "none" }}>
            Missing something? Search your dishes
        </button>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input ref={input} type="search" inputMode="search" autoComplete="off" autoCorrect="off" spellCheck={false}
            aria-label="Search your dishes" placeholder={hall ? `Search dishes (${hall} first)` : "Search your dishes"}
            value={q} onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minHeight: 44, padding: "0 14px", borderRadius: 14, border: "1px solid var(--hairline)", fontSize: 16, background: "#fff" }} />
            <button type="button" className="btn-quiet" onClick={() => { setOpen(false); setQ(""); }} style={{ border: "none", minHeight: 44 }}>Done</button>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}
        {!lib && !error && <div className="muted" style={{ fontSize: 13 }}>Loading your dishes…</div>}

        {lib && q.trim() !== "" && (
            <ul role="list" aria-label="Matching dishes" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {results.map((d) => (
                <li key={d.id}>
                <button type="button" className="option" onClick={() => { onPick(d); setQ(""); input.current?.focus(); }}
                    style={{ width: "100%", minHeight: 52, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", padding: "8px 14px" }}>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                    <span>{d.name}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{[d.hall, d.serving_size].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="muted" style={{ fontSize: 13, flex: "none" }}>{hideNumbers ? "Add" : `${Math.round(d.kcal)} kcal`}</span>
                </button>
                </li>
            ))}
            {results.length === 0 && (
                <li className="muted" style={{ fontSize: 13, padding: "4px 2px" }}>
                Not in your library yet. <Link href="/add">Add it from a label</Link>
                </li>
            )}
            </ul>
        )}
        </div>
    );
}