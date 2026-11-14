"use client";

// Today card: "For your Focus". Three dishes from one hall, picked by Naz's suggestDishes
// from the feelings you tapped after eating. No calories here, by design.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { suggestDishes, type Goal, type FeltPlate, type SDish } from "@/core/suggest";
import { GOALS, HITS, HIT_WORD, HALLS, HEALTH_SERVICE_URL } from "@/lib/goals";
import { GoalPicker } from "@/components/GoalPicker";

type Row = { eaten_at: string; photo_key: string | null; dish_id: number | null; feeling: string | null };

// Same picks all day for the same hall; a new mix tomorrow.
function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HALL_KEY = "plate.suggestHall";

export function ForYourGoals({ tz }: { tz: string }) {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [dishes, setDishes] = useState<SDish[]>([]);
  const [plates, setPlates] = useState<FeltPlate[]>([]);
  const [hall, setHall] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      const since = new Date(Date.now() - 60 * 864e5).toISOString();
      const [prof, lib, meals] = await Promise.all([
        supabase.from("profiles").select("goals").eq("user_id", uid).maybeSingle(),
        supabase.from("dishes").select("id, name, hall, kcal, source"),
        supabase.from("meals").select("eaten_at, photo_key, dish_id, feeling").gte("eaten_at", since).order("eaten_at", { ascending: false }),
      ]);
      const err = prof.error ?? lib.error ?? meals.error;
      if (err) return setError(err.message);

      // order parts you skipped are saved at 0 kcal; they aren't food you'd pick
      const ds = ((lib.data ?? []) as (SDish & { kcal: number; source: string })[])
        .filter((d) => !(d.source === "order" && d.kcal === 0));
      setDishes(ds);

      // one FeltPlate per plate (same eaten_at + photo_key); the plate's feeling is any row's feeling
      const byPlate = new Map<string, FeltPlate>();
      for (const r of (meals.data ?? []) as Row[]) {
        const key = `${r.eaten_at}|${r.photo_key ?? ""}`;
        const p = byPlate.get(key) ?? { dishIds: [], feeling: null, at: r.eaten_at };
        if (r.dish_id != null) p.dishIds.push(r.dish_id);
        p.feeling = p.feeling ?? r.feeling;
        byPlate.set(key, p);
      }
      setPlates([...byPlate.values()]);

      // hall: the one you picked here last time, else the hall of your latest plate, else Dewick
      let saved: string | null = null;
      try { saved = localStorage.getItem(HALL_KEY); } catch {}
      const latestDish = ((meals.data ?? []) as Row[]).find((r) => r.dish_id != null)?.dish_id;
      const latestHall = ds.find((d) => d.id === latestDish)?.hall ?? null;
      setHall(saved && HALLS.some((h) => h.id === saved) ? saved : latestHall ?? "dewick");

      setGoals(((prof.data?.goals ?? []) as Goal[]));
    })();
  }, []);

  function pickHall(id: string) {
    setHall(id);
    try { localStorage.setItem(HALL_KEY, id); } catch {}
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const picks = useMemo(() => {
    if (!goals || goals.length === 0 || !hall) return [];
    return suggestDishes({ goals, dishes, plates, hits: HITS, now: new Date(), hall, limit: 3, rand: seeded(`${today}|${hall}`) });
  }, [goals, dishes, plates, hall, today]);

  if (error) return <div className="alert" role="alert">{error}</div>;
  if (!goals) return null;

  if (goals.length === 0) {
    return (
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <GoalPicker onChange={setGoals} />
      </section>
    );
  }

  const title = goals.map((g) => GOALS.find((x) => x.id === g)!.label).join(" + ");
  const why = (wins: number, tries: number) => {
    const count = tries === 1 ? "the one time you had it" : `${wins} of ${tries} times`;
    return goals.length === 1 ? `Left you ${HIT_WORD[goals[0]]} ${count}` : `Worked for you ${count}`;
  };
  const hallLabel = HALLS.find((h) => h.id === hall)?.label ?? hall;

  return (
    <section className="card" aria-label={`For your ${title}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="muted" style={{ fontSize: 13 }}>For your</div>
      <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: "-0.02em", marginTop: -10 }}>{title}</div>

      <div role="group" aria-label="Dining hall" className="chips" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {HALLS.map((h) => (
          <button key={h.id} type="button" className="choice" aria-pressed={hall === h.id} onClick={() => pickHall(h.id)} style={{ padding: "0 12px" }}>{h.label}</button>
        ))}
      </div>

      {picks.length === 0 ? (
        <div className="muted" style={{ fontSize: 14 }}>No saved dishes at {hallLabel} yet. Log a plate there and it shows up here.</div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {picks.map((s) => (
            <li key={s.dish.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 500 }}>{s.dish.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {s.kind === "worked" ? why(s.wins, s.tries) : "New to you. Try it and tap how you felt."}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="muted" style={{ fontSize: 12 }}>From dishes you saved at {hallLabel} and how you felt after eating. Not today&rsquo;s menu.</div>
      {goals.includes("recovery") && (
        <div className="muted" style={{ fontSize: 12 }}>
          Feeling really unwell, or not better after a few days? <a href={HEALTH_SERVICE_URL} target="_blank" rel="noreferrer">Tufts Health Service</a>
        </div>
      )}
    </section>
  );
}