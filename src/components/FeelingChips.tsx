"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export type Feeling = "energized" | "satisfied" | "heavy" | "hungry";
const FEELINGS : { id: Feeling; label: string }[] = [
    { id: "energized", label: "Energized" },
    { id: "satisfied", label: "Satisfied" },
    { id: "heavy", label: "Heavy" },
    { id: "hungry", label: "Hungry" },
];

export default function FeelingChips({ mealIds, initial }: {mealIds: number[]; initial: Feeling | null }) {
    const [feeling, setFeeling] = useState<Feeling | null>(initial);
    const [failed, setFailed] = useState(false);

    async function pick(f: Feeling) {
        const prev = feeling;
        const next = prev === f ? null : f; //tap again to undo
        setFeeling(next);
        setFailed(false);
        const { error } = await supabase.from("meals").update({ feeling: next }).in("id", mealIds);
        if (error) { setFeeling(prev); setFailed(true); }
    }

    const label =FEELINGS.find((x) => x.id === feeling)?.label;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8}}>
            <div className="muted">{label ? `You felt ${label.toLowerCase()}` : "How did it feel?"}</div>
            <div role="group" aria-label="How did this plate feel?" style={{ display: "grid", gridTemplateColumns: "repeate(4, minmax(0, 1fr))", gap: 6}}>
                {FEELINGS.map((x) => (
                    <button key={x.id} type="button" className="choice" aria-pressed={feeling === x.id} onClick={() => pick(x.id)} style={{ fontSize: 13, padding: "0 4px" }}>
                        {x.label}
                    </button>
                ))}
            </div> 
            {failed && <div role="alert" className="alert"> Couldn't save it. Try again. </div>}
        </div>
    );
}
