"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Feeling } from "@/core/feel";
import { FEELINGS } from "@/lib/goals";
export type { Feeling };

export default function FeelingChips({ mealIds, initial, onChange }: { mealIds: number[]; initial: Feeling | null; onChange?: (f: Feeling | null) => void }) {
    const [feeling, setFeeling] = useState<Feeling | null>(initial);
    const [failed, setFailed] = useState(false);

    async function pick(f: Feeling) {
        const prev = feeling;
        const next = prev === f ? null : f; // tap again to undo
        setFeeling(next);
        onChange?.(next);
        setFailed(false);
        const { error } = await supabase.from("meals").update({ feeling: next }).in("id", mealIds);
        if (error) { setFeeling(prev); onChange?.(prev); setFailed(true); }
    }

    const label = FEELINGS.find((x) => x.value === feeling)?.label;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="muted">{label ? `You felt ${label.toLowerCase()}` : "How did it feel?"}</div>
            <div role="group" aria-label="How did this plate feel?" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FEELINGS.map((x) => (
                    <button key={x.value} type="button" className="choice" aria-pressed={feeling === x.value}
                        onClick={() => pick(x.value as Feeling)} style={{ fontSize: 13, padding: "0 12px" }}>
                        {x.label}
                    </button>
                ))}
            </div>
            {failed && <div role="alert" className="alert">Couldn&rsquo;t save it. Try again.</div>}
        </div>
    );
}