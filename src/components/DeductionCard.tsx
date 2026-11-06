"use client";

// Sunday edition: Safiye's weekly deduction (your weeklyDeduction), on a corkboard of this week's plates.

import { numberWord, type Deduction } from "@/core/deduce";
import { Safiye } from "@/components/Safiye";
import { FOOD_PLATE } from "@/lib/storyArt";

const HALL: Record<string, string> = { hodge: "Hodgdon", carm: "Carm", dewick: "Dewick", kindlevan: "Kindlevan" };
const RED = "#B3261E";

export function deductionLine(d: Deduction): string {
  switch (d.kind) {
    case "hall":
        return `Kuzum, a detective notices things. ${d.good === d.rated ? `All ${numberWord(d.rated)}` : `${numberWord(d.good, true)}`} of your ${d.good === d.rated ? "" : `${numberWord(d.rated)} `}${HALL[d.hall] ?? d.hall} plates this week felt ${d.feeling}. In 1987 they also said coincidence.`;
    case "new":
      return `${numberWord(d.count, true)} dishes you had never logged before, all in one week. Kuzum, a good detective always tries the soup.`;
    case "time":
      return `Your ${d.slot} plates felt good ${numberWord(d.good)} times out of ${numberWord(d.rated)}. A detective notices when, not only where.`;
    case "logged":
      return `${numberWord(d.count, true)} ${d.count === 1 ? "plate" : "plates"} this week, kuzum. Every one is a page of my notebook.`;
  }
}

export function DeductionCard({ d, photos }: { d: Deduction; photos: string[] }) {
    const shown = photos.slice(0, 5);
    const slots = shown.length ? shown : [null, null, null];
    return (
        <div className="card" style={{ display: "grid", gap: 12, padding: 16, borderRadius: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: "#fff", border: "1px solid #E2E2DC", overflow: "hidden", flex: "none" }}>
            <Safiye mood="thinking" size={44} />
            </div>
            <div style={{ fontSize: 12, color: "var(--stone)" }}>Safiye&apos;s deduction</div>
        </div>
        <div aria-hidden="true" style={{ position: "relative", borderRadius: 18, background: "#E7DCC8", padding: "18px 10px 12px", display: "flex", justifyContent: "center", gap: 6 }}>
            <svg viewBox="0 0 300 20" preserveAspectRatio="none" style={{ position: "absolute", left: 10, right: 10, top: 12, width: "calc(100% - 20px)", height: 20 }}>
            <path d="M10 6 L70 14 L150 6 L230 14 L290 6" fill="none" stroke={RED} strokeWidth="2" />
            </svg>
            {slots.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 58, background: "#fff", border: "2px solid var(--ink)", borderRadius: 3, padding: "4px 4px 10px",
                transform: `rotate(${[-5, 4, -3, 5, -4][i]}deg)` }}>
                <span style={{ position: "absolute", top: -6, left: "50%", marginLeft: -5, width: 10, height: 10, borderRadius: 5, background: RED }} />
                <div style={{ aspectRatio: "1", background: "#E9E4DA", overflow: "hidden", display: "grid", placeItems: "center" }}>
                {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <svg viewBox="0 0 80 70" width="80%" dangerouslySetInnerHTML={{ __html: FOOD_PLATE }} />}
                </div>
            </div>
            ))}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.5 }}>{deductionLine(d)}</div>
        <div className="muted" style={{ fontSize: 11 }}>From where you ate and how plates felt. Never calories or weight.</div>
        </div>
    );
}