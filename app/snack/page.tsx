"use client";

// T18. Snap a nutrition label, say how much of the packet you ate, log it.
// OCR runs on the phone; the label photo is never uploaded or saved.
// No Safiye on this screen. No kcal anywhere when "hide calorie numbers" is on.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabase";
import { parseLabel, type LabelFacts } from "@/core/labelParser";
import { portionOfPacket, readServingsPerPacket, type PacketPick } from "@/core/packet";
import { scaleDish } from "@/core/portion";
import { clueAfterSave } from "@/lib/clueAfterSave";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
const FRACTIONS: { of: number; label: string }[] = [
  { of: 0.25, label: "¼" }, { of: 0.5, label: "½" }, { of: 0.75, label: "¾" }, { of: 1, label: "All" },
];
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

export default function Snack() {
  const router = useRouter();
  const workerRef = useRef<OcrWorker | null>(null);
  const [hideNumbers, setHideNumbers] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [facts, setFacts] = useState<LabelFacts | null>(null);
  const [perPacket, setPerPacket] = useState<number | null>(null);   // read from the label
  const [perPacketTyped, setPerPacketTyped] = useState("");           // asked when it wasn't
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"fraction" | "servings">("fraction");
  const [of, setOf] = useState<number | null>(null);
  const [servingsTyped, setServingsTyped] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("hide_numbers").maybeSingle();
      setHideNumbers(Boolean(p?.hide_numbers));
    })();
    return () => { workerRef.current?.terminate(); };
  }, [router]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";                        // lets you retake the same photo
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setFacts(null); setPerPacket(null); setPerPacketTyped(""); setOf(null); setError(null);
    setReading(true);
    try {
      if (!workerRef.current) { setStatus("Getting the label reader ready (first time only)…"); workerRef.current = await createWorker("eng"); }
      setStatus("Reading the label…");
      const { data } = await workerRef.current.recognize(file);
      const parsed = parseLabel(data.text);                 // your code
      setFacts(parsed);
      setPerPacket(readServingsPerPacket(data.text));       // your code
      setStatus(parsed ? null : "Couldn't find the calories. Try again with the whole label in the photo, flat and in good light.");
    } catch (err) {
      setStatus(`The label reader failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReading(false);
    }
  }

  // What you picked -> servings, through your portionOfPacket.
  const packetSize = perPacket ?? (Number.isFinite(num(perPacketTyped)) && num(perPacketTyped) > 0 ? num(perPacketTyped) : null);
  let servings: number | null = null;
  let pickProblem: string | null = null;
  const pick: PacketPick | null = mode === "fraction" ? (of === null ? null : { kind: "fraction", of }) : { kind: "servings", n: num(servingsTyped) };
  if (pick) {
    try { servings = portionOfPacket(pick, packetSize); }
    catch { pickProblem = mode === "servings" ? "Servings must be more than 0." : "That packet size doesn't look right."; }
  }
  const needsPacketSize = mode === "fraction" && of !== null && perPacket === null;
  const scaled = facts && servings !== null
    ? scaleDish({ kcal: facts.kcal, protein_g: facts.proteinG, carbs_g: facts.carbsG, fat_g: facts.fatG }, servings)
    : null;
  const canLog = Boolean(facts && scaled && name.trim() && !busy);

  async function onLog() {
    if (!facts || !scaled || servings === null) return;
    setBusy(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const at = new Date().toISOString();
    const { error } = await supabase.from("meals").insert({
      user_id: session.user.id,
      eaten_at: at,
      route: "label",
      dish_id: null,
      dish_name: name.trim(),
      portion: servings,
      kcal: scaled.kcal,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
      photo_key: null,                          // the label photo stays nowhere
    });
    if (error) { setBusy(false); setError(error.message); return; }
    const earned = await clueAfterSave(session.user.id, at);
    router.push(earned ? `/?clue=${earned}` : "/");
  }

  const chip = (on: boolean): React.CSSProperties => ({
    flex: 1, minHeight: 44, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 17, cursor: "pointer",
    background: on ? "var(--ink)" : "#fff", color: on ? "var(--paper)" : "var(--ink)",
  });
  const field: React.CSSProperties = { minHeight: 44, borderRadius: 14, border: "1px solid #DADAD4", padding: "0 14px", fontSize: 17, fontFamily: "inherit", background: "#fff" };
  const sv = (n: number) => `${n} serving${n === 1 ? "" : "s"}`;

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 34, letterSpacing: "-0.02em" }}>Snack from a label</h1>

      <label className="card" style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
        <span style={{ fontWeight: 500 }}>{facts ? "Retake the label" : "Snap the nutrition label"}</span>
        {preview && <img src={preview} alt="The label you just took" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 16 }} />}
        <input type="file" accept="image/*" capture="environment" onChange={onPick} disabled={reading || busy} />
        <span className="muted" style={{ fontSize: 13 }}>Read on your phone. The photo isn't saved.</span>
      </label>

      {status && <div className="card" role="status">{status}</div>}

      {facts && (
        <>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label htmlFor="snack-name" style={{ fontSize: 13, color: "var(--stone)" }}>What is it?</label>
            <input id="snack-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kind bar" style={field} autoComplete="off" />
            <div style={{ fontSize: 13, color: "var(--stone)" }}>
              Per serving{facts.servingSize ? ` (${facts.servingSize})` : ""}{hideNumbers ? "" : `: ${facts.kcal} kcal`}
              {perPacket !== null && ` · ${perPacket} per packet`}
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--stone)" }}>How much did you have?</div>
            <div role="radiogroup" aria-label="How much of the packet" style={{ display: "flex", gap: 6 }}>
              {FRACTIONS.map((f) => (
                <button key={f.of} type="button" role="radio" aria-checked={mode === "fraction" && of === f.of}
                  onClick={() => { setMode("fraction"); setOf(f.of); }} style={chip(mode === "fraction" && of === f.of)}>
                  {f.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setMode(mode === "servings" ? "fraction" : "servings")}
              style={{ ...chip(mode === "servings"), flex: "none", fontSize: 15 }}>
              {mode === "servings" ? "Use part of the packet instead" : "Count servings instead"}
            </button>

            {mode === "servings" && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
                <input inputMode="decimal" value={servingsTyped} onChange={(e) => setServingsTyped(e.target.value)} style={{ ...field, width: 90 }} aria-label="Servings" />
                servings
              </label>
            )}

            {needsPacketSize && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 15 }}>
                How many servings in the packet?
                <input inputMode="decimal" value={perPacketTyped} onChange={(e) => setPerPacketTyped(e.target.value)} placeholder="Look for “servings per container”" style={field} />
              </label>
            )}

            {pickProblem && <div className="alert" role="alert">{pickProblem}</div>}
            {scaled && servings !== null && (
              <div style={{ fontSize: 15 }}>
                = {sv(servings)}{hideNumbers ? "" : ` · ${scaled.kcal} kcal`}
              </div>
            )}
          </div>

          {error && <div className="alert" role="alert">{error}</div>}
          <button type="button" className="btn" onClick={onLog} disabled={!canLog}
            style={{ minHeight: 52, borderRadius: 18, border: "none", fontSize: 17, fontFamily: "inherit",
              background: canLog ? "var(--ink)" : "#DADAD4", color: canLog ? "var(--paper)" : "var(--stone)" }}>
            {busy ? "Logging…" : "Log snack"}
          </button>
        </>
      )}
    </main>
  );
}