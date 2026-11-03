"use client";

// T21. The quiet-hours wait as something you do: a Turkish tea glass.
// Hold to pour. The tea darkens as it steeps. Tap the glass to sip.
// The tea level is the 10 minutes going by. Nothing here is about food amounts or bodies.

import { useEffect, useRef, useState } from "react";

const GLASS = "M56 40 C58 92 80 120 80 150 C80 170 67 186 72 212 L128 212 C133 186 120 170 120 150 C120 120 142 92 144 40 Z";
const TOP = 52, BOTTOM = 212;          // tea surface range inside the glass
const POUR_MS = 1800;

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
const LIGHT = [222, 150, 70], DEEP = [142, 31, 18];   // amber -> tavşan kanı

export function TeaGlass({ left, total }: { left: number; total: number }) {
    const [poured, setPoured] = useState(0);            // 0..1 while pouring
    const [pouredAt, setPouredAt] = useState<number | null>(null);
    const [sips, setSips] = useState(0);
    const [tilt, setTilt] = useState(false);
    const [, tick] = useState(0);
    const raf = useRef<number | null>(null);
    const holdStart = useRef<{ t: number; from: number } | null>(null);

    // Re-render every second so the color keeps steeping.
    useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
    useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

    function step() {
        if (!holdStart.current) return;
        const p = Math.min(1, holdStart.current.from + (performance.now() - holdStart.current.t) / POUR_MS);
        setPoured(p);
        if (p >= 1) { holdStart.current = null; setPouredAt(Date.now()); return; }
        raf.current = requestAnimationFrame(step);
    }
    function startPour() {
        if (pouredAt) return;
        holdStart.current = { t: performance.now(), from: poured };
        raf.current = requestAnimationFrame(step);
    }
    function stopPour() { holdStart.current = null; if (raf.current) cancelAnimationFrame(raf.current); }
    function sip() {
        if (!pouredAt) return;
        setSips((n) => n + 1);
        setTilt(true);
        setTimeout(() => setTilt(false), 450);
    }

    const full = pouredAt !== null;
    const level = full ? 0.12 + 0.88 * Math.max(0, left) / total : poured;          // the 10 minutes, as tea
    const steep = full ? Math.min(1, (Date.now() - pouredAt) / 90000) : poured * 0.3; // darkens over 90 s
    const y = BOTTOM - level * (BOTTOM - TOP);
    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");

    return (
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <style>{`
            @keyframes plate-steam { 0% { opacity: 0; transform: translateY(6px) } 30% { opacity: .55 } 100% { opacity: 0; transform: translateY(-18px) } }
            .plate-steam path { animation: plate-steam 3.2s ease-in-out infinite; }
            .plate-steam path:nth-child(2) { animation-delay: 1.1s } .plate-steam path:nth-child(3) { animation-delay: 2.2s }
            @media (prefers-reduced-motion: reduce) { .plate-steam path { animation: none; opacity: .35 } }
        `}</style>
        <svg viewBox="0 0 200 240" width="240" height="288" role="img"
            aria-label={full ? `Tea glass, ${mm}:${ss} left. ${sips} sips.` : "Empty tea glass. Hold the button to pour."}
            onClick={sip}
            style={{ cursor: full ? "pointer" : "default", transition: "transform .45s ease", transform: tilt ? "rotate(-7deg)" : "none", transformOrigin: "50% 92%", touchAction: "none" }}>
            <defs><clipPath id="plate-tea-glass"><path d={GLASS} /></clipPath></defs>

            {level > 0.05 && (
            <g className="plate-steam" fill="none" stroke="#9A9A94" strokeWidth="2.5" strokeLinecap="round">
                <path d="M84 30 C78 20 90 14 84 4" /><path d="M100 32 C94 20 106 14 100 2" /><path d="M116 30 C110 20 122 14 116 4" />
            </g>
            )}

            {/* saucer */}
            <ellipse cx="100" cy="218" rx="84" ry="13" fill="#fff" stroke="#B3261E" strokeWidth="3" />
            <ellipse cx="100" cy="216" rx="56" ry="7" fill="none" stroke="#E8E2D6" strokeWidth="1.5" />

            {/* tea */}
            <g clipPath="url(#plate-tea-glass)">
            <rect x="40" y={y} width="120" height={BOTTOM - y + 2} fill={mix(LIGHT, DEEP, steep)} style={{ transition: "y 1s linear, height 1s linear" }} />
            <ellipse cx="100" cy={y} rx="44" ry="3" fill="#fff" opacity=".18" />
            </g>

            {/* glass */}
            <path d={GLASS} fill="rgba(255,255,255,.08)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M66 52 C70 90 86 116 88 146" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".7" />
        </svg>

        {!full ? (
            <button type="button"
            onPointerDown={startPour} onPointerUp={stopPour} onPointerLeave={stopPour} onPointerCancel={stopPour}
            onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !holdStart.current) startPour(); }}
            onKeyUp={stopPour}
            style={{ minHeight: 48, padding: "0 22px", borderRadius: 16, border: "none", background: "var(--ink)", color: "var(--paper)", fontSize: 16, fontFamily: "inherit", touchAction: "none", userSelect: "none" }}>
            {poured === 0 ? "Hold to pour" : "Keep holding…"}
            </button>
        ) : (
            <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 500, fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
            <div className="muted" style={{ fontSize: 13 }}>{sips === 0 ? "Tap the glass to sip" : `${sips} ${sips === 1 ? "sip" : "sips"}`}</div>
            </div>
        )}
        </div>
    );
}