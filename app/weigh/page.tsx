"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runTrend } from "@/core/kalman";

type WeighIn = { weighed_at: string; kg: number };
const DAY_MS = 86_400_000;

// 14-day chart: grey dots are scale readings, the green line is the Kalman trend.
function TrendChart({ points, trend, hide }: { points: { day: number; kg: number }[]; trend: number[]; hide: boolean }) {
  const W = 300, H = 90, pad = 8;
  const all = [...points.map((p) => p.kg), ...trend];
  const lo = Math.min(...all) - 0.3, hi = Math.max(...all) + 0.3;
  const d0 = points[0].day, d1 = Math.max(points[points.length - 1].day, d0 + 1);
  const x = (d: number) => pad + ((d - d0) / (d1 - d0)) * (W - 2 * pad);
  const y = (kg: number) => pad + ((hi - kg) / (hi - lo)) * (H - 2 * pad);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(trend[i]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
      role="img" aria-label={hide ? "Weight trend for the last 14 days" : `Weight trend from ${trend[0].toFixed(1)} to ${trend[trend.length - 1].toFixed(1)} kg`}>
      {points.map((p, i) => <circle key={i} cx={x(p.day)} cy={y(p.kg)} r={3.5} fill="var(--stone)" opacity={0.6} />)}
      <path d={line} fill="none" stroke="var(--matcha-line)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Weigh() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<WeighIn[]>([]);
  const [value, setValue] = useState("");
  const [hide, setHide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const since = new Date(Date.now() - 14 * DAY_MS).toISOString();
    supabase.from("weigh_ins").select("weighed_at, kg").gte("weighed_at", since).order("weighed_at")
      .then(({ data }) => {
        const rows = (data ?? []).map((r) => ({ weighed_at: r.weighed_at, kg: Number(r.kg) }));
        setHistory(rows);
        if (rows.length) setValue(rows[rows.length - 1].kg.toFixed(1)); // start from the last reading
      });
    supabase.from("profiles").select("hide_weight").maybeSingle()
      .then(({ data }) => setHide(Boolean(data?.hide_weight)));
  }, [ready]);

  function fail(text: string) { setNotice(text); setTries((t) => t + 1); }

  function nudge(delta: number) {
    const n = Number(value) || 0;
    setValue(Math.max(0, n + delta).toFixed(1));
  }

  async function toggleHide() {
    const next = !hide;
    setHide(next);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from("profiles").update({ hide_weight: next }).eq("user_id", session.user.id);
  }

  async function save() {
    const kg = Number(value);
    if (!(kg >= 30 && kg <= 250)) return fail("Enter your weight in kg, between 30 and 250.");
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { error } = await supabase.from("weigh_ins").insert({ user_id: session.user.id, kg });
    setBusy(false);
    if (error) return fail(error.message);
    router.push("/");
  }

  if (!ready) return null;

  // Days are fractional, so a skipped morning is just a bigger gap for the filter.
  const points = history.map((h) => ({ day: new Date(h.weighed_at).getTime() / DAY_MS, kg: h.kg }));
  const trend = points.length >= 2 ? runTrend(points).map((s) => s.w) : [];
  const change = trend.length ? trend[trend.length - 1] - trend[0] : 0;
  const now = new Date();
  const stamp = `${now.toLocaleDateString("en-US", { weekday: "short" })} · ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase()}`;

  return (
    <main className="screen" style={{ minHeight: "100dvh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none", minHeight: "var(--tap)", display: "flex", alignItems: "center" }}>← Home</Link>
        <span className="muted">{stamp}</span>
      </div>
      <h1 className="title">Morning weigh-in</h1>
      <p className="muted" style={{ fontSize: 15, margin: 0 }}>Same time, before breakfast, is what makes the trend honest.</p>

      <div className="card" style={{ display: "grid", gap: 16, justifyItems: "center", paddingTop: 28 }}>
        <label style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="sr-only">Weight in kg</span>
          <input id="kg" inputMode="decimal" className={`big-number${hide ? " masked" : ""}`} placeholder="00.0"
            value={value} onChange={(e) => setValue(e.target.value)} />
          <span className="muted" style={{ fontSize: 17 }}>kg</span>
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="round" aria-label="Minus 0.1 kg" onClick={() => nudge(-0.1)}>−</button>
          <button type="button" className="round" aria-label="Plus 0.1 kg" onClick={() => nudge(0.1)}>+</button>
        </div>
        <div className="row" style={{ width: "100%", borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
          <span>Hide the number, show only the trend</span>
          <button type="button" role="switch" aria-checked={hide} aria-label="Hide the number" className="switch" onClick={toggleHide} />
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 15 }}>Last 14 days</span>
          {trend.length > 0 && (
            <span style={{ fontSize: 15 }}>
              Trend {hide ? (change < 0 ? "↓" : change > 0 ? "↑" : "steady") : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change).toFixed(1)} kg`}
            </span>
          )}
        </div>
        {trend.length > 0
          ? <TrendChart points={points} trend={trend} hide={hide} />
          : <div className="muted" style={{ fontSize: 15 }}>Your line starts after two weigh-ins.</div>}
        <div className="muted">A higher number after a salty dinner or a hard workout is water. The line ignores it.</div>
      </div>

      {notice && <div key={tries} className="alert" role="alert">{notice}</div>}

      <button type="button" className="btn" onClick={save} disabled={busy} style={{ marginTop: "auto" }}>
        {busy ? "Saving..." : "Save weigh-in"}
      </button>
    </main>
  );
}