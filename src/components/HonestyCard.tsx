"use client";

// T16. Your honestyCheck on your honestyWindow: do your logs and your scale tell the same story?
// It never blames you. It says which numbers disagree and the usual reasons. Copy is a DRAFT until Naz approves.

import type { HonestyResult } from "@/core/honesty";
import type { HonestyWindow } from "@/core/honestyWindow";

const short = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const n = (x: number) => Math.abs(Math.round(x / 10) * 10).toLocaleString("en-US");     // "about 320", rounded to 10

export function HonestyCard({ r, w, hideNumbers }: { r: HonestyResult; w: HonestyWindow; hideNumbers: boolean }) {
    let title: string, body: string;
    switch (r.verdict) {
        case "too-early":
        title = `Ready in ${r.daysUntilReady} ${r.daysUntilReady === 1 ? "day" : "days"}`;
        body = "It needs three weeks of weigh-ins next to your logs before the numbers mean anything.";
        break;
        case "matches":
        title = "Your logs and your scale agree";
        body = hideNumbers ? "What you log matches what your weight trend suggests."
            : `You logged about ${n(w.input.loggedAvgKcal)} kcal a day; your trend suggests about ${n(r.impliedIntakeKcal)}. Close enough to trust.`;
        break;
        case "logging-low":
        title = "The scale sees a bit more than the log";
        body = (hideNumbers ? "Your trend suggests you eat more than you log. " : `Your trend suggests about ${n(r.gapKcal)} kcal a day more than you log. `)
            + "Usually that's drinks, bites between meals, or estimates running low, like build-your-own parts. It's about the log, not about you.";
        break;
        case "logging-high":
        title = "The log is a bit higher than the scale";
        body = (hideNumbers ? "You log more than your trend suggests. " : `You log about ${n(r.gapKcal)} kcal a day more than your trend suggests. `)
            + "Estimates or portions may be running generous. Nothing to change about eating; maybe pick Light more often on estimates.";
        break;
    }
    const ready = r.verdict !== "too-early";
    return (
        <div className="card" style={{ display: "grid", gap: 8, padding: 16, borderRadius: 26 }}>
        <div style={{ fontSize: 11, color: "var(--stone)" }}>Honesty check</div>
        <div style={{ fontSize: 17, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>{body}</div>
        {ready && (
            <div className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
            {short(w.from)} to {short(w.to)} · {w.completeDays} complete {w.completeDays === 1 ? "day" : "days"}
            {w.skippedDays > 0 && `, ${w.skippedDays} skipped (under 2 plates logged)`}. Trend from your weigh-ins.
            </div>
        )}
        </div>
    );
}