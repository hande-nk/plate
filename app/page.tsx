"use client"    

import { useEffect, useState} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dayTotals } from "@/core/day";
import { PlatePhoto } from "@/components/PlatePhoto";
import { startOfWeek, weekWins } from "@/core/week";
import { WinCard } from "@/components/WinCard";
import { Safiye } from "@/components/Safiye";
import { feltGood } from "@/core/feel";
import FeelingChips, { type Feeling } from "@/components/FeelingChips";
import { ClueSheet, CaseMeter, type Clue } from "@/components/ClueSheet";
import { HungerFlow } from "@/components/HungerFlow";
import { localDay } from "@/lib/day";
import Link from "next/link";

type Meal = {
  id: number;
  eaten_at: string;
  dish_name: string;
  portion: number |null;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  photo_key: string | null;
  feeling: Feeling | null;
};


//One number in the Today strip, every column after the first gets a thun divider
function Stat({ label, value, unit, divider }: { label: string; value: string; unit?: string; divider?: boolean }) {
  return (
    <div style={{ padding: "0 14px", display: "grid", gap: 2, borderLeft: divider ? "1px solid var(--hairline)" : undefined }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
        {value}{unit && <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}> {unit}</span>}
      </div>
    </div>
  );
}


export default function Today() {
  const router = useRouter();
  // Stays false until we know there's a session, so Today never flashes for a logged-out visitor.
  const [ready, setReady] = useState(false);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideNumbers, setHideNumbers] = useState(false);
  const [cases, setCases] = useState<{ clue_id: number; clues: Clue }[]>([]);
  const [sheet, setSheet] = useState<Clue | null>(null);
  const [tz, setTz] = useState("America/New_York");
  const [treat, setTreat] = useState<{ id: number; name: string; eaten: boolean } | null>(null);
  const [hungry, setHungry] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if(!data.session) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("onboarded_at, hide_numbers, tz").maybeSingle();
      if(!prof?.onboarded_at) { router.replace("/welcome"); return; }
      setHideNumbers(Boolean(prof.hide_numbers));
      if (prof.tz) setTz(prof.tz);
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    supabase.from("planned_treats").select("id, name, eaten_at").eq("day", localDay()).maybeSingle()
      .then(({ data }) => setTreat(data ? { id: data.id, name: data.name, eaten: !!data.eaten_at } : null));
  }, [ready]);

  //today's meals, from midnight on this phone
  useEffect(() => {
    if(!ready) return;
    //const start = new Date();
    //start.setHours(0, 0, 0, 0);
    supabase
      .from("meals")
      .select("id, eaten_at, dish_name, portion, kcal, protein_g, carbs_g, fat_g, photo_key, feeling")
      .gte("eaten_at", startOfWeek(new Date()).toISOString())
      .order("eaten_at", {ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMeals(data ?? []);
      });
  }, [ready]);

  useEffect(() => {
  if (!ready) return;
  supabase.from("user_clues").select("clue_id, clues(ord, title, body, place)").order("found_at", { ascending: false })
    .then(({ data }) => {
      const rows = (data ?? []) as unknown as { clue_id: number; clues: Clue }[];
      setCases(rows);
      const n = Number(new URLSearchParams(window.location.search).get("clue"));
      const hit = rows.find((r) => r.clue_id === n);
      if (hit) setSheet(hit.clues);
    });
}, [ready]);

  if (!ready) return null;

  const week = meals ?? [];// everything since Monday
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const list = week.filter((m) => new Date(m.eaten_at) >= midnight);   // just today

  // One time per plate (dishes saved together share eaten_at), for the Small win card.
  const plateTimes = Array.from(new Set(week.map((m) => `${m.eaten_at}|${m.photo_key ?? ""}`)))
  .map((key) => new Date(key.split("|")[0]));
  const win = weekWins(plateTimes, new Date());
  const totals = dayTotals(list);
  // One feeling per plate this week (same key as the plate cards)
  const weekPlates = new Map<string, Meal>();
  for (const m of week) weekPlates.set(`${m.eaten_at}|${m.photo_key ?? ""}`, m);
  const felt = feltGood(Array.from(weekPlates.values()).map((m) => m.feeling));

  // Update every row of a plate in memory after a chip tap
  function setPlateFeeling(ids: number[], f: Feeling | null) {
    setMeals((prev) => prev?.map((m) => (ids.includes(m.id) ? { ...m, feeling: f } : m)) ?? prev);
  }

  //rows saved together share one eaten_at , so each group is one plate
  const plates = new Map<string, Meal[]>();
  for (const m of list)  {
    const key = `${m.eaten_at}|${m.photo_key ?? ""}`; // same time + same photo = same plate
    plates.set(key, [...(plates.get(key) ?? []), m]);
  }
  const lastPlateAt = list.length ? new Date(Math.max(...list.map((m) => new Date(m.eaten_at).getTime()))) : null;
  const showPill = new Date().getHours() >= 18;

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric"});

  return (
    <>
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="muted">{today}</div>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Hi Hande.</h1>

      {/* One card, three numbers, like the v3 Today strip */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: hideNumbers ? "repeat(2, 1fr)" : "repeat(4, 1fr)", padding: "14px 0" }}>
        {!hideNumbers && <Stat label="Today" value={totals.kcal.toLocaleString("en-US")} unit="kcal" />}
        {!hideNumbers && <Stat label="Protein" value={totals.protein_g === null ? "-" : String(totals.protein_g)} unit="g" divider />}
        <Stat label="Plates" value={String(plates.size)} divider={!hideNumbers} />
        <Stat label="Felt good (wk)" value={felt.pct === null ? "-" : String(felt.pct)} unit={felt.pct === null ? undefined : "%"} divider />
      </div>
      <Link href="/progress" style={{ alignSelf: "flex-end", fontSize: 13, color: "var(--stone)", textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>
        See progress 
      </Link>

      {error && <div className="alert" role="alert">{error}</div> }

      <div className="muted" style={{ marginTop: 8 }}>Logged today</div>

      {meals !== null && list.length === 0 && (
        <div className="card">
          <div style={{ fontWeight: 500 }}>Nothing logged yet today</div>
          <div className="muted">Tap + and snap your plate.</div>
        </div>
      )}


      {Array.from(plates).map(([key, rows]) => {
        const time = new Date(rows[0].eaten_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const names = rows
          .map((m) => (m.portion !== null && m.portion !== 1 ? `${m.dish_name} × ${m.portion}` : m.dish_name))
          .join(", ");
        return (
          <article key={key} className="card" style={{ padding: 0, overflow: "hidden" }}>
            {rows[0].photo_key && <PlatePhoto photoKey={rows[0].photo_key} />}
            <div style={{ display: "grid", gap: 10, padding: 20}}>
              <span className="pill">{time}</span>
              <div style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.3 }}>{names}</div>
              <div className="muted" style={{ fontSize: 15 }}>
                {!hideNumbers && `${dayTotals(rows).kcal} kcal • `}{rows.length} {rows.length === 1 ? "item" : "items"}
              </div>
              <FeelingChips mealIds={rows.map((m) => m.id)} initial={rows[0].feeling} onChange={(f) => setPlateFeeling(rows.map((m) => m.id), f)} />
            </div>
          </article>
        );
      })}
      

      {win.count > 0 && <WinCard count={win.count} days={win.days} />}
      {treat && !treat.eaten && (
          <div className="card" style={{ display: "grid", gap: 2 }}>
            <div className="muted" style={{ fontSize: 12 }}>Planned treat today</div>
            <div style={{ fontWeight: 500 }}>{treat.name}</div>
          </div>
        )}

    <div className="card" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: "var(--paper)", overflow: "hidden", flex: "none" }}>
        <Safiye mood="kuzum" size={64} />
      </div>
      <div style={{ display: "grid", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Safiye Hanım • case file No. 1</div>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          {cases[0] ? <>Clue {cases[0].clues.ord}: {cases[0].clues.title}.</> : <>&ldquo;Kuzum, the case is open. Every plate you log is a clue.&rdquo;</>}
        </div>
        <CaseMeter found={cases.length} dark />
      </div>
    </div>

      </main>

      {/* Glass only on controls (v3.1 HIG pass). More tabs join as their pages ship. */}
      <nav className="tabbar glass" aria-label="Main">
        <Link href="/" aria-current="page">Home</Link>
        <Link href="/add">Dishes</Link>
        <Link href="/log" className="plus" aria-label="Log a meal">+</Link>
        <Link href="/weigh">Weight</Link>
        <Link href="/profile">Profile</Link>
       
      </nav>
      {sheet && <ClueSheet clue={sheet} found={cases.length} onClose={() => { setSheet(null); router.replace("/"); }} />}
      {showPill && !hungry && (
        <button type="button" className="hunger-pill glass" onClick={() => setHungry(true)}>Craving something?</button>
      )}
      {hungry && (
        <HungerFlow data={{ lastPlateAt, platesToday: plates.size, plannedTreat: treat, tz }} onClose={() => setHungry(false)} />
      )}
    </>
  );
}
