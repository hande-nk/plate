"use client";

// Feride's (and later Kerem's) voice notes. Tap play: the phone reads the line aloud with its own speech engine,
// on the device, no audio files and nothing sent anywhere. A Turkish voice reading English gives Feride her accent.
// Tap again to stop. The transcript is always shown, so it works with the sound off too.

import { useEffect, useState } from "react";

function pickVoice(): SpeechSynthesisVoice | null {
    const all = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : [];
    return all.find((v) => v.lang.toLowerCase().startsWith("tr")) ?? all.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
}

export function VoiceNote({ who, text }: { who: string; text: string }) {
    const [playing, setPlaying] = useState(false);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        if (typeof speechSynthesis === "undefined") { setSupported(false); return; }
        speechSynthesis.getVoices();                         // iOS loads voices lazily
        return () => speechSynthesis.cancel();
    }, []);

    function toggle() {
        if (!supported) return;
        if (playing) { speechSynthesis.cancel(); setPlaying(false); return; }
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = 1.05; u.pitch = 1.15;
        u.onend = () => setPlaying(false);
        u.onerror = () => setPlaying(false);
        speechSynthesis.cancel();
        speechSynthesis.speak(u);                            // must run inside the tap on iPhone
        setPlaying(true);
    }

    const bars = [4, 10, 16, 8, 14, 6, 12, 4, 9, 15, 7, 11, 5, 13, 8, 4];
    return (
        <div style={{ display: "grid", gap: 6 }}>
        <button type="button" onClick={toggle} disabled={!supported} aria-pressed={playing}
            aria-label={playing ? `Stop ${who}'s voice note` : `Play ${who}'s voice note`}
            style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 14px 6px 6px", borderRadius: 24,
            border: "2px solid var(--ink)", background: "#fff", fontFamily: "inherit", cursor: supported ? "pointer" : "default", justifySelf: "start" }}>
            <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 17, background: "var(--ink)", display: "grid", placeItems: "center" }}>
            {playing
                ? <span style={{ width: 10, height: 10, background: "#fff", borderRadius: 2 }} />
                : <span style={{ width: 0, height: 0, borderLeft: "10px solid #fff", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: 3 }} />}
            </span>
            <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
            {bars.map((h, i) => (
                <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: "var(--ink)",
                animation: playing ? `vn-bounce 0.9s ${i * 0.05}s ease-in-out infinite` : "none" }} />
            ))}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{who}</span>
        </button>
        <style>{`@keyframes vn-bounce { 0%,100% { transform: scaleY(.5) } 50% { transform: scaleY(1.2) } }
            @media (prefers-reduced-motion: reduce) { [aria-pressed] span span { animation: none !important } }`}</style>
        {!supported && <div className="muted" style={{ fontSize: 12 }}>This phone can&apos;t play it aloud. Here&apos;s what she said:</div>}
        <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>&ldquo;{text}&rdquo;</div>
        </div>
    );
}