"use client";

// Pick up to two goals. Saves on tap and reverts on error. Use on Welcome and Profile.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GOALS } from "@/lib/goals";
import type { Goal } from "@/core/suggest";

export function GoalPicker({ onChange }: { onChange?: (goals: Goal[]) => void }) {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      supabase.from("profiles").select("goals").eq("user_id", uid).maybeSingle()
        .then(({ data: p }) => setGoals(((p?.goals ?? []) as Goal[])));
    });
  }, []);

  async function tap(g: Goal) {
    if (!goals) return;
    const prev = goals;
    // tapping a third goal drops the oldest one
    const next = goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g].slice(-2);
    setGoals(next);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("profiles").update({ goals: next }).eq("user_id", uid);
    if (error) { setGoals(prev); setError(error.message); return; }
    onChange?.(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="q">What do you want from your food?</div>
      <div className="muted" style={{ fontSize: 13 }}>Pick up to two. You can change this any time.</div>
      <div role="group" aria-label="Your goals" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {GOALS.map((g) => (
          <button key={g.id} type="button" className="option stack" aria-pressed={goals?.includes(g.id) ?? false}
            disabled={!goals} onClick={() => tap(g.id)} style={{ textAlign: "left" }}>
            <span>{g.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{g.blurb}</span>
          </button>
        ))}
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
  );
}