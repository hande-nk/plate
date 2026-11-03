"use client";

// T21. The quiet-hours wait as something you do: a Turkish tea glass.
// Hold to pour. The tea darkens as it steeps. Tap the glass to sip.
// The tea level is the 10 minutes going by. Nothing here is about food amounts or bodies.

import { useEffect, useRef, useState } from "react";

// İnce belli, traced from a photo Naz chose: a flared mouth, a gentle waist a bit above the middle,
// a wide rounded bottom about as wide as the mouth, a thick glass foot.
const GLASS = "M37 40 C44 60 53 84 53 112 C53 138 40 160 38 188 C38 198 41 203 48 203 L152 203 C159 203 162 198 162 188 C160 160 147 138 147 112 C147 84 156 60 163 40 Z";
const TOP = 58, BOTTOM = 194;          // tea surface range inside the glass
// Half-width of the glass every 4 px from y = 40, so the tea surface fits the curve.
const HALF = [63.0, 61.6, 60.2, 58.8, 57.4, 56.1, 55.0, 53.7, 52.7, 51.6, 50.7, 49.8, 49.1, 48.5, 47.9, 47.5, 47.2, 47.1, 47.0, 47.1, 47.4, 47.8, 48.5, 49.3, 50.2, 51.2, 52.3, 53.4, 54.5, 55.6, 56.8, 57.9, 58.8, 59.7, 60.5, 61.2, 61.6, 62.0, 61.8, 61.1, 59.1];
const halfAt = (y: number) => { const i = (y - 40) / 4, a = Math.max(0, Math.floor(i)), b = Math.min(a + 1, HALF.length - 1); return HALF[a] + (HALF[b] - HALF[a]) * (i - a); };
const POUR_MS = 1800;

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
// amber -> tavşan kanı; the edge color is darker, like light passing through more tea
const LIGHT = [222, 110, 38], LIGHT_EDGE = [170, 70, 20], DEEP = [196, 24, 16], DEEP_EDGE = [118, 8, 6];

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
            style={{ cursor: full ? "pointer" : "default", transition: "transform .45s ease", transform: tilt ? "rotate(-7deg)" : "none", transformOrigin: "50% 88%", touchAction: "none" }}>
            <defs>
            <clipPath id="plate-tea-glass"><path d={GLASS} /></clipPath>
            <linearGradient id="plate-tea" x1="0" x2="1">
                <stop offset="0" stopColor={mix(LIGHT_EDGE, DEEP_EDGE, steep)} />
                <stop offset=".4" stopColor={mix(LIGHT, DEEP, steep)} />
                <stop offset="1" stopColor={mix(LIGHT_EDGE, DEEP_EDGE, steep)} />
            </linearGradient>
            </defs>

            {level > 0.05 && (
            <g className="plate-steam" fill="none" stroke="#B5B5AE" strokeWidth="2.5" strokeLinecap="round">
                <path d="M84 30 C78 20 90 14 84 4" /><path d="M100 32 C94 20 106 14 100 2" /><path d="M116 30 C110 20 122 14 116 4" />
            </g>
            )}

            {/* saucer with the red rim and a gold ring, and a teaspoon */}
            <ellipse cx="100" cy="212" rx="94" ry="16" fill="#fff" stroke="#B3261E" strokeWidth="3.5" />
            <ellipse cx="100" cy="208" rx="70" ry="9" fill="none" stroke="#C9A24A" strokeWidth="1.5" />
            <path d="M158 200 C170 196 182 192 192 190" stroke="#B9BDC0" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="160" cy="201" rx="7" ry="3.5" fill="#D9DCDE" stroke="#B9BDC0" />

            {/* tea, then the thick glass foot */}
            <g clipPath="url(#plate-tea-glass)">
            {level > 0 && <rect x="30" y={y} width="140" height={BOTTOM - y} fill="url(#plate-tea)" />}
            {level > 0 && <ellipse cx="100" cy={y} rx={halfAt(y)} ry="3.5" fill={mix(LIGHT, DEEP, steep)} stroke="#fff" strokeOpacity=".35" strokeWidth="1" />}
            <rect x="30" y={BOTTOM} width="140" height="10" fill="#E3ECEF" opacity=".95" />
            </g>

            {/* glass, rim and highlights */}
            <path d={GLASS} fill="rgba(235,242,245,.15)" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
            <ellipse cx="100" cy="40" rx="63" ry="6" fill="none" stroke="var(--ink)" strokeWidth="2" />
            <path d="M47 54 C51 72 57 92 58 114" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".75" />
            <path d="M46 160 C43 172 43 182 45 192" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".6" />
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