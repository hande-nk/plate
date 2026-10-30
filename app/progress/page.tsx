"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runTrend } from "@/core/kalman";
import { dailyRange, type PaceChoice } from "@/core/range";
import type { Activity, Sex } from "@/core/energy";
import { weekCalories, type DayBar } from "@/core/calories";
import { feltGood, type Feeling } from "@/core/feel";

type Span = "week" | "month" | "semester";
const SPAN_DAYS: Record<Span, number> = { week: 7, month: 30, semester: 120 };
const DAY_MS = 864e5;
const PACE_KG_WEEK: Record<PaceChoice, number | null> = { gentle: 0.25, steady: 0.5, track: null };

type Prof = { height_cm: number; age: number; sex: Sex; activity: Activity; pace: PaceChoice;
  hide_numbers: boolean; hide_weight: boolean; tz: string };
type Meal = { eaten_at: string; photo_key: string | null; kcal: number; protein_g: number | null;
  carbs_g: number | null; fat_g: number | null; feeling: Feeling | null; dishes: { hall: string | null } | null };
type Weigh = { day: string; kg: number };

// ---------- small helpers (display only; the logic lives in src/core) ----------
const dayIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const hourIn = (d: Date, tz: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(d));
const plateKey = (m: Meal) => `${m.eaten_at}|${m.photo_key ?? ""}`;
const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T12:00:00Z`) / DAY_MS);
function mondayOf(today: string) {                       // "YYYY-MM-DD" of this week's Monday
  const d = new Date(`${today}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}
const fmtKg = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(1)} kg`;
const HALLS: Record<string, string> = { carm: "Carm", dewick: "Dewick", hodge: "Hodgdon", kindlevan: "Kindlevan" };
const LETTER: Record<Feeling, string> = { energized: "E", satisfied: "S", heavy: "H", hungry: "Hu" };

function Card({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 26,
      ...(dark ? { background: "var(--ink)", color: "var(--paper)", border: "none" } : {}) }}>
      {children}
    </div>
  );
}
const Label = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) =>
  <div style={{ fontSize: 11, color: dark ? "#B8B8B2" : "var(--stone)" }}>{children}</div>;

export default function Progress() {
  const router = useRouter();
  const [span, setSpan] = useState<Span>("month");
  const [prof, setProf] = useState<Prof | null>(null);
  const [weighs, setWeighs] = useState<Weigh[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { router.replace("/login"); return; }
        const since = new Date(Date.now() - SPAN_DAYS.semester * DAY_MS);
        const [p, w, m] = await Promise.all([
            supabase.from("profiles").select("height_cm, age, sex, activity, pace, hide_numbers, hide_weight, tz").maybeSingle(),
            supabase.from("weigh_ins").select("day, kg").gte("day", since.toISOString().slice(0, 10)).order("day"),
            supabase.from("meals").select("eaten_at, photo_key, kcal, protein_g, carbs_g, fat_g, feeling, dishes(hall)")
            .gte("eaten_at", since.toISOString()).order("eaten_at"),
        ]);
        const err = p.error ?? w.error ?? m.error;
        if (err) { setError(err.message); return; }
        if (!p.data) { router.replace("/welcome"); return; }
        setProf({ ...p.data, height_cm: Number(p.data.height_cm), age: Number(p.data.age) });
        setWeighs((w.data ?? []).map((r: Weigh) => ({ day: r.day, kg: Number(r.kg) })));
        setMeals((m.data ?? []).map((r) => ({ ...r, dishes: Array.isArray(r.dishes) ? r.dishes[0] ?? null : r.dishes })));
    })();
  }, [router]);

  if (error) return <main className="screen"><div className="alert" role="alert">{error}</div></main>;
  if (!prof) return null;

  const now = new Date();
  const today = dayIn(now, prof.tz);
  const cutoff = now.getTime() - SPAN_DAYS[span] * DAY_MS;

  // ---------- weight trend (your Kalman filter) ----------
  const series = weighs.filter((w) => Date.parse(`${w.day}T12:00:00Z`) >= cutoff).map((w) => ({ day: dayNumber(w.day), kg: w.kg }));
  const states = runTrend(series);
  const first = states[0], last = states.at(-1);
  const change = first && last ? last.w - first.w : 0;
  const weeklyRate = last ? last.v * 7 : 0;
  const paceKg = PACE_KG_WEEK[prof.pace];
  let trendLine = "Weigh in at least twice to see your trend.";
  if (states.length >= 2) {
        if (paceKg === null) trendLine = `About ${fmtKg(weeklyRate)} a week. You're just tracking, so there's no pace to compare.`;
        else if (weeklyRate < -1) trendLine = "Faster than 1 kg a week. That's quicker than Plate recommends; worth a look at your range.";
        else if (weeklyRate <= -paceKg * 0.8) trendLine = "On or ahead of your pace.";
        else trendLine = "Slower than your pace this stretch. Trends wobble; it's the weeks that count.";
  }
  const chart = (() => {
    if (states.length < 2) return null;
    const W = 322, H = 150, L = 40, R = 318, T = 18, B = 128;
    const kgs = [...series.map((s) => s.kg), ...states.map((s) => s.w)];
    const lo = Math.min(...kgs) - 0.3, hi = Math.max(...kgs) + 0.3;
    const d0 = series[0].day, d1 = Math.max(series.at(-1)!.day, d0 + 1);
    const X = (d: number) => L + ((d - d0) / (d1 - d0)) * (R - L);
    const Y = (kg: number) => T + ((hi - kg) / (hi - lo)) * (B - T);
    const line = states.map((s, i) => `${i ? "L" : "M"}${X(s.t).toFixed(1)} ${Y(s.w).toFixed(1)}`).join(" ");
    const pace = paceKg === null ? null : `M${X(d0)} ${Y(states[0].w)} L${X(d1)} ${Y(states[0].w - (paceKg / 7) * (d1 - d0))}`;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight trend, ${fmtKg(change)} over this period`}>
        <text x="0" y="22" fill="#8A8A84" fontSize="11">{hi.toFixed(1)}</text>
        <text x="0" y={B} fill="#8A8A84" fontSize="11">{lo.toFixed(1)}</text>
        {pace && <path d={pace} stroke="#5A5A56" strokeWidth="1.5" strokeDasharray="4 5" fill="none" />}
        <g fill="#6E6E68">{series.map((s) => <circle key={s.day} cx={X(s.day)} cy={Y(s.kg)} r="3" />)}</g>
        <path d={line} stroke="var(--matcha)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  })();
  const firstWeigh = weighs[0]?.day;
  const honestyDate = firstWeigh ? new Date(Date.parse(`${firstWeigh}T12:00:00Z`) + 21 * DAY_MS)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : null;

  // ---------- calories this week (your weekCalories + dailyRange) ----------
  const latestKg = weighs.at(-1)?.kg ?? null;
  const range = dailyRange({ heightCm: prof.height_cm, ageYears: prof.age, sex: prof.sex, activity: prof.activity }, latestKg, prof.pace);
  const target = range?.target ?? null;
  const weekOf = mondayOf(today);
  const thisWeek = meals.filter((m) => dayIn(new Date(m.eaten_at), prof.tz) >= weekOf);
  const cal = weekCalories(thisWeek, weekOf, now, prof.tz, target);
  const maxKcal = Math.max(target ? target * 1.25 : 0, ...cal.days.map((d) => d.kcal ?? 0), 1);
  const barColor = (d: DayBar) =>
    d.status === "in" || d.status === "logged" ? "var(--ink)" : d.status === "above" ? "#9A9A94"
      : d.status === "below" ? "#C9C9C2" : d.status === "open" ? "#DADAD4" : "transparent";

  // ---------- plates in the chosen span ----------
  const inSpan = meals.filter((m) => Date.parse(m.eaten_at) >= cutoff);
  const plates = new Map<string, Meal[]>();
  for (const m of inSpan) plates.set(plateKey(m), [...(plates.get(plateKey(m)) ?? []), m]);
  const plateList = Array.from(plates.values());

  // macros from grams (kcal per gram: protein 4, carbs 4, fat 9)
  const g = inSpan.reduce((a, m) => ({ p: a.p + (m.protein_g ?? 0), c: a.c + (m.carbs_g ?? 0), f: a.f + (m.fat_g ?? 0) }), { p: 0, c: 0, f: 0 });
  const mk = g.p * 4 + g.c * 4 + g.f * 9;
  const pct = mk ? { p: Math.round((g.p * 4 / mk) * 100), c: Math.round((g.c * 4 / mk) * 100), f: Math.round((g.f * 9 / mk) * 100) } : null;

  // felt good now, and week by week
  const felt = feltGood(plateList.map((rows) => rows[0].feeling));
  const byWeek = new Map<string, (Feeling | null)[]>();
  for (const rows of plateList) {
    const wk = mondayOf(dayIn(new Date(rows[0].eaten_at), prof.tz));
    byWeek.set(wk, [...(byWeek.get(wk) ?? []), rows[0].feeling]);
  }
  const weekly = Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([, fs]) => feltGood(fs).pct).filter((x): x is number => x !== null);

  // how each meal felt this week: morning / midday / evening x Mon..Sun
  const SLOTS = ["Morning", "Midday", "Evening"];
  const slotOf = (d: Date) => { const h = hourIn(d, prof.tz); return h < 11 ? 0 : h < 15 ? 1 : 2; };
  const grid: (Feeling | null | "none")[][] = SLOTS.map(() => Array(7).fill("none"));
  for (const rows of plateList) {
    const at = new Date(rows[0].eaten_at);
    const d = dayIn(at, prof.tz);
    if (d < weekOf) continue;
    const col = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${weekOf}T00:00:00Z`)) / DAY_MS);
    if (col >= 0 && col < 7) grid[slotOf(at)][col] = rows[0].feeling;
  }

  // where you feel best: halls with 3+ rated plates
  const hallFeel = new Map<string, (Feeling | null)[]>();
  for (const rows of plateList) {
    const hall = rows[0].dishes?.hall;
    if (hall) hallFeel.set(hall, [...(hallFeel.get(hall) ?? []), rows[0].feeling]);
  }
  const halls = Array.from(hallFeel.entries()).map(([h, fs]) => ({ h, r: feltGood(fs) }))
    .filter((x) => x.r.rated >= 3).sort((a, b) => (b.r.pct ?? 0) - (a.r.pct ?? 0));

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 13 }}>← Home</Link>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1 }}>Progress</h1>

      <div role="radiogroup" aria-label="Time span" style={{ display: "flex", padding: 4, borderRadius: 16, background: "#fff" }}>
        {(["week", "month", "semester"] as Span[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={span === s} onClick={() => setSpan(s)}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, border: "none", fontFamily: "inherit", fontSize: 13, cursor: "pointer",
              background: span === s ? "var(--ink)" : "transparent", color: span === s ? "var(--paper)" : "var(--stone)" }}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Weight trend */}
      {prof.hide_weight ? (
        <Card><Label>Weight trend</Label><div style={{ fontSize: 15 }}>Hidden. Turn it back on in Profile any time.</div></Card>
      ) : (
        <Card dark>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label dark>Weight trend</Label>
            {states.length >= 2 && <span style={{ fontWeight: 500, fontSize: 34, letterSpacing: "-0.03em", color: "var(--matcha)" }}>{fmtKg(change)}</span>}
          </div>
          {chart}
          <div style={{ fontSize: 12, color: "#B8B8B2" }}>{trendLine}</div>
        </Card>
      )}

      {/* Calories this week */}
      {prof.hide_numbers ? (
        <Card><Label>Calories this week</Label><div style={{ fontSize: 15 }}>Calorie numbers are hidden.</div></Card>
      ) : (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Label>Calories this week</Label>
            <span style={{ fontSize: 13 }}>{target === null ? "Just tracking" : `${cal.inRange} of ${cal.counted} in range`}</span>
          </div>
          <div style={{ position: "relative", height: 120, display: "flex", alignItems: "flex-end", gap: 10 }}>
            {target !== null && (
              <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, borderRadius: 8, background: "#EEF2E3",
                bottom: 18 + (target * 0.9 / maxKcal) * 96, height: (target * 0.2 / maxKcal) * 96 }} />
            )}
            {cal.days.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}
                aria-label={`${d.label}: ${d.kcal === null ? "nothing logged" : `${d.kcal} kcal, ${d.status}`}`}>
                <div style={{ width: "100%", borderRadius: 8, background: barColor(d),
                  height: d.kcal === null ? 6 : Math.max(6, (d.kcal / maxKcal) * 96),
                  border: d.status === "none" ? "1px dashed #BDBDB6" : undefined }} />
                <span style={{ fontSize: 11, color: "var(--stone)" }}>{d.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--stone)" }}>
            {target === null ? "Bars show what you logged each day." : "The band is your range. Grey bars are outside it, not “bad.” Today is still open."}
          </div>
        </Card>
      )}

      {/* Macros + felt good */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Card>
            <Label>Macros</Label>
            {pct ? (
              <>
                <svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label={`Protein ${pct.p}%, carbs ${pct.c}%, fat ${pct.f}%`} style={{ alignSelf: "center" }}>
                  <circle cx="55" cy="55" r="40" fill="none" stroke="#DADAD4" strokeWidth="14" />
                  <circle cx="55" cy="55" r="40" fill="none" stroke="var(--ink)" strokeWidth="14" strokeDasharray={`${2.513 * pct.p} 251.3`} transform="rotate(-90 55 55)" />
                  <circle cx="55" cy="55" r="40" fill="none" stroke="#8A8A84" strokeWidth="14" strokeDasharray={`${2.513 * pct.c} 251.3`} strokeDashoffset={-2.513 * pct.p} transform="rotate(-90 55 55)" />
                  <text x="55" y="60" textAnchor="middle" fontSize="16" fill="var(--ink)">{pct.p}%</text>
                </svg>
                <div style={{ fontSize: 11, color: "var(--stone)", textAlign: "center" }}>Protein {pct.p}% · Carbs {pct.c}% · Fat {pct.f}%</div>
              </>
            ) : <div style={{ fontSize: 13 }}>Log a few plates first.</div>}
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <Label>Felt good</Label>
            <div style={{ fontWeight: 500, fontSize: 46, letterSpacing: "-0.04em", lineHeight: 1 }}>{felt.pct === null ? "–" : `${felt.pct}%`}</div>
            {weekly.length >= 2 && (
              <svg width="100%" height="40" viewBox="0 0 130 40" aria-hidden="true">
                <path d={weekly.map((v, i) => `${i ? "L" : "M"}${2 + (i / (weekly.length - 1)) * 126} ${36 - (v / 100) * 32}`).join(" ")}
                  stroke="var(--matcha-line)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
            <div style={{ fontSize: 11, color: "var(--stone)" }}>
              {felt.rated ? `${felt.good} of ${felt.rated} rated plates${weekly.length >= 2 ? ", week by week" : ""}` : "Tap a feeling on your plates"}
            </div>
          </Card>
        </div>
      </div>

      {/* How each meal felt, this week */}
      <Card>
        <Label>How each meal felt this week</Label>
        <div style={{ display: "grid", gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))", gap: 5, fontSize: 11, color: "var(--stone)", alignItems: "center" }}>
          <span />
          {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => <span key={i} style={{ textAlign: "center" }}>{l}</span>)}
          {SLOTS.map((slot, r) => (
            <div key={slot} style={{ display: "contents" }}>
              <span>{slot}</span>
              {grid[r].map((f, c) => (
                <span key={c} style={{ height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600,
                  ...(f === "none" ? { border: "1px dashed #DADAD4" }
                    : f === null ? { background: "#ECECE6", color: "var(--stone)" }
                    : f === "energized" ? { background: "var(--ink)", color: "#fff" }
                    : f === "satisfied" ? { background: "#6A6A66", color: "#fff" }
                    : { background: "#D5D5CF", color: "var(--ink)" }) }}>
                  {f === "none" ? "" : f === null ? "·" : LETTER[f]}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "var(--stone)" }}>
          <span>E energized</span><span>S satisfied</span><span>H heavy</span><span>Hu hungry</span><span>· not rated</span>
        </div>
      </Card>

      {/* Where you feel best */}
      <Card>
        <Label>Where you feel best</Label>
        {halls.length === 0 ? (
          <div style={{ fontSize: 13 }}>Shows once a hall has 3 plates with a feeling.</div>
        ) : halls.map(({ h, r }) => (
          <div key={h} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 74 }}>{HALLS[h] ?? h}</span>
            <span style={{ flex: 1, height: 10, borderRadius: 5, background: "#ECECE6" }}>
              <span style={{ display: "block", width: `${r.pct}%`, height: 10, borderRadius: 5, background: "var(--ink)" }} />
            </span>
            <span style={{ width: 34, textAlign: "right" }}>{r.pct}%</span>
          </div>
        ))}
      </Card>

      {/* Honesty check: not faked, waits for data */}
      <div style={{ borderRadius: 20, border: "1px solid #DADAD4", padding: "12px 14px", fontSize: 13 }}>
        Honesty check {honestyDate ? `arrives around ${honestyDate}` : "starts after your first weigh-in"}: it compares what you logged with your weight trend, after 3 weeks of both.
      </div>
    </main>
  );
}