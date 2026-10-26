"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { localDay } from "@/lib/day";
import type { Activity, Sex } from "@/core/energy";
import { dailyRange, type PaceChoice } from "@/core/range";
import { ACTIVITY, PACES, AVOIDS, MOTIVATIONS } from "@/lib/profileOptions";
import { enablePush, disablePush } from "@/lib/push";

type Prof = {
  height_cm: number; age: number; sex: Sex; activity: Activity; pace: PaceChoice;
  avoids: string[] | null; allergy_note: string | null; motivations: string[] | null;
  lunch_nudge: boolean; weigh_reminder: boolean; sunday_edition: boolean;
  hide_numbers: boolean; hide_weight: boolean;
};
type NotifyKey = "lunch_nudge" | "weigh_reminder" | "sunday_edition";

const COLS = "height_cm, age, sex, activity, pace, avoids, allergy_note, motivations, lunch_nudge, weigh_reminder, sunday_edition, hide_numbers, hide_weight";

function Toggle({ label, note, on, onChange, disabled }: { label: string; note?: string; on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="row">
      <span>{label}{note && <span className="muted" style={{ fontSize: 15 }}> {note}</span>}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange?.(!on)} />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [prof, setProf] = useState<Prof | null>(null);
  const [kg, setKg] = useState<number | null>(null);       // latest weigh-in
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [allergy, setAllergy] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function fail(text: string) { setNotice(text); setTries((t) => t + 1); }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      setUid(data.session.user.id);
      const [{ data: p, error }, { data: w }] = await Promise.all([
        supabase.from("profiles").select(COLS).maybeSingle(),
        supabase.from("weigh_ins").select("kg").order("day", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (error) { fail(error.message); return; }
      if (!p) { router.replace("/welcome"); return; }
      const prof = { ...p, height_cm: Number(p.height_cm), age: Number(p.age) } as Prof;
      setProf(prof);
      setKg(w ? Number(w.kg) : null);
      setHeight(String(prof.height_cm));
      setAge(String(prof.age));
      setAllergy(prof.allergy_note ?? "");
    })();
  }, [router]);

  // Show the change right away; put it back if the save fails
  async function save(patch: Partial<Prof>) {
    if (!prof || !uid) return;
    const before = prof;
    setProf({ ...prof, ...patch });
    setNotice(null);
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", uid);
    if (error) { setProf(before); fail(error.message); }
  }

  function saveHeight() {
    if (!prof) return;
    const h = Number(height);
    if (!(h >= 100 && h <= 250)) { setHeight(String(prof.height_cm)); return fail("Height should be in cm, between 100 and 250."); }
    if (Math.round(h) !== prof.height_cm) save({ height_cm: Math.round(h) });
  }

  function saveAge() {
    if (!prof) return;
    const a = Number(age);
    if (!(Number.isInteger(a) && a >= 17 && a <= 100)) { setAge(String(prof.age)); return fail("Age should be between 17 and 100."); }
    if (a !== prof.age) save({ age: a });
  }

  function flipAvoid(item: string) {
    if (!prof) return;
    const list = prof.avoids ?? [];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    save({ avoids: next, ...(next.includes("Allergy") ? {} : { allergy_note: null }) });
    if (!next.includes("Allergy")) setAllergy("");
  }

  function pickMotivation(id: string) {
    if (!prof) return;
    const prev = prof.motivations ?? [];
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id];
    save({ motivations: next });
  }

  async function setNotify(key: NotifyKey, on: boolean) {
    if (!prof) return;
    if (on) {
      try {
        const r = await enablePush(); // first await, so iOS still counts the tap
        if (r === "denied") return fail("Notifications are off for Plate. Turn them on in iPhone Settings → Notifications → Plate.");
        if (r === "unsupported") return fail("Open Plate from the home-screen icon to get notifications.");
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    }
    const after = { ...prof, [key]: on };
    await save({ [key]: on } as Partial<Prof>);
    if (!after.lunch_nudge && !after.weigh_reminder && !after.sunday_edition) disablePush().catch(() => {});
  }

  async function download() {
    setBusy(true);
    const [p, w, m] = await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("weigh_ins").select("*").order("day"),
      supabase.from("meals").select("*").order("eaten_at"),
    ]);
    setBusy(false);
    const err = p.error ?? w.error ?? m.error;
    if (err) return fail(err.message);
    const file = { exported_at: new Date().toISOString(), profile: p.data, weigh_ins: w.data, meals: m.data,
      note: "Plate photos stay on your phone and are not in this file." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `plate-data-${localDay()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function deleteAccount() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    await disablePush().catch(() => {});
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); setConfirmDelete(false); return fail(error.message); }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!prof) return notice ? <main className="screen"><div className="alert" role="alert">{notice}</div></main> : null;

  const range = dailyRange({ heightCm: prof.height_cm, ageYears: prof.age, sex: prof.sex, activity: prof.activity }, kg, prof.pace);
  const avoids = prof.avoids ?? [];
  const motivations = prof.motivations ?? [];

  return (
    <main className="screen" style={{ paddingBottom: 60 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none" }}>← Home</Link>
      <h1 className="title">Profile</h1>

      {notice && <div key={tries} className="alert" role="alert">{notice}</div>}

      {/* You */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <label className="field">Height
          <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} onBlur={saveHeight} />
          <span className="unit">cm</span>
        </label>
        <label className="field">Age
          <input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} onBlur={saveAge} />
        </label>
      </div>
      <Link href="/weigh" className="row card" style={{ textDecoration: "none", color: "inherit" }}>
        <span>Weigh-ins</span><span className="muted">{prof.hide_weight || kg === null ? "›" : `${kg} kg ›`}</span>
      </Link>

      {/* Activity and pace */}
      <div className="q">How active is a normal week?</div>
      <div role="group" aria-label="Activity" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {ACTIVITY.map((o) => (
          <button key={o.id} type="button" className="choice" aria-pressed={prof.activity === o.id} onClick={() => save({ activity: o.id })}>{o.label}</button>
        ))}
      </div>

      <div className="q">Pace</div>
      <div role="radiogroup" aria-label="Pace" style={{ display: "grid", gap: 8 }}>
        {PACES.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={prof.pace === o.id} className="option" onClick={() => save({ pace: o.id })}>
            <span>{o.label}</span><span className="muted" style={{ fontSize: 15 }}>{o.note}</span>
          </button>
        ))}
      </div>

      {/* Daily range */}
      <div className="card" style={{ background: "var(--ink)", color: "var(--paper)", border: "none", display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Your daily range</div>
        {!range ? (
          <>
            <div style={{ fontSize: 17 }}>Log a weigh-in to see your range.</div>
            <Link href="/weigh" style={{ color: "var(--paper)", fontSize: 14 }}>Weigh in ›</Link>
          </>
        ) : prof.hide_numbers ? (
          <>
            <div style={{ fontSize: 17 }}>Calorie numbers are hidden.</div>
            <div style={{ fontSize: 14, opacity: 0.75 }}>Protein {range.protein.min} to {range.protein.max} g a day.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>
              {range.target === null ? "Just tracking" : `${range.target.toLocaleString("en-US")} kcal`}
            </div>
            <div style={{ fontSize: 14, opacity: 0.75 }}>
              Protein {range.protein.min} to {range.protein.max} g · never below resting {range.resting.toLocaleString("en-US")}
            </div>
            {range.target === null && <div style={{ fontSize: 13, opacity: 0.6 }}>Maintenance is about {range.maintenance.toLocaleString("en-US")} kcal.</div>}
            {range.floored && <div style={{ fontSize: 13, opacity: 0.85 }}>This pace would go below resting, so the target stops at resting.</div>}
          </>
        )}
        <div style={{ fontSize: 12, opacity: 0.5 }}>From your latest weigh-in. Updates when you weigh in.</div>
      </div>

      {/* Food */}
      <div className="q">Anything you don&rsquo;t eat?</div>
      <div role="group" aria-label="Food limits" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AVOIDS.map((a) => (
          <button key={a} type="button" className="chip" aria-pressed={avoids.includes(a)} onClick={() => flipAvoid(a)}>
            {a === "Allergy" ? "Allergy…" : a}
          </button>
        ))}
      </div>
      {avoids.includes("Allergy") && (
        <label className="field">What are you allergic to?
          <input placeholder="peanuts, shellfish" value={allergy} onChange={(e) => setAllergy(e.target.value)}
            onBlur={() => { const v = allergy.trim() || null; if (v !== prof.allergy_note) save({ allergy_note: v }); }} />
        </label>
      )}

      {/* Motivations */}
      <div className="q">What keeps you going? <span className="muted" style={{ fontSize: 14 }}>Up to two</span></div>
      <div role="group" aria-label="What keeps you going" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {MOTIVATIONS.map((m) => (
          <button key={m.id} type="button" className="option stack" aria-pressed={motivations.includes(m.id)} onClick={() => pickMotivation(m.id)}>
            <span>{m.label}</span><span className="muted" style={{ fontSize: 13 }}>{m.note}</span>
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="q">Notifications</div>
      <div className="card list">
        <Toggle label="Lunch nudge at 11:45" on={prof.lunch_nudge} onChange={(v) => setNotify("lunch_nudge", v)} />
        <Toggle label="Weigh-in reminder · Mon, Wed, Fri" on={prof.weigh_reminder} onChange={(v) => setNotify("weigh_reminder", v)} />
        <Toggle label="Sunday edition" on={prof.sunday_edition} onChange={(v) => setNotify("sunday_edition", v)} />
        <Toggle label="Friends" note="(spring, opt-in)" on={false} disabled />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>At most two a day. Nothing after 9pm.</div>

      {/* Privacy */}
      <div className="q">Privacy</div>
      <div className="card list">
        <Toggle label="Hide calorie numbers" on={prof.hide_numbers} onChange={(v) => save({ hide_numbers: v })} />
        <Toggle label="Hide my weight" on={prof.hide_weight} onChange={(v) => save({ hide_weight: v })} />
        <div className="row"><span>Photos stay on this phone</span><span className="muted">Always</span></div>
      </div>

      {/* Data */}
      <button type="button" className="btn-quiet" onClick={download} disabled={busy}>Download my data</button>
      <button type="button" className="btn-quiet" onClick={deleteAccount} disabled={busy}
        style={{ color: "var(--alert)", borderColor: confirmDelete ? "var(--alert)" : undefined }}>
        {confirmDelete ? "Tap again to delete everything" : "Delete account"}
      </button>
      {confirmDelete && <div className="muted" style={{ fontSize: 12 }}>Deletes your profile, meals, weigh-ins and dishes for good. Photos on this phone stay until you delete the app.</div>}
      <button type="button" className="muted" style={{ background: "none", border: "none", cursor: "pointer" }}
        onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}>
        Log out
      </button>
    </main>
  );
}