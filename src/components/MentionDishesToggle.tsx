"use client";

// Profile switch: "Safiye may mention my dishes". Off = her scenes use hall and time only.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function MentionDishesToggle() {
    const [on, setOn] = useState<boolean | null>(null);
    useEffect(() => { supabase.from("profiles").select("mention_dishes").maybeSingle().then(({ data }: { data: { mention_dishes: boolean } | null }) => setOn(data?.mention_dishes !== false)); }, []);
    if (on === null) return null;
    async function flip() {
        const next = !on; setOn(next);
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase.from("profiles").update({ mention_dishes: next }).eq("id", session?.user.id);
        if (error) setOn(!next);                       // revert on error, like the other Profile switches
    }
    return (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 }}>
        <span>
            <span style={{ display: "block" }}>Safiye may mention my dishes</span>
            <span className="muted" style={{ fontSize: 12 }}>Off: her scenes use only where and when.</span>
        </span>
        <input type="checkbox" role="switch" checked={on} onChange={flip} style={{ width: 22, height: 22 }} />
        </label>
    );
}