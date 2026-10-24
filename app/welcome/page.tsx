"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Activity } from "@/core/energy";

type PaceChoice = "gentle" | "steady" | "track";

const ACTIVITY: { id: Activity; label: string }[] = [
    { id: "light", label: "Mostly sitting" },
    { id: "moderate", label: "Walk a lot" },
    { id: "active", label: "Train often" },
];

const PACES: { id: PaceChoice; label: string; note: string }[] = [
    { id: "gentle", label: "Gentle", note: "about 0.25 kg a week" },
    { id: "steady", label: "Steady", note: "about 0.5 kg a week" },
    { id: "track", label: "Just track, no target", note: "see trends only" },
];

const AVOIDS = ["Vegetarian", "Halal", "No dairy", "Allergy", "Done eating by 6pm"];

const MOTIVATIONS = [
    { id: "proof", label: "Seeing proof", note: "charts, my trend" },
    { id: "feeling", label: "Feeling good", note: "what works for me" },
    { id: "new", label: "Something new", note: "dishes, ideas" },
    { id: "people", label: "People", note: "what campus loves" },
];


//adds the item if missign, removes it if present. return a new array
function flip(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Toggle({label, note, on, onChange, disabled }: { label: string; note?: string; on: boolean; onChange?: (v: boolean) => void; disabled?: boolean}) {
    return (
        <div className="row">
            <span>{label}{note && 
                <span className="muted" style={{ fontSize: 15 }}> 
                    {note}
                </span>}
                <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch"
                        disabled={disabled} onClick={() => onChange?.(!on)} />
            </span>
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

    //Step1 
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [age, setAge] = useState("");
    const [activity, setActivity] = useState<Activity>("moderate");
    const [pace, setPace] = useState<PaceChoice>("gentle");
    const [avoids, setAvoids] = useState<string[]>(["Done eating by 6pm"]);
    const [allergy, setAllergy] = useState("");


    //Step 2
    const [motivation, setMotivation] = useState<string[]>(["proof", "feeling"]);
    const [lunchNudge, setLunchNudge] = useState(true);
    const [weighReminder, setWeighReminder] = useState(true);
    const [edition, setEdition] = useState(true);
    const [hideNumbers, setHideNumbers] = useState<boolean | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) router.replace("/login");
            else setReady(true);
        });
    }, [router]);
    function fail(text: string) { setNotice(text); setTries((t) => t+1); }

    function next() {
        const h = Number(height), w = Number(weight), a = Number(age);
        if(!(h >= 100 && h <= 250)) return fail("Height should be in cm, between 100 and 250.");
        if(!(w >= 30 && w <= 250)) return fail("Weight should be in kg, between 30 and 250.");
        if(!(Number.isInteger(a) && a >= 13 && a <= 100)) return fail("Age should be between 13 and 100.");
        setNotice(null);
        setStep(2);
        window.scrollTo(0,0);
    }

    function pickMotivation(id: string) {
        setMotivation((prev) => {
            if(prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 2) return [prev[1], id];
            return [...prev, id];
        });
    }

    async function finish() {
        if (hideNumbers === null) return fail("Answer the last question so Safiye Hanim knows the right numbers.");
        setBusy(true);
        setNotice(null);
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) { router.replace("/login"); return;}
        const uid = session.user.id;

        const { error: pErr } = await supabase.from("profiles").upsert({
            id: uid,
            height_cm: Number(height),
            age_year: Number(age),
            activity,
            pace,
            avoids,
            allergy_note: avoids.includes("Allergy") ? allergy.trim() || null: null,
            motivation,
            lunch_nudge: lunchNudge,
            wigh_reminder: weighReminder,
            sunday_edition: edition,
            friends: false,
            hide_numbers: hideNumbers,
            onboarded_ad: new Date().toISOString(),
        });
        if (pErr) { setBusy(false); return fail(pErr.message); }


        //the weight from step 1 is the forst pint on the trend line
        const { error: wErr } = await supabase.from("weigh_ins").insert({ user_id: uid, kg: Number(weight) });
        setBusy(false);
        if(wErr) return fail(wErr.message);

        router.replace("/log");
    }


    if(!ready) return null;

    return (
        <main className="screen">
            <div className="steps" aria-hidden="true">
                <i className={step === 2 ? "on" : ""} />
            </div>
            
            <div className="muted"> Welcome • {step} of 2 </div>

            {step === 1 && (
                <>
                    <h1 className="title"> A little about you, so the numbers fit you. </h1>

                    <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                       
                        <label className="field"> Height 
                            <input id="height" inputMode="decimal" placeholder="168" value={height} onChange={(e) => setHeight(e.target.value)} />
                            <span className="unit">cm</span>
                        </label>

                        <label className="field">Weight
                            <input id="weight" inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
                            <span className="unit">kg</span>
                        </label>

                        <label className="field">Age
                            <input id="age" inputMode="numeric" placeholder="20" value={age} onChange={(e) => setAge(e.target.value)} />
                        </label>
                    </div>

                    <div className="q"> How active is a normal week?</div>
                   
                    <div role="group" aria-label="Activity" style={{ display: "grid", gridTemplateColumns: "repeate(3, 1fr)", gap: 8 }}>
                        {ACTIVITY.map((o) => (
                            <button key={o.id} type="button" className="choice" aria-pressed={activity === o.id} onClick={() => setActivity(o.id)}>{o.label}</button>
                        ))}
                    </div>

                    <div className="q">What pace feels right?</div>
                        <div role="radiogroup" aria-label="Pace" style={{ display: "grid", gap: 8 }}>
                            {PACES.map((o) => (
                            <button key={o.id} type="button" role="radio" aria-checked={pace === o.id} className="option" onClick={() => setPace(o.id)}>
                                <span>{o.label}</span><span className="muted" style={{ fontSize: 15 }}>{o.note}</span>
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
                    
                    {avoids.includes("Allergy") && (
                        <label className="field">What are you allergic to?
                        <input id="allergy" placeholder="peanuts, shellfish" value={allergy} onChange={(e) => setAllergy(e.target.value)} />
                        </label>
                    )}
                
                    {notice && <div key={tries} className="alert" role="alert">{notice}</div>}
                
                    <button type="button" className="btn" onClick={next} style={{ marginTop: 8 }}>Continue</button>
                    <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>Stays in your account. Used only to estimate your range.</div>
                </>
            )}

            {step === 2 && (
                <>
                    <h1 className="title">What keeps you going?</h1>
                    <p className="muted" style={{ fontSize: 15, margin: 0 }}>Pick up to two. Plate shapes your feed and nudges around them.</p>
        
                    <div role="group" aria-label="What keeps you going" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    {MOTIVATIONS.map((m) => (
                        <button key={m.id} type="button" className="option stack" aria-pressed={motivation.includes(m.id)} onClick={() => pickMotivation(m.id)}>
                            <span>{m.label}</span><span className="muted" style={{ fontSize: 13 }}>{m.note}</span>
                        </button>
                    ))}
                </div>
        
                <div className="card list">
                    <Toggle label="Lunch nudge at 11:45" on={lunchNudge} onChange={setLunchNudge} />
                    <Toggle label="Weigh-in reminder · Mon, Wed, Fri" on={weighReminder} onChange={setWeighReminder} />
                    <Toggle label="Sunday edition" on={edition} onChange={setEdition} />
                    <Toggle label="Friends" note="(spring, opt-in)" on={false} disabled />
                </div>
        
                <div className="card" style={{ display: "grid", gap: 12, background: "transparent" }}>
                    <div style={{ fontSize: 15 }}>One more thing. Has a doctor or counselor ever suggested you avoid counting calories?</div>
                    <div role="radiogroup" aria-label="Avoid counting calories" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button type="button" role="radio" className="choice" aria-checked={hideNumbers === true} aria-pressed={hideNumbers === true} onClick={() => setHideNumbers(true)}>Yes, hide numbers</button>
                    <button type="button" role="radio" className="choice" aria-checked={hideNumbers === false} aria-pressed={hideNumbers === false} onClick={() => setHideNumbers(false)}>No</button>
                    </div>
                </div>
        
                {notice && <div key={tries} className="alert" role="alert">{notice}</div>}
        
                <button type="button" className="btn" onClick={finish} disabled={busy} style={{ marginTop: 8 }}>
                    {busy ? "Saving..." : "Start with today's lunch"}
                </button>
                <button type="button" className="muted" onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer" }}>Back</button>
                </>
            )}



        </main>
    )
}