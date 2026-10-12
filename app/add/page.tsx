"use client";

import { useEffect, useState, useRef } from "react";
import type { Hall } from "@/core/router";
import { createWorker } from "tesseract.js";
import { parseLabel, type LabelFacts } from "@/core/labelParser";
import { atwaterKcal, isPlausible } from "@/core/atwater";
import { guessName } from "@/core/dishName";
import { optionalNumber,toDishRow  } from "@/core/dish";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


type AddWorker = Awaited<ReturnType<typeof createWorker>>;


const HALLS: { id: Hall; label: string } [] = [
    { id: "carm", label: "Carm" },
    { id: "dewick", label: "Dewick" },
    { id: "hodge", label: "Hodge" },
    { id: "kindlevan", label:"Kindlevan" },
];

const inputStyle: React.CSSProperties = {
    display: "block", width:"100%", boxSizing: "border-box", minHeight: "var(--tap)",
    marginTop: 6, padding: "0 14px", border: "1px solid var(--hairline)",
    borderRadius: "var(--radius-control)", background: "var(--paper)", color: "var(--ink)",
    fontSize: 17, fontFamily: "inherit",
};

export default function AddPage() {
    const workerRef = useRef<AddWorker | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [status, setStatus] = useState("Pick a Nutrislice screenshot. Include the Serving Size line.");
    const [text, setText] = useState("");
    const [facts, setFacts] = useState<LabelFacts | null>(null);
    const [ms, setMs] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState("");
    const [hall, setHall] = useState<Hall>("dewick");
    const [kcal, setKcal] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    const [serving, setServing] = useState("");
    const [saving, setSaving] = useState(false);
    const [ready, setReady] = useState(false);
    const router = useRouter();
    const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
    const [tries, setTries] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
        
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);

        });
    }, [router]);

    function fail(text: string) { setNotice({kind: "error", text: text}); setTries((t) => t + 1); }


    // Shut the engine down when you leave the page.
    useEffect(() => () => { workerRef.current?.terminate(); }, []);

    // Free the previous preview image's memory whenever a new one replaces it.
    useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);

    async function getWorker(): Promise<AddWorker>{
        if(!workerRef.current) {
            setStatus("Loading the label reader (first time only)...");
            workerRef.current = await createWorker("eng");
        }
        return workerRef.current;
    }
    
    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImage(URL.createObjectURL(file));
        setText("");
        setNotice(null);
        setConfirmed(false);
        setFacts(null);
        setMs(null);
        setBusy(true);
        try {
            const worker = await getWorker();
            setStatus("Reading the label…");
            const t0 = performance.now();
            const { data } = await worker.recognize(file);
            setMs(performance.now() - t0);
            setText(data.text);
    
            const parsed = parseLabel(data.text);
            setFacts(parsed);
            
            if(!parsed) {
                setStatus("No calories found. Is the whole label in the screenshot?");
                return;
            }
            setKcal(String(parsed.kcal));
            setProtein(parsed.proteinG === null ? "" : String(parsed.proteinG));
            setCarbs(parsed.carbsG === null ? "" : String(parsed.carbsG));
            setFat(parsed.fatG === null ? "" : String(parsed.fatG));
            setServing(parsed.servingSize ?? "");
            setName(guessName(data.text) ?? "");
            setStatus("Check the numbers, then save.");
        } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setBusy(false);
        }
    }

    async function onSave() {
        const edited: LabelFacts = {
            kcal: optionalNumber(kcal) ?? NaN,
            servingSize: serving.trim() || null,
            proteinG: optionalNumber(protein),
            carbsG: optionalNumber(carbs),
            fatG: optionalNumber(fat),
        };

        const row = toDishRow(edited, name, hall);
        if (!row) { fail("Add a name and calories."); return; }
        const { proteinG: p, carbsG: c, fatG: f } = edited;

        const predicted =
            p !== null && c !== null && f !== null
                ? Math.round(atwaterKcal({ ...edited, proteinG: p, carbsG: c, fatG: f }))
                : null;

        if(!isPlausible(edited) && !confirmed){
            setConfirmed(true);
            fail(
                predicted !== null
                ? `Calories don't match the macros (they add up to about ${predicted}). Check the numbers, or tap Save again to keep them.`
                : "These numbers look off. Check them, or tap Save again to keep them."
            );
            return;
        }

        setSaving(true);
        const { error } = await supabase.from("dishes").insert(row);
        setSaving(false);

        if(error) {
            //23505: unique rule violated
            fail(error.code === "23505" ? "Already in your library." : error.message);
            return;
        }

        
        
        setNotice({kind: "ok", text: `Saved ${row.name}`});
        
    }

    
    if (!ready) return null;
    

    return(
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="muted">Dish library</div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Add a dish</h1>

            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 20 }}>
                <label className="btn" style={{ display: "flex", alignItems: "center", justifyContent:"center"}}>
                    {busy ? "Reading..." : "Choose screenshot"}
                    <input type="file" accept="image/*" onChange={onPick} disabled={busy} hidden />
                </label>
                <div className="muted">{status}</div>
                {image && <img src={image} alt="" style={{ width: "100%", borderRadius: 14}} /> }
                <label className="muted">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Blackened Halal Chicken" style={inputStyle} />
                </label>

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
                <label className="muted">
                    Calories
                    <input value={kcal} onChange={(e) => {setKcal(e.target.value); setConfirmed(false)} } inputMode="decimal" style={inputStyle} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <label className="muted">
                        Protein
                        <input value={protein} onChange={(e) => {setProtein(e.target.value); setConfirmed(false)}} inputMode="decimal" style={inputStyle} />
                    </label>

                    <label className="muted">
                        Carbs
                        <input value={carbs} onChange={(e) => {setCarbs(e.target.value);  setConfirmed(false)}} inputMode="decimal" style={inputStyle} />
                    </label>    

                    <label className="muted">
                        Fat
                        <input value={fat} onChange={(e) => {setFat(e.target.value); setConfirmed(false)}} inputMode="decimal" style={inputStyle} />
                    </label>
                </div>

                
                <label className="muted">
                    Serving Size
                    <input value={serving} onChange={(e) => setServing(e.target.value)} style={inputStyle} />
                </label>


                {notice && (
                    <div key={tries} role={notice.kind === "error" ? "alert" : "status"}
                        className={notice.kind === "error" ? "alert" : "ok"}>{notice.text}</div>
                )}

                <details><summary className="muted">Raw OCR text</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{text}</pre></details>
                
                <button type="button" className="btn" onClick={onSave} disabled={saving || busy}>
                    Save
                </button>
            </div>
        </main>
    );
}