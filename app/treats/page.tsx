"use client";

// T34. Your treat board: places and treats you'd like to plan for. Six real starters near Tufts to begin with.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type T = { id: number; name: string; place: string | null; link: string | null; outing: boolean; source: string };

export default function TreatBoard() {
    const router = useRouter();
    const [list, setList] = useState<T[] | null>(null);
    const [name, setName] = useState(""); const [place, setPlace] = useState(""); const [link, setLink] = useState(""); const [outing, setOuting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        const { data, error } = await supabase.from("treats").select("id, name, place, link, outing, source").order("created_at");
        if (error) setError(error.message); else setList((data ?? []) as T[]);
    }
    useEffect(() => {
        (async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { router.replace("/login"); return; }
        await supabase.rpc("seed_starter_treats");
        await load();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        const l = link.trim();
        const { error } = await supabase.from("treats").insert({ name: name.trim(), place: place.trim() || null, link: l || null, outing,
        source: /instagram\.com/i.test(l) ? "instagram" : "you" });
        if (error) return setError(error.message);
        setName(""); setPlace(""); setLink(""); setOuting(false); load();
    }
    async function remove(id: number) {
        const { error } = await supabase.from("treats").delete().eq("id", id);
        if (error) setError(error.message); else load();
    }

    const field: React.CSSProperties = { minHeight: 44, borderRadius: 14, border: "1px solid #DADAD4", padding: "0 12px", fontSize: 16, fontFamily: "inherit", background: "#fff" };
    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 34, letterSpacing: "-0.02em" }}>Treat board</h1>
        <div className="muted" style={{ fontSize: 14 }}>Plate plans one of these for a day with room, and asks you on Sunday. Planned and enjoyed, never earned.</div>
        {error && <div className="alert" role="alert">{error}</div>}

        {list?.map((t) => (
            <div key={t.id} className="card" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 500 }}>{t.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{t.place ?? ""}{t.outing ? `${t.place ? " · " : ""}with a friend` : ""}</div>
                {t.link && <a href={t.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{t.source === "instagram" ? "Instagram post" : "Link"}</a>}
            </div>
            <button type="button" onClick={() => remove(t.id)} aria-label={`Remove ${t.name}`}
                style={{ minWidth: 44, minHeight: 44, border: "none", background: "none", fontSize: 20, color: "var(--stone)", cursor: "pointer" }}>×</button>
            </div>
        ))}
        <div className="muted" style={{ fontSize: 11 }}>Starters checked Nov 6, 2026. Places change, so check before you go.</div>

        <form onSubmit={add} className="card" style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 500 }}>Add a treat</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What (e.g. pistachio baklava)" style={field} aria-label="Treat" />
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where (optional)" style={field} aria-label="Place" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link or Instagram post (optional)" inputMode="url" style={field} aria-label="Link" />
            <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <input type="checkbox" checked={outing} onChange={(e) => setOuting(e.target.checked)} style={{ width: 20, height: 20 }} />
            An outing with a friend (Fri to Sun)
            </label>
            <button type="submit" disabled={!name.trim()} style={{ minHeight: 48, borderRadius: 16, border: "none", background: "var(--ink)", color: "var(--paper)", fontSize: 16, fontFamily: "inherit" }}>Add</button>
        </form>
        </main>
    );
}