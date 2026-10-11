"use client";

// OCR test page: Nutrislice screenshot → Tesseract → your parseLabel → your isPlausible.
// Everything runs on the phone; the image never leaves it.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createWorker } from "tesseract.js";
import { parseLabel, type LabelFacts } from "@/core/labelParser";
import { atwaterKcal, isPlausible } from "@/core/atwater";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

export default function OcrPage() {
  const workerRef = useRef<OcrWorker | null>(null);   // one OCR engine, reused for every image
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState("Pick a Nutrislice screenshot. Include the Serving Size line.");
  const [text, setText] = useState("");
  const [facts, setFacts] = useState<LabelFacts | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Shut the engine down when you leave the page.
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // Free the previous preview image's memory whenever a new one replaces it.
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);

  async function getWorker(): Promise<OcrWorker> {
    if (!workerRef.current) {
      setStatus("Loading the OCR engine (first time only)…");
      workerRef.current = await createWorker("eng");
    }
    return workerRef.current;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    setText("");
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
      setStatus(parsed ? "Done." : "No calories found. Is the whole label in the screenshot?");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  // Atwater estimate, only when all three macros were read.
  const expected =
    facts && facts.proteinG !== null && facts.carbsG !== null && facts.fatG !== null
      ? atwaterKcal({ proteinG: facts.proteinG, carbsG: facts.carbsG, fatG: facts.fatG })
      : null;
  const plausible = facts ? isPlausible(facts) : null;    // your code

  const grams = (v: number | null) => (v === null ? "not found" : `${v} g`);

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/" style={{ fontSize: 15, textDecoration: "none" }}>← Today</Link>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Label reader</h1>
      <div className="muted">Screenshot → OCR → parseLabel → Atwater check</div>

      <label className="card" style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
        <span style={{ fontWeight: 500 }}>Nutrition screenshot</span>
        {image && <img src={image} alt="Your screenshot" style={{ width: "100%", borderRadius: 16 }} />}
        <input type="file" accept="image/*" onChange={onPick} disabled={busy} />
      </label>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 500 }}>{status}</div>
        {ms !== null && <div className="muted">OCR took {Math.round(ms)} ms</div>}
      </div>

      {facts && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 28, fontWeight: 600 }}>{facts.kcal} kcal</span>
            <span
              style={{
                fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                background: plausible ? "var(--matcha)" : "var(--ink)",
                color: plausible ? "var(--ink)" : "var(--paper)",
              }}
            >
              {plausible ? "Plausible" : "Check this"}
            </span>
          </div>
          <Row k="Serving size" v={facts.servingSize ?? "not found"} />
          <Row k="Protein" v={grams(facts.proteinG)} />
          <Row k="Carbs" v={grams(facts.carbsG)} />
          <Row k="Fat" v={grams(facts.fatG)} />
          {expected !== null && <Row k="Macros predict (4P + 4C + 9F)" v={`${Math.round(expected)} kcal`} />}
        </div>
      )}

      {text && (
        <details className="card">
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>Raw OCR text</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: "10px 0 0" }}>{text}</pre>
        </details>
      )}
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--hairline)", paddingTop: 6 }}>
      <span className="muted" style={{ fontSize: 15 }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}