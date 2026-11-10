"use client";

// Preview of the glass puzzle, any time of day. Not linked anywhere; open /preview/puzzle.
// Uses a 60-second cap so you can see the time-up state. The real flow uses 3 minutes.

import { useState } from "react";
import Link from "next/link";
import { GlassPuzzle } from "@/components/GlassPuzzle";

export default function PuzzlePreview() {
    const [round, setRound] = useState(0);
    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
        <GlassPuzzle key={round} cap={60} onClose={() => setRound((r) => r + 1)} />
        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>Preview: 1 minute instead of 3. Stop starts a fresh board.</div>
        </main>
    );
}