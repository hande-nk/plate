"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AVOIDS, GOALS, MOTIVATIONS } from "@/lib/profileOptions";

// Adds the item if missing, removes it if present. Returns a new array.
function flip(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

// Same as flip, but keeps at most two: picking a third drops the oldest.
function pickTwo(list: string[], item: string): string[] {
    if (list.includes(item)) return list.filter((x) => x !== item);
    if (list.length >= 2) return [list[1], item];
    return [...list, item];
}

function Toggle({ label, note, on, onChange, disabled }: { label: string; note?: string; on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
    return (
        <div className="row">
            <span>{label}{note && <span className="muted" style={{ fontSize: 15 }}> {note}</span>}</span>
            <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch"
                    disabled={disabled} onClick={() => onChange?.(!on)} />
        </div>
    );
}

export default function Welcome() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [notice, setNotice] = useState<string | null>(null);
    const [tries, setTries] = useState(0);
    const [busy, setBusy] = useState(false);

    // Step 1
    const [goals, setGoals] = useState<string[]>([]);
    const [avoids, setAvoids] = useState<string[]>([]);
    const [allergy, setAllergy] = useState("");

    // Step 2
    const [motivation, setMotivation] = useState<string[]>(["feeling"]);
    const [lunchNudge, setLunchNudge] = useState(true);
    const [edition, setEdition] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) router.replace("/login");
            else setReady(true);
        });
    }, [router]);

    function fail(text: string) { setNotice(text); setTries((t) => t + 1); }

    function next() {
        if (goals.length === 0) return fail("Pick at least one so Plate knows what to suggest.");
        setNotice(null);
        setStep(2);
        window.scrollTo(0, 0);
    }

    async function finish() {
        setBusy(true);
        setNotice(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace("/login"); return; }

        const { error } = await supabase.from("profiles").upsert({
            user_id: session.user.id,
            goals,
            avoids,
            allergy_note: avoids.includes("Allergy") ? allergy.trim() || null : null,
            motivations: motivation,
            lunch_nudge: lunchNudge,
            sunday_edition: edition,
            weigh_reminder: false,
            friends: false,
            hide_numbers: true,
            onboarded_at: new Date().toISOString(),
        }, { onConflict: "user_id" }); // update my row if it exists, otherwise create it

        setBusy(false);
        if (error) return fail(error.message);
        router.replace("/log");
    }

    if (!ready) return null;

    return (
        <main className="screen">
            <div className="steps" aria-hidden="true">
                <i className="on" /><i className={step === 2 ? "on" : ""} />
            </div>

            <div className="muted">Welcome • {step} of 2</div>

            {step === 1 && (
                <>
                    <h1 className="title">What do you want more of?</h1>
                    <p className="muted" style={{ fontSize: 15, margin: 0 }}>Pick up to two. Plate suggests dishes around them and learns what works for you.</p>

                    <div role="group" aria-label="Goals" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        {GOALS.map((g) => (
                            <button key={g.id} type="button" className="option stack" aria-pressed={goals.includes(g.id)} onClick={() => setGoals((prev) => pickTwo(prev, g.id))}>
                                <span>{g.label}</span><span className="muted" style={{ fontSize: 13 }}>{g.note}</span>
                            </button>
                        ))}
                    </div>

                    <div className="q">Anything you don&rsquo;t eat?</div>
                    <div role="group" aria-label="Food limits" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {AVOIDS.map((a) => (
                            <button key={a} type="button" className="chip" aria-pressed={avoids.includes(a)} onClick={() => setAvoids((prev) => flip(prev, a))}>
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
                                <input id="allergy" placeholder="peanuts, shellfish" value={allergy} onChange={(e) => setAllergy(e.target.value)} />
                            </label>
                            <div className="muted" style={{ fontSize: 12 }}>
                                For your reference only. Always confirm allergens with dining hall staff.
                            </div>
                        </>
                    )}

                    {notice && <div key={tries} className="alert" role="alert">{notice}</div>}

                    <button type="button" className="btn" onClick={next} style={{ marginTop: 8 }}>Continue</button>
                    <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>Stays in your account.</div>
                </>
            )}

            {step === 2 && (
                <>
                    <h1 className="title">What keeps you going?</h1>
                    <p className="muted" style={{ fontSize: 15, margin: 0 }}>Pick up to two. Plate shapes your feed and nudges around them.</p>

                    <div role="group" aria-label="What keeps you going" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        {MOTIVATIONS.map((m) => (
                            <button key={m.id} type="button" className="option stack" aria-pressed={motivation.includes(m.id)} onClick={() => setMotivation((prev) => pickTwo(prev, m.id))}>
                                <span>{m.label}</span><span className="muted" style={{ fontSize: 13 }}>{m.note}</span>
                            </button>
                        ))}
                    </div>

                    <div className="card list">
                        <Toggle label="Lunch nudge at 11:45" on={lunchNudge} onChange={setLunchNudge} />
                        <Toggle label="Sunday edition" on={edition} onChange={setEdition} />
                        <Toggle label="Friends" note="(spring, opt-in)" on={false} disabled />
                    </div>

                    {notice && <div key={tries} className="alert" role="alert">{notice}</div>}

                    <button type="button" className="btn" onClick={finish} disabled={busy} style={{ marginTop: 8 }}>
                        {busy ? "Saving..." : "Start with today's lunch"}
                    </button>
                    <button type="button" className="muted" onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer" }}>Back</button>
                </>
            )}
        </main>
    );
}