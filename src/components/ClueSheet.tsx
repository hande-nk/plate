"use client";
import { useEffect } from "react";
import { Safiye } from "@/components/Safiye";

export type Clue = { ord: number; title: string; body: string; place: string | null };

export function CaseMeter({ found, dark = false }: { found: number; dark?: boolean }) {
  return (
    <div role="img" aria-label={`${found} of 8 clues found`} style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 4 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ height: 6, borderRadius: 3, background: i < found ? (dark ? "var(--matcha)" : "var(--matcha-line)") : (dark ? "#3A3A38" : "var(--hairline)") }} />
      ))}
    </div>
  );
}

export function ClueSheet({ clue, found, onClose }: { clue: Clue; found: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(18,18,18,0.35)" }} />
      <div role="dialog" aria-modal="true" aria-label="A clue for Safiye's case"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 430, margin: "0 auto", borderRadius: "30px 30px 0 0", background: "#fff",
                 padding: "12px 20px calc(30px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>
        <div aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "#DADAD4" }} />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Safiye mood="aman" size={76} />
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Safiye Hanım · case file No. 1</div>
            <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1 }}>Aman! A clue.</div>
          </div>
        </div>
        <div style={{ borderRadius: 20, background: "var(--paper)", border: "1px solid var(--hairline)", padding: 14, display: "grid", gap: 6, transform: "rotate(-1deg)" }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>Clue {clue.ord} · {clue.title}</span><span>{clue.place ?? ""}</span>
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.4 }}>&ldquo;{clue.body}&rdquo;</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>The case</span><span>{found} of 8 clues</span></div>
          <CaseMeter found={found} />
        </div>
        <button type="button" className="btn" onClick={onClose}>Add to the case file</button>
        <button type="button" className="btn-quiet" onClick={onClose} style={{ border: "none" }}>Later</button>
      </div>
    </div>
  );
}