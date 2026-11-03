"use client";

// Preview of the quiet-hours tea, any time of day. Not linked anywhere; open /preview/tea.
// Uses a 60-second wait so you can watch the glass drain. The real flow uses 10 minutes.

import { useEffect, useState } from "react";
import Link from "next/link";
import { TeaGlass } from "@/components/TeaGlass";
import { Safiye } from "@/components/Safiye";

const TOTAL = 60;

export default function TeaPreview() {
    const [start] = useState(() => Date.now());
    const [left, setLeft] = useState(TOTAL);
    useEffect(() => {
        const id = setInterval(() => setLeft(Math.max(0, TOTAL - Math.floor((Date.now() - start) / 1000))), 1000);
        return () => clearInterval(id);
    }, [start]);

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: "#fff", overflow: "hidden", flex: "none" }}>
            <Safiye mood="sleepy" size={56} />
            </div>
            <div style={{ fontSize: 17, lineHeight: 1.35 }}>&ldquo;Kuzum, it&rsquo;s late. I&rsquo;m making çay. Sit with me ten minutes, then decide.&rdquo;</div>
        </div>
        <TeaGlass left={left} total={TOTAL} />
        <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>Preview: 1 minute instead of 10.</div>
        </main>
    );
}