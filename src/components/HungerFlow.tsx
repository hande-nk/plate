"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hungerCheck, type HungerPath } from "@/core/hunger";

type Kind = "hungry" | "dessert";
type Activity = "tea" | "walk" | "text";
type Outcome = "ate" | "waited" | "ate_after_wait" | "planned_later";

export type HungerData = {
  lastPlateAt: Date | null;
  platesToday: number;
  plannedTreat: { id: number; name: string; eaten: boolean } | null;
  tz: string;
};

const WAIT_SECONDS = 600;
const ACTIVITIES: { id: Activity; label: string }[] = [
  { id: "tea", label: "Make tea" },
  { id: "walk", label: "Short walk" },
  { id: "text", label: "Text someone" },
];
const CONTEXT = ["Studying", "Bored", "With friends", "Tired", "Stressed", "Really hungry"];

// "2026-10-30" for tomorrow, as the calendar reads in your time zone
const tomorrowIn = (tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(Date.now() + 864e5));

function Ring({ left }: { left: number }) {
  const r = 80, c = 2 * Math.PI * r, done = 1 - left / WAIT_SECONDS;
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return (
    <svg width="180" height="180" viewBox="0 0 190 190" role="img" aria-label={`${mm}:${ss} left of 10 minutes`} style={{ alignSelf: "center" }}>
      <circle cx="95" cy="95" r={r} fill="none" stroke="var(--hairline)" strokeWidth="10" />
      <circle cx="95" cy="95" r={r} fill="none" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${c * done} ${c}`} transform="rotate(-90 95 95)" />
      <text x="95" y="102" textAnchor="middle" fontSize="34" fontWeight="500" fill="var(--ink)">{mm}:{ss}</text>
      <text x="95" y="126" textAnchor="middle" fontSize="12" fill="var(--stone)">of 10 minutes</text>
    </svg>
  );
}

export function HungerFlow({ data, onClose }: { data: HungerData; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"kind" | "path" | "context">("kind");
  const [kind, setKind] = useState<Kind>("hungry");
  const [result, setResult] = useState<HungerPath | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [left, setLeft] = useState(WAIT_SECONDS);
  const waitStart = useRef<number | null>(null);
  const [treatName, setTreatName] = useState("");
  const [context, setContext] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function choose(k: Kind) {
    setKind(k);
    const r = hungerCheck({ kind: k, now: new Date(), lastPlateAt: data.lastPlateAt,
      platesToday: data.platesToday, plannedTreat: data.plannedTreat, tz: data.tz });   // your core decides
    setResult(r);
    if (r.path === "wait") waitStart.current = Date.now();
    setStep("path");
  }

  // The countdown, from a start time, so it stays right if the phone sleeps
  useEffect(() => {
    if (step !== "path" || result?.path !== "wait") return;
    const t = setInterval(() => {
      const gone = Math.floor((Date.now() - (waitStart.current ?? Date.now())) / 1000);
      setLeft(Math.max(0, WAIT_SECONDS - gone));
    }, 1000);
    return () => clearInterval(t);
  }, [step, result]);

  function finish(o: Outcome) { setOutcome(o); setStep("context"); }

  async function haveTreat() {
    if (!data.plannedTreat) return;
    setBusy(true);
    await supabase.from("planned_treats").update({ eaten_at: new Date().toISOString() }).eq("id", data.plannedTreat.id);
    setBusy(false);
    finish("ate");
  }

  async function planTomorrow() {
    const name = treatName.trim();
    if (!name) return setError("What would you like tomorrow?");
    setBusy(true);
    const { error } = await supabase.from("planned_treats")
      .upsert({ day: tomorrowIn(data.tz), name, eaten_at: null }, { onConflict: "user_id,day" });
    setBusy(false);
    if (error) return setError(error.message);
    finish("planned_later");
  }

  async function save(ctx: string[] = context) {
    if (!result || !outcome) return;
    setBusy(true);
    setError(null);
    const minutes = data.lastPlateAt ? Math.max(0, Math.floor((Date.now() - data.lastPlateAt.getTime()) / 60000)) : null;
    const { error } = await supabase.from("cravings").insert({
      kind, path: result.path, outcome, context: ctx,
      minutes_since_plate: minutes,
      wait_activity: result.path === "wait" ? activity : null,
      wait_seconds: result.path === "wait" && waitStart.current ? Math.min(1800, Math.floor((Date.now() - waitStart.current) / 1000)) : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    onClose();
    if (outcome === "ate" || outcome === "ate_after_wait") router.push("/log");   // log what you chose to eat
  }

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <button key={label} type="button" className="choice" aria-pressed={on} onClick={onClick} style={{ padding: "0 14px" }}>{label}</button>
  );

  let body: React.ReactNode = null;

  if (step === "kind") {
    body = (
      <>
        <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: "-0.03em" }}>What&rsquo;s going on?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" className="option stack" onClick={() => choose("hungry")}>
            <span>I&rsquo;m hungry</span><span className="muted" style={{ fontSize: 12 }}>my stomach says so</span>
          </button>
          <button type="button" className="option stack" onClick={() => choose("dessert")}>
            <span>I want dessert</span><span className="muted" style={{ fontSize: 12 }}>something sweet</span>
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>Only you see this. It never shows up in your edition or a notification.</div>
      </>
    );
  } else if (step === "path" && result?.path === "eat") {
    const since = data.lastPlateAt
      ? `It's been ${Math.floor((Date.now() - data.lastPlateAt.getTime()) / 3.6e6)} h ${Math.floor(((Date.now() - data.lastPlateAt.getTime()) % 3.6e6) / 6e4)} min since your last plate.`
      : "Nothing is logged yet today.";
    body = (
      <>
        <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.05 }}>That&rsquo;s real hunger. Eat something.</div>
        <div className="muted" style={{ fontSize: 14 }}>{result.reason === "low-day" ? "Today has been light so far." : since}</div>
        <div className="muted" style={{ fontSize: 12 }}>Some protein with it tends to keep you full longer.</div>
        <button type="button" className="btn" onClick={() => finish("ate")}>Log a snack</button>
        <button type="button" className="btn-quiet" onClick={() => finish("waited")}>I&rsquo;m okay for now</button>
      </>
    );
  } else if (step === "path" && result?.path === "planned") {
    body = (
      <>
        <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Your {result.treat} is planned for today.</div>
        <div className="muted" style={{ fontSize: 14 }}>Enjoy it.</div>
        <button type="button" className="btn" onClick={haveTreat} disabled={busy}>Have it now</button>
        <button type="button" className="btn-quiet" onClick={() => finish("waited")}>Later</button>
      </>
    );
  } else if (step === "path" && result?.path === "wait") {
    body = (
      <>
        <div className="muted" style={{ fontSize: 12 }}>You ate {result.minutesSincePlate} min ago</div>
        <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Want to give it ten minutes?</div>
        <div className="muted" style={{ fontSize: 14 }}>Cravings often ease once your attention moves. If it&rsquo;s still there after, have it and enjoy it.</div>
        <Ring left={left} />
        <div role="group" aria-label="Something to do" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {ACTIVITIES.map((a) => chip(a.label, activity === a.id, () => setActivity(activity === a.id ? null : a.id)))}
        </div>
        {kind === "dessert" && (
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Plan a treat for tomorrow" placeholder="Or plan it for tomorrow: what?" value={treatName}
              onChange={(e) => setTreatName(e.target.value)} style={{ flex: 1, minHeight: 44, padding: "0 12px", borderRadius: 14, border: "1px solid var(--hairline)", fontSize: 16 }} />
            <button type="button" className="btn-quiet" onClick={planTomorrow} disabled={busy}>Plan it</button>
          </div>
        )}
        <button type="button" className="btn" onClick={() => finish("ate_after_wait")}>I still want it</button>
        <button type="button" className="btn-quiet" onClick={() => finish("waited")}>I&rsquo;m good now</button>
      </>
    );
  } else if (step === "context") {
    body = (
      <>
        <div style={{ fontWeight: 600, fontSize: 26, letterSpacing: "-0.03em" }}>What was going on?</div>
        <div className="muted" style={{ fontSize: 13 }}>Pick any. This only helps Plate spot your patterns.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CONTEXT.map((c) => chip(c, context.includes(c), () => setContext((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))))}
        </div>
        <button type="button" className="btn" onClick={() => save()} disabled={busy}>{busy ? "Saving..." : "Done"}</button>
        <button type="button" className="btn-quiet" onClick={() => save([])} disabled={busy} style={{ border: "none" }}>Skip</button>
      </>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(18,18,18,0.35)" }} />
      <div role="dialog" aria-modal="true" aria-label="Hungry?"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 430, margin: "0 auto", maxHeight: "92vh", overflowY: "auto",
                 borderRadius: "30px 30px 0 0", background: "#fff", padding: "12px 20px calc(30px + env(safe-area-inset-bottom))",
                 display: "flex", flexDirection: "column", gap: 14 }}>
        <div aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "#DADAD4" }} />
        {body}
        {error && <div className="alert" role="alert">{error}</div>}
      </div>
    </div>
  );
}