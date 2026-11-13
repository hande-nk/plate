"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { localDay } from "@/lib/day";
import { AVOIDS, GOALS, MOTIVATIONS } from "@/lib/profileOptions";
import { enablePush, disablePush } from "@/lib/push";

type Prof = {
  goals: string[] | null; avoids: string[] | null; allergy_note: string | null; motivations: string[] | null;
  lunch_nudge: boolean; sunday_edition: boolean; hide_numbers: boolean; mention_dishes: boolean;
  tz: string;
};
type NotifyKey = "lunch_nudge" | "sunday_edition";

const COLS = "goals, avoids, allergy_note, motivations, lunch_nudge, sunday_edition, hide_numbers, mention_dishes, tz";

// Keeps at most two: picking a third drops the oldest.
function pickTwo(list: string[], item: string): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  if (list.length >= 2) return [list[1], item];
  return [...list, item];
}

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
      const { data: p, error } = await supabase.from("profiles").select(COLS).maybeSingle();
      if (error) { fail(error.message); return; }
      if (!p) { router.replace("/welcome"); return; }
      const prof = p as Prof;
      setProf(prof);
      const phoneTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (phoneTz && phoneTz !== prof.tz) {
        supabase.from("profiles").update({ tz: phoneTz }).eq("user_id", data.session.user.id).then(() => {});
      }
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

  function flipAvoid(item: string) {
    if (!prof) return;
    const list = prof.avoids ?? [];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    save({ avoids: next, ...(next.includes("Allergy") ? {} : { allergy_note: null }) });
    if (!next.includes("Allergy")) setAllergy("");
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
    if (!after.lunch_nudge && !after.sunday_edition) disablePush().catch(() => {});
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

  const goals = prof.goals ?? [];
  const avoids = prof.avoids ?? [];
  const motivations = prof.motivations ?? [];

  return (
    <main className="screen" style={{ paddingBottom: 60 }}>
      <Link href="/" className="muted" style={{ textDecoration: "none" }}>← Home</Link>
      <h1 className="title">Profile</h1>

      {notice && <div key={tries} className="alert" role="alert">{notice}</div>}

      {/* Goals */}
      <div className="q">What do you want more of? <span className="muted" style={{ fontSize: 14 }}>Up to two</span></div>
      <div role="group" aria-label="Goals" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {GOALS.map((g) => (
          <button key={g.id} type="button" className="option stack" aria-pressed={goals.includes(g.id)} onClick={() => save({ goals: pickTwo(goals, g.id) })}>
            <span>{g.label}</span><span className="muted" style={{ fontSize: 13 }}>{g.note}</span>
          </button>
        ))}
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
      <div className="muted" style={{ fontSize: 12 }}>
        Saved to your profile. Plate doesn&rsquo;t filter or check dishes against these yet.
      </div>
      {avoids.includes("Allergy") && (
        <>
          <label className="field">What are you allergic to?
            <input placeholder="peanuts, shellfish" value={allergy} onChange={(e) => setAllergy(e.target.value)}
              onBlur={() => { const v = allergy.trim() || null; if (v !== prof.allergy_note) save({ allergy_note: v }); }} />
          </label>
          <div className="muted" style={{ fontSize: 12 }}>
            For your reference only. Always confirm allergens with dining hall staff.
          </div>
        </>
      )}

      {/* Motivations */}
      <div className="q">What keeps you going? <span className="muted" style={{ fontSize: 14 }}>Up to two</span></div>
      <div role="group" aria-label="What keeps you going" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {MOTIVATIONS.map((m) => (
          <button key={m.id} type="button" className="option stack" aria-pressed={motivations.includes(m.id)} onClick={() => save({ motivations: pickTwo(motivations, m.id) })}>
            <span>{m.label}</span><span className="muted" style={{ fontSize: 13 }}>{m.note}</span>
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="q">Notifications</div>
      <div className="card list">
        <Toggle label="Lunch nudge at 11:45" on={prof.lunch_nudge} onChange={(v) => setNotify("lunch_nudge", v)} />
        <Toggle label="Sunday edition" on={prof.sunday_edition} onChange={(v) => setNotify("sunday_edition", v)} />
        <Toggle label="Friends" note="(spring, opt-in)" on={false} disabled />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>At most two a day. Nothing after 9pm.</div>

      <Link href="/treats" className="row card" style={{ textDecoration: "none", color: "inherit" }}>
        <span>Treat board</span><span className="muted">›</span>
      </Link>

      {/* Privacy */}
      <div className="q">Privacy</div>
      <div className="card list">
        <Toggle label="Hide calorie numbers" on={prof.hide_numbers} onChange={(v) => save({ hide_numbers: v })} />
        <Toggle label="Safiye may mention my dishes" note="(off: only where and when)" on={prof.mention_dishes} onChange={(v) => save({ mention_dishes: v })} />
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