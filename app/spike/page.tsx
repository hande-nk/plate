"use client";

import { useEffect, useRef, useState } from "react";

// Spike: can CLIP match a lunch photo on Naz's iPhone in under 2 seconds?
// Pass = median of 3 runs (after the model is loaded) < 2000 ms. Fail = switch to Path B.

const PASS_MS = 2000;
const MODELS = ["Xenova/clip-vit-base-patch32", "Xenova/clip-vit-base-patch16"];
// A sample of real-looking Tufts dishes. Swap in today's menu from menus.tufts.edu.
const DEFAULT_LABELS = [
  "baked haddock", "grilled chicken breast", "miso salmon bowl", "penne with marinara",
  "lentil soup", "garden salad", "cheese pizza", "stir fried vegetables with rice",
  "chicken burrito bowl", "falafel wrap", "scrambled eggs", "double chocolate cookie",
];

type Result = { label: string; score: number }[];

export default function Spike() {
  const worker = useRef<Worker | null>(null);
  const [device, setDevice] = useState<"webgpu" | "wasm">("wasm");
  const [dtype, setDtype] = useState<"fp32" | "fp16" | "q8" | "q4">("q8");
  const [model, setModel] = useState(MODELS[0]);
  const [labels, setLabels] = useState(DEFAULT_LABELS.join("\n"));
  const [status, setStatus] = useState("Pick a photo of your lunch.");
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [runs, setRuns] = useState<number[]>([]);
  const [top, setTop] = useState<Result | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasGpu, setHasGpu] = useState(false);

  useEffect(() => {
    const ok = typeof navigator !== "undefined" && "gpu" in navigator;
    setHasGpu(ok);
    if (ok) { setDevice("webgpu"); setDtype("fp16"); }
    return () => worker.current?.terminate();
  }, []);

  function call<T>(msg: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const w = worker.current!;
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === "progress") {
          const p = d.p as { status?: string; file?: string; progress?: number };
          if (p.status === "progress" && p.file) setStatus(`Downloading ${p.file.split("/").pop()} ${Math.round(p.progress ?? 0)}%`);
          return;
        }
        if (d.type === "error") reject(new Error(d.message));
        else resolve(d as T);
      };
      w.postMessage(msg);
    });
  }

  async function runTest() {
    if (!image) return;
    setBusy(true); setRuns([]); setTop(null); setLoadMs(null);
    try {
      worker.current?.terminate();
      worker.current = new Worker(new URL("../../src/workers/matcher.worker.ts", import.meta.url), { type: "module" });
      setStatus("Loading model (first time downloads it, then it's cached)…");
      const loaded = await call<{ ms: number }>({ type: "load", model, device, dtype });
      setLoadMs(loaded.ms);
      const ls = labels.split("\n").map(s => s.trim()).filter(Boolean);
      const times: number[] = [];
      for (let i = 0; i < 4; i++) {
        setStatus(i === 0 ? "Warm-up run…" : `Timed run ${i} of 3…`);
        const r = await call<{ ms: number; out: Result }>({ type: "run", imageUrl: image, labels: ls });
        if (i > 0) { times.push(r.ms); setRuns([...times]); }
        setTop(r.out.slice(0, 3));
      }
      const med = [...times].sort((a, b) => a - b)[1];
      setStatus(med < PASS_MS ? `PASS: median ${Math.round(med)} ms. Path A stands.` : `FAIL: median ${Math.round(med)} ms. Try another setting, then Path B.`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const median = runs.length === 3 ? [...runs].sort((a, b) => a - b)[1] : null;
  const select = { minHeight: 44, borderRadius: 14, border: "1px solid #DADAD4", background: "#fff", padding: "0 10px", fontSize: 15, width: "100%" } as const;

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <a href="/" style={{ fontSize: 15, textDecoration: "none" }}>← Today</a>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Speed test</h1>
      <div className="muted">Pass bar: median under {PASS_MS / 1000} s per photo, after loading. {hasGpu ? "WebGPU found." : "No WebGPU here, using WASM."}</div>

      <label className="card" style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
        <span style={{ fontWeight: 500 }}>Lunch photo</span>
        {image && <img src={image} alt="Your lunch photo" style={{ width: "100%", borderRadius: 16, aspectRatio: "1", objectFit: "cover" }} />}
        <input type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setImage(URL.createObjectURL(f)); setStatus("Ready."); }
        }} />
      </label>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="muted">Device
          <select style={select} value={device} onChange={e => setDevice(e.target.value as "webgpu" | "wasm")}>
            <option value="webgpu" disabled={!hasGpu}>webgpu</option><option value="wasm">wasm</option>
          </select>
        </label>
        <label className="muted">Precision
          <select style={select} value={dtype} onChange={e => setDtype(e.target.value as typeof dtype)}>
            <option>fp32</option><option>fp16</option><option>q8</option><option>q4</option>
          </select>
        </label>
        <label className="muted" style={{ gridColumn: "1 / -1" }}>Model
          <select style={select} value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="muted" style={{ gridColumn: "1 / -1" }}>Menu dishes (one per line)
          <textarea value={labels} onChange={e => setLabels(e.target.value)} rows={5} style={{ ...select, padding: 10, fontFamily: "inherit" }} />
        </label>
      </div>

      <button className="btn" disabled={!image || busy} onClick={runTest}>{busy ? "Running…" : "Run 3 timed runs"}</button>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 500 }}>{status}</div>
        {loadMs !== null && <div className="muted">Model load: {Math.round(loadMs)} ms</div>}
        {runs.map((ms, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between" }}><span>Run {i + 1}</span><span>{Math.round(ms)} ms</span></div>)}
        {median !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, borderTop: "1px solid var(--hairline)", paddingTop: 6 }}>
            <span>Median</span>
            <span style={{ color: median < PASS_MS ? "var(--matcha-line)" : "var(--ink)" }}>{Math.round(median)} ms {median < PASS_MS ? "· pass" : "· over"}</span>
          </div>
        )}
        {top && <div className="muted">Top guesses: {top.map(t => `${t.label} ${(t.score * 100).toFixed(0)}%`).join(" · ")}</div>}
      </div>
    </main>
  );
}
