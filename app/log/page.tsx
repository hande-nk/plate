"use client"

import { useEffect, useState, useRef } from "react";
import type { Hall } from "@/core/router";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toSims, scoreDishes, buildPrior, type ClipOut } from "@/core/matcher";
import { scaleDish } from "@/core/portion";

type Dish = { id: number; name: string; kcal: number; protein_g: number | null; carbs_g: number | null; fat_g: number | null; count_per_serving: number | null };
const HALLS: { id: Hall; label: string } [] = [
    { id: "carm", label: "Carm" },
    { id: "dewick", label: "Dewick" },
    { id: "hodge", label: "Hodge" },
    { id: "kindlevan", label:"Kindlevan" },
];
const PORTIONS = [
    { value: 0.5, label: "0.5" },
    { value: 1, label: "1" },
    { value: 1.5, label: "1.5" },
    { value: 2, label: "2" },

];

export default function LogPage() {
    const worker = useRef<Worker | null>(null);
    const [ready, setReady] = useState(false);
    const [hall, setHall] = useState<Hall>("kindlevan");
    const router = useRouter();
    const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
    const [tries, setTries] = useState(0);
    const [busy, setBusy] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [status, setStatus] = useState("");
    const [ranked, setRanked] = useState<{ dish: Dish; p: number} []> ([]);
    const [picked, setPicked] = useState<Map<number, number>>(new Map());
    const [dishes, setDishes] = useState<Dish[]> ([]);


    function call<T>(msg: object): Promise<T> {
        return new Promise((resolve, reject) => {
        const w = worker.current!;
        w.onmessage = (e) => {
            const d = e.data;
            if (d.type === "progress") {
            const p = d.p as { status?: string; file?: string; progress?: number };
            if (p.status === "progress" && p.file) setStatus(`Downloading ${p.file.split("/").pop()} ${Math.round(p.progress ?? 0)}%`);
            return;
            }
            if (d.type === "error") reject(new Error(d.message));
            else resolve(d as T);
        };
        w.postMessage(msg);
        });
    }

    useEffect(() => () => worker.current?.terminate(), []);

    async function getWorker() {
        if(worker.current) return;
        worker.current = new Worker(new URL("../../src/workers/matcher.worker.ts", import.meta.url), {type: "module"});
        const gpu = "gpu" in navigator; 

        setStatus("Loading the matcher (first time downloading it)...");
        try {
            await call({ 
                type: "load", model: "Xenova/clip-vit-base-patch32",
                device: gpu ? "webgpu" : "wasm", dtype: gpu ? "fp16" : "q8"
            });
        } catch (err) {
            worker.current?.terminate();
            worker.current = null;
            throw err;
        }
        
    }
    
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);

        });
    }, [router]);

    function fail(text: string) { setNotice({kind: "error", text: text}); setTries((t) => t + 1); }
    function toggle(id: number) {
        setPicked((prev) => {
            const next = new Map(prev);
            if(next.has(id)) {
                next.delete(id);
            } else {
                next.set(id, 1);
            }
            return next;
        })
    }

    function setPortion(id: number, portion: number) {
        setPicked((prev) => {
            const next = new Map(prev);
            next.set(id, portion);
            return next;
        })
    }
    
    async function onSnap(e: React.ChangeEvent<HTMLInputElement>) {
        //CLIP matching: Contrastive Language-Image Pretraining

        const file = e.target.files?.[0];
        if(!file) return;


        const url = URL.createObjectURL(file);
        setImage(url);
        setRanked([]);
        setPicked(new Map());
        setNotice(null);
        setBusy(true);

        try{ 
            await getWorker();
            setStatus("Matching...");

            //1. CLIP scores every dish name at this hall
            const res = await call<{ ms: number; out: ClipOut}> ({
                type: "run", imageUrl: url, labels: dishes.map((d) => d.name),
            });


            //2. system's math
            const sims =  toSims(res.out, dishes.map((d) =>  ({ id: String(d.id), name: d.name})));
            const { data: past } = await supabase.from("meals").select("dish_id").not("dish_id", "is", null);
            const prior = buildPrior((past ?? []).map((m) => String(m.dish_id)), Object.keys(sims));
            const scored = scoreDishes(sims, prior);

            const byId = new Map(dishes.map((d) => [String(d.id), d]));
            //Show the top 8
            setRanked(scored.slice(0, 8).map((s) => ({ dish: byId.get(s.dishId)!, p: s.p})));
            setStatus(`Matched in ${Math.round(res.ms)} ms`);
        } catch (err) {
            fail (err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }

    }
    useEffect(() => {
        if(!ready) return; //waiting for the login check

        supabase
            .from("dishes")
            .select("id, name, kcal, protein_g, carbs_g, fat_g, count_per_serving")
            .eq("hall", hall) //only this hall's dishes
            .then(({data, error}) => {
                if (error) fail(error.message);
                else setDishes(data ?? []); 
            });
    }, [ready, hall]); //rerun when the hall changes

    if (!ready) return null;
    
    //the picked dishes, each with its portion
    const items = ranked 
        .filter((r) => picked.has(r.dish.id))
        .map((r) => ({ dish: r.dish, portion: picked.get(r.dish.id)! }));
        
    //add up kcal across all picked dishes
    const totalKcal = items.reduce(
        (sum, it) => sum + scaleDish(it.dish, it.portion).kcal,
        0
    );

    async function onLog() {
        setBusy(true);
        setNotice(null);

        //who is logged in: RLS only accepts rows with currect user_id
        const { data: { session }} = await supabase.auth.getSession();
        if(!session) { router.replace("/login"); return;}

        const now = new Date().toISOString(); // every dish in this meal gets the same time
        const rows = items.map(({ dish, portion }) => {
            const s = scaleDish(dish, portion);
            return {
                user_id: session.user.id,
                eaten_at: now,
                route: "plate",
                dish_id: dish.id,
                dish_name: dish.name,
                portion,
                kcal: s.kcal,
                protein_g: s.protein_g,
                carbs_g: s.carbs_g,
                fat_g: s.fat_g,

            }
        });

        const { error } = await supabase.from("meals").insert(rows);
        setBusy(false);

        if (error){
            fail ( error.message); return;
        }

        setNotice({ kind: "ok", text: `Logged ${rows.length} items • ${totalKcal} kcal`});
        setPicked(new Map());


    }

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="muted">Log a meal</div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>
                What's on your plate?
            </h1>

            <div role="group" aria-label="Dining hall" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {HALLS.map((h) => {
                    const selected = hall === h.id;
                    return (
                    <button
                        key={h.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setHall(h.id)}
                        style={{
                        minHeight: "var(--tap)", borderRadius: "var(--radius-control)",
                        fontSize: 15, fontFamily: "inherit", cursor: "pointer", color: "var(--ink)",
                        border: selected ? "1px solid var(--matcha-line)" : "1px solid var(--hairline)",
                        background: selected ? "var(--matcha)" : "var(--card)",
                        }}
                    >
                        {h.label}
                    </button>
                    );
                })}
            </div>


            <div className="muted">{dishes.length} dishes at {HALLS.find((h) => h.id === hall)?.label} </div>

            <label className="btn" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {busy ? "Matching..." : "Snap your plate"}
                <input type="file" accept="image/jpeg,image/png" onChange={onSnap} disabled={busy || dishes.length === 0} hidden />
            </label>

            {status && <div className="muted">{status}</div>}

            {notice  && (
                <div key={tries} role={notice.kind === "error" ? "alert" : "status"}
                    className={notice.kind === "error" ? "alert" : "ok"}>{notice.text}</div>
            )}

            {image && <img src={image} alt="" style={{width: "100%", borderRadius: 14}} /> }

            {ranked.map(({ dish, p }) => {
                const isPicked = picked.has(dish.id);
                const portion = picked.get(dish.id);
                return (
                    <div key={dish.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button key={dish.id} type="button" className="card" 
                                aria-pressed={isPicked}
                                onClick={() => toggle(dish.id)}
                                style={{ 
                                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                                    border: isPicked ? "1px solid var(--matcha-line)" : undefined,
                                    background: isPicked ? "var(--matcha)" : undefined,
                                }}>
                            <div style={{ fontWeight: 500}}>{dish.name}</div>
                            <div className="muted">{dish.kcal} kcal • {Math.round(p *100)}% match</div>
                        </button>


                        {isPicked && (
                            <div role="group" aria-label={`Servings of ${dish.name}`}
                                style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",  gap: 8 }}>
                                {PORTIONS.map((o) => {
                                    const chosen = portion == o.value;
                                    return (
                                        <button key={o.label} type="button"
                                            aria-pressed={chosen}
                                            onClick={() => setPortion(dish.id, o.value)}
                                            style={{
                                                minHeight: "var(--tap)", borderRadius: "var(--radius-control)",
                                                fontSize: 15, fontFamily: "inherit", cursor: "pointer", color: "var(--ink)",
                                                border: chosen ? "1px solid var(--matcha-line)" : "1px solid var(--hairline)",
                                                background: chosen ? "var(--matcha)" : "var(--card)",
                                                }} >
                                            {o.label}
                                        </button>
                                    );
                                })}
                            </div>

                        )}
                    </div>

                );

            })}

            {items.length > 0 && (
                <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>{items.length} {items.length === 1 ? "item" : "items"} • {totalKcal} kcal</div>
                    <button type="button" className="btn" onClick={onLog} disabled={busy}>
                        {busy ? "Saving..." : `Log ${items.length}`}
                    </button>
                </div>
            )}

            
        </main>
        
    );
}