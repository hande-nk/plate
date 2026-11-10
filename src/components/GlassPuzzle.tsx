"use client";

// T23: the glass puzzle. A 3x3 sliding puzzle on a frosted copy of your latest plate photo.
// The frost clears as tiles find home. Capped at 3 minutes, always skippable, never scored.
// Photo stays on the phone: we borrow the <img> that PlatePhoto renders from IndexedDB.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlatePhoto } from "@/components/PlatePhoto";
import { shuffle, move, movable, isSolved, type Board } from "@/core/puzzle";

const N = 3;
const CAP = 180;          // seconds
const STEPS = 40;         // random moves from solved
const MAX_BLUR = 9;       // px of frost when nothing is home

export function GlassPuzzle({ onClose, cap = CAP }: { onClose: () => void; cap?: number }) {
    const [board, setBoard] = useState<Board>(() => shuffle(N, STEPS, Math.random));
    const [moves, setMoves] = useState(0);
    const [start, setStart] = useState(() => Date.now());
    const [left, setLeft] = useState(cap);
    const [photoKey, setPhotoKey] = useState<string | null>(null);
    const [src, setSrc] = useState<string | null>(null);
    const hidden = useRef<HTMLDivElement>(null);

    const done = isSolved(board);
    const over = left === 0;
    const canMove = useMemo(() => new Set(movable(board, N)), [board]);
    const home = board.filter((v, i) => v !== 0 && v === i + 1).length;
    const blur = done || over ? 0 : MAX_BLUR * (1 - home / (N * N - 1));

    // Latest plate that has a photo key (the photo itself only exists on the phone that took it)
    useEffect(() => {
        supabase.from("meals").select("photo_key").not("photo_key", "is", null)
        .order("eaten_at", { ascending: false }).limit(1)
        .then(({ data }) => setPhotoKey(data?.[0]?.photo_key ?? null));
    }, []);

    // Read the src off PlatePhoto's <img> once it appears
    useEffect(() => {
        const el = hidden.current;
        if (!el || !photoKey) return;
        const grab = () => { const img = el.querySelector("img"); if (img?.src) setSrc(img.src); };
        grab();
        const mo = new MutationObserver(grab);
        mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
        return () => mo.disconnect();
    }, [photoKey]);

    // 3-minute cap, from a start time so it survives the phone sleeping
    useEffect(() => {
        if (done) return;
        const t = setInterval(() => setLeft(Math.max(0, cap - Math.floor((Date.now() - start) / 1000))), 1000);
        return () => clearInterval(t);
    }, [start, cap, done]);

    function tap(i: number) {
        if (done || over || !canMove.has(i)) return;
        setBoard((b) => move(b, N, i));
        setMoves((m) => m + 1);
    }

    function again() {
        setBoard(shuffle(N, STEPS, Math.random));
        setMoves(0);
        setStart(Date.now());
        setLeft(cap);
    }

    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
    const pct = 100 / N;

    // Where tile v's piece of the photo sits (its home), as background-position
    const piece = (v: number) => {
        const h = v - 1, r = Math.floor(h / N), c = h % N;
        return `${(c / (N - 1)) * 100}% ${(r / (N - 1)) * 100}%`;
    };
    const surface = src ? `url("${src}")` : "linear-gradient(140deg, #F6E7D0 0%, #E9B98A 45%, #B3502F 100%)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {photoKey && (
            <div ref={hidden} aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
            <PlatePhoto photoKey={photoKey} />
            </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{done ? "Clear glass." : over ? "Time. Here it is, clear." : "Slide the glass back."}</div>
            <div className="muted" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }} aria-live="off">{done ? `${moves} moves` : `${mm}:${ss}`}</div>
        </div>

        <div role="grid" aria-label={`Sliding puzzle, ${home} of ${N * N - 1} pieces home`}
            style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 22, overflow: "hidden",
                    background: "#EFEEEA", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}>
            {board.map((v, i) => {
            if (v === 0) return null;
            const r = Math.floor(i / N), c = i % N;
            const can = canMove.has(i) && !done && !over;
            return (
                <button key={v} type="button" onClick={() => tap(i)} aria-label={`Piece ${v}${can ? ", can slide" : ""}`}
                aria-disabled={!can} className="glass-tile"
                style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, height: `${pct}%`, padding: 3,
                        transform: `translate(${c * 100}%, ${r * 100}%)`, border: "none", background: "transparent", cursor: can ? "pointer" : "default" }}>
                <span style={{ position: "relative", display: "block", width: "100%", height: "100%", borderRadius: 14, overflow: "hidden",
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.12)" }}>
                    <span style={{ position: "absolute", inset: 0, backgroundImage: surface, backgroundSize: `${N * 100}% ${N * 100}%`,
                                backgroundPosition: piece(v), filter: `blur(${blur}px) saturate(1.1)`,
                                // scale up a little while frosted so blurred edges don't fade; exactly 1 when clear
                                transform: `scale(${1 + blur * 0.015})`, transition: "filter 400ms ease, transform 400ms ease" }} />
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 55%)" }} />
                    {!done && (
                    <span aria-hidden="true" style={{ position: "absolute", left: 7, top: 7, minWidth: 20, height: 20, borderRadius: 10, display: "grid", placeItems: "center",
                                    fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(18,18,18,0.38)", backdropFilter: "blur(4px)" }}>{v}</span>
                    )}
                </span>
                </button>
            );
            })}
        </div>

        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
            {done ? "Nice. The wait keeps going on its own." : !src ? "Your plate photos live on this phone. Log one here and it shows up in the glass." : "The frost clears as pieces find home."}
        </div>

        {(done || over) && <button type="button" className="btn-quiet" onClick={again}>Another one</button>}
        <button type="button" className="btn-quiet" onClick={onClose} style={{ border: "none" }}>Stop the puzzle</button>

        <style>{`
            .glass-tile { transition: transform 160ms ease; -webkit-tap-highlight-color: transparent; }
            @media (prefers-reduced-motion: reduce) { .glass-tile { transition: none; } }
        `}</style>
        </div>
    );
}