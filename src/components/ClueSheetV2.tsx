"use client";

// Story v2 clue sheet: the scene art, your plate's frame in italics, Safiye's line, and (on some clues) a choice.
// Text comes from your fill + slotValues, so a missing hall, dish or feeling just drops out.

import { useState } from "react";
import { fill, slotValues } from "@/core/story";
import type { FoundClue } from "@/lib/caseFile";
import { SCENE_1, SCENE_2, SCENE_3, SCENE_4, SCENE_5, SCENE_6, SCENE_7, SCENE_8, SCENE_ON_CASE, SCENE_PRIYA, SCENE_BAR, SCENE_TELL, SCENE_PROTECT,
  PRIYA, SALADBAR, PRUITT, HUSEYIN } from "@/lib/storyArt";
import { VoiceNote } from "@/components/VoiceNote";

const HALL: Record<string, string> = { hodge: "HODGDON", carm: "CARM", dewick: "DEWICK", kindlevan: "KINDLEVAN" };
const PORTRAIT: Record<string, string> = { priya: PRIYA, bar: SALADBAR, tell: PRUITT, protect: HUSEYIN };
const CHOICE_ART: Record<string, string> = { priya: SCENE_PRIYA, bar: SCENE_BAR, tell: SCENE_TELL, protect: SCENE_PROTECT };

export function sceneFor(ord: number, hall: string | null): string {
  if (ord === 1) return SCENE_1.replace("%HALL%", hall ? HALL[hall] ?? "CAMPUS" : "CAMPUS");
  if (ord === 2) return SCENE_2;
  if (ord === 3) return SCENE_3;
  if (ord === 4) return SCENE_4;
  if (ord === 5) return SCENE_5;
  if (ord === 6) return SCENE_6;
  if (ord === 7) return SCENE_7;
  if (ord === 8) return SCENE_8;
  return SCENE_ON_CASE;
}

export function ClueSheetV2({ f, total, earlierChoice, onChoose, onClose }: {
  f: FoundClue; total: number;
  earlierChoice: string | null;                      // the answer this clue's choice_lines depend on
  onChoose: (id: string) => Promise<void>;
  onClose: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const c = f.clue;
    const frame = f.ctx ? fill(c.frame, slotValues(f.ctx)) : "";          // your code
    const extra = earlierChoice && c.choice_lines?.[earlierChoice] ? c.choice_lines[earlierChoice] : null;
    const extraArt = extra && earlierChoice ? CHOICE_ART[earlierChoice] ?? null : null;

    return (
        <div role="dialog" aria-modal="true" aria-label={`Clue ${c.ord}: ${c.title}`} onClick={() => !busy && onClose()}
        style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
        <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 430, maxHeight: "90vh", overflowY: "auto", background: "var(--paper)", borderRadius: "28px 28px 0 0", padding: "18px 18px 36px", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="muted" style={{ fontSize: 13 }}>Clue {c.ord} of {total} · {c.title}</div>
            <button type="button" onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44, border: "none", background: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <svg viewBox="0 0 320 200" width="100%" role="img" aria-label={`Scene for clue ${c.ord}`} style={{ borderRadius: 18, background: "#F4F4F1" }}
            dangerouslySetInnerHTML={{ __html: sceneFor(c.ord, f.ctx?.hall ?? null) }} />
            {c.voice && <VoiceNote who={c.voice.who} text={c.voice.text} />}
            <div style={{ fontSize: 17, lineHeight: 1.5 }}>
            {frame && <i style={{ color: "var(--stone)" }}>{frame} </i>}{c.body}
            </div>
            {extra && (
            <div style={{ display: "grid", gap: 8 }}>
                {extraArt && <svg viewBox="0 0 320 200" width="100%" role="img" aria-label="Your earlier choice" style={{ borderRadius: 18, background: "#F4F4F1" }} dangerouslySetInnerHTML={{ __html: extraArt }} />}
                <div style={{ fontSize: 16, lineHeight: 1.5 }}>{extra}</div>
            </div>
            )}
            {c.choice_prompt && c.choice_options && (
            <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 14, textAlign: "center" }}>{c.choice_prompt}</div>
                <div style={{ display: "flex", gap: 8 }}>
                {c.choice_options.map((o) => {
                    const on = f.choice === o.id;
                    return (
                    <button key={o.id} type="button" disabled={busy || Boolean(f.choice)} aria-pressed={on}
                        onClick={async () => { setBusy(true); await onChoose(o.id); setBusy(false); }}
                        style={{ flex: 1, borderRadius: 18, border: `1.5px solid ${on ? "var(--ink)" : "#DADAD4"}`, background: on ? "#fff" : "#fff",
                        opacity: f.choice && !on ? 0.45 : 1, padding: 8, display: "grid", justifyItems: "center", gap: 4, fontFamily: "inherit", cursor: f.choice ? "default" : "pointer" }}>
                        {PORTRAIT[o.id] && <svg viewBox="0 0 160 160" width="84" height="84" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PORTRAIT[o.id] }} />}
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{o.label}</span>
                    </button>
                    );
                })}
                </div>
                {f.choice && <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>Noted. It shows up in the next clue.</div>}
            </div>
            )}
        </div>
        </div>
    );
}