"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hall } from "@/core/router";
import { supabase } from "@/lib/supabase";
import { toSims, scoreDishes, buildPrior, type ClipOut } from "@/core/matcher";
import { hitAt1, recallAtK, type Case } from "@/core/accuracy";
import { shrinkPhoto } from "@/lib/photos";

type Dish = { id: number; name: string };
type Plate = Case & { hall: Hall; missing: number; ms: number };

const HALLS: { id: Hall; label: string }[] = [
  { id: "carm", label: "Carm" },
  { id: "dewick", label: "Dewick" },
  { id: "hodge", label: "Hodge" },
  { id: "kindlevan", label: "Kindlevan" },
];
const GOAL = 12;
const SAVE_KEY = "plate-eval-v1";
const pct = (x: number | null) => (x === null ? "-" : `${Math.round(x * 100)}%`);

export default function EvalPage() {
  const router = useRouter();
  const worker = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [hall, setHall] = useState<Hall>("dewick");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [ranked, setRanked] = useState<Dish[]>([]); // ALL hall dishes, CLIP order
  const [ms, setMs] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [missing, setMissing] = useState(0);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep progress if the app reloads mid-check
  useEffect(() => {
    try { const s = localStorage.getItem(SAVE_KEY); if (s) setPlates(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(plates)); } catch {}
  }, [plates]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
  }, [router]);
  useEffect(() => () => worker.current?.terminate(), []);

  useEffect(() => {
    if (!ready) return;
    supabase.from("dishes").select("id, name").eq("hall", hall)
      .then(({ data, error }) => { if (error) setStatus(error.message); else setDishes(data ?? []); });
  }, [ready, hall]);

  function call<T>(msg: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const w = worker.current!;
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === "progress") return;
        if (d.type === "error") reject(new Error(d.message));
        else resolve(d as T);
      };
      w.postMessage(msg);
    });
  }

  async function getWorker() {
    if (worker.current) return;
    worker.current = new Worker(new URL("../../src/workers/matcher.worker.ts", import.meta.url), { type: "module" });
    const isPhone = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const gpu = "gpu" in navigator && !isPhone;
    setStatus("Loading the matcher...");
    try {
      await call({ type: "load", model: "Xenova/clip-vit-base-patch32", device: gpu ? "webgpu" : "wasm", dtype: gpu ? "fp16" : "q8" });
    } catch (err) {
      worker.current?.terminate();
      worker.current = null;
      throw err;
    }
  }

  async function onSnap(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets you pick the same file again
    if (!file) return;
    setBusy(true);
    setMarked(new Set());
    setMissing(0);
    setRanked([]);
    try {
      const small = await shrinkPhoto(file);
      const url = URL.createObjectURL(small);
      setImage(url);
      await getWorker();
      setStatus("Matching...");
      const res = await call<{ ms: number; out: ClipOut }>({ type: "run", imageUrl: url, labels: dishes.map((d) => d.name) });
      const sims = toSims(res.out, dishes.map((d) => ({ id: String(d.id), name: d.name })));
      const prior = buildPrior([], Object.keys(sims)); // CLIP only: no personal history
      const byId = new Map(dishes.map((d) => [String(d.id), d]));
      setRanked(scoreDishes(sims, prior).map((s) => byId.get(s.dishId)!));
      setMs(res.ms);
      setStatus(`Matched in ${Math.round(res.ms)} ms. Tap every dish that's really on the plate.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: number) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function savePlate() {
    setPlates((prev) => [...prev, {
      hall, ms, missing,
      truth: Array.from(marked).map(String),
      ranked: ranked.map((d) => String(d.id)),
    }]);
    setImage(null);
    setRanked([]);
    setMarked(new Set());
    setMissing(0);
    setStatus("");
  }

  if (!ready) return null;

  const done = plates.length;
  const avgMs = done ? Math.round(plates.reduce((s, p) => s + p.ms, 0) / done) : 0;
  const missingTotal = plates.reduce((s, p) => s + p.missing, 0);
  const summary = {
    plates: done,
    dishes: plates.reduce((s, p) => s + new Set(p.truth).size, 0),
    hitAt1: hitAt1(plates), recallAt3: recallAtK(plates, 3), recallAt8: recallAtK(plates, 8),
    missingFromLibrary: missingTotal, avgMs,
  };

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="muted">Accuracy check · CLIP only · {done} of {GOAL}</div>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>How good is the matcher?</h1>

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center" }}>
        <div><div className="muted" style={{ fontSize: 12 }}>Hit at 1</div><div style={{ fontSize: 22, fontWeight: 500 }}>{pct(summary.hitAt1)}</div></div>
        <div><div className="muted" style={{ fontSize: 12 }}>Recall at 3</div><div style={{ fontSize: 22, fontWeight: 500 }}>{pct(summary.recallAt3)}</div></div>
        <div><div className="muted" style={{ fontSize: 12 }}>Recall at 8</div><div style={{ fontSize: 22, fontWeight: 500 }}>{pct(summary.recallAt8)}</div></div>
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        {summary.dishes} dishes on {done} plates · avg {avgMs} ms
        {missingTotal > 0 && ` · ${missingTotal} not in the library (not counted)`}
      </div>

      <div role="group" aria-label="Dining hall" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {HALLS.map((h) => (
          <button key={h.id} type="button" className="choice" aria-pressed={hall === h.id} onClick={() => setHall(h.id)} disabled={busy || ranked.length > 0}>
            {h.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 && (
        <label className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {busy ? "Matching..." : `Photo ${done + 1}`}
          <input type="file" accept="image/jpeg,image/png" onChange={onSnap} disabled={busy || dishes.length === 0} hidden />
        </label>
      )}

      {status && <div className="muted">{status}</div>}
      {image && <img src={image} alt="" style={{ width: "100%", borderRadius: 14 }} />}

      {ranked.map((d, i) => (
        <button key={d.id} type="button" className="card" aria-pressed={marked.has(d.id)} onClick={() => toggle(d.id)}
          style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", display: "flex", gap: 12 }}>
          <span className="muted" style={{ minWidth: 22 }}>{i + 1}</span>
          <span>{d.name}</span>
        </button>
      ))}

      {ranked.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn-quiet" onClick={() => setMissing((m) => Math.max(0, m - 1))}>−</button>
            <span className="muted">{missing} dish{missing === 1 ? "" : "es"} not in the list</span>
            <button type="button" className="btn-quiet" onClick={() => setMissing((m) => m + 1)}>+</button>
          </div>
          <button type="button" className="btn" onClick={savePlate} disabled={marked.size === 0 && missing === 0}>
            Save plate {done + 1}
          </button>
        </>
      )}

      {done > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-quiet" onClick={() => navigator.clipboard.writeText(JSON.stringify({ summary, plates }, null, 2))}>
            Copy results
          </button>
          <button type="button" className="btn-quiet" onClick={() => setPlates((p) => p.slice(0, -1))}>Undo last plate</button>
        </div>
      )}
    </main>
  );
}