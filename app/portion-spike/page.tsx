"use client";

import { useEffect, useState, useRef } from "react";
import { countItems, type Detection } from "@/core/count";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PortionSpike() {
    //session login guard
    const [ready, setReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);

        });
    }, [router]);

    const workerRef = useRef<Worker | null>(null);
    const [status, setStatus] = useState("Loading model...");
    const [query, setQuery] = useState("a falafel ball.");
    const [sentQuery, setSentQuery] = useState(""); 
    const [ms, setMs] = useState<number | null>(null);
    const [dets, setDets] = useState<Detection[]>([]);
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    


    useEffect(() => {
        if(!ready) return;
        const w = new Worker(new URL("../../src/workers/detector.worker.ts", import.meta.url), { type: "module" });
        workerRef.current = w;
        w.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === "progress") {
            const p = msg.p;
            if (p.status === "progress" && p.file?.endsWith(".onnx"))
                setStatus(`Downloading model: ${Math.round(p.progress)}%`);
            if (p.status === "done" && p.file?.endsWith(".onnx"))
                setStatus("Downloaded. Starting model...");
            }
            if (msg.type === "loaded")
                setStatus(`Ready on ${msg.device}/${msg.dtype} (loaded in ${Math.round(msg.ms)} ms)`);
            if(msg.type === "result") {
                setDets(msg.out);
                setMs(msg.ms);
                setStatus("Ready");
            }
            if(msg.type === "error") setStatus(msg.message);
        }; 
        // Test 1
        const params = new URLSearchParams(window.location.search);
        const isPhone = /iPhone|iPad|Android/i.test(navigator.userAgent);
        const device = (params.get("device") ?? (isPhone ? "wasm" : "webgpu")) as "webgpu" | "wasm";
        const dtype = params.get("dtype") ?? (isPhone ? "q8" : "fp32");
        w.postMessage({ type: "load", model: "onnx-community/grounding-dino-tiny-ONNX", device, dtype });
        return () => w.terminate();
    }, [ready]);

    function onSnap(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const imageUrl = URL.createObjectURL(file);
        setImgUrl(imageUrl);

        const phrases = query.split(".").map((s) => s.trim()).filter(Boolean);
        setSentQuery(phrases[0]);
        setStatus("Detecting...");
        workerRef.current?.postMessage({
            type: "detect",
            imageUrl,
            queries: [phrases.join(". ") + "."], // one sentence: "a falafel ball. an edamame bean. ..."
            threshold: 0.1,
        });
        
    }

    const count = ms !== null ? countItems(dets, sentQuery, 0.2) : null;

    if (!ready) return null;

    return (
        <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 32px", display: "flex", flexDirection: "column", gap: 14}}>
            <h1 style={{ margin: 0, fontSize:28, fontWeight: 500}}>Portion Spike </h1>
            <div className="muted">{status}</div>

            <label className="muted">
                What to count
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", minHeight:44, fontSize:17, marginTop:6}} />
            </label>

            <input type="file" accept="image/jpeg,image/png" onChange={onSnap} />

            {count !== null && (
                <div className="card">
                    <div style={{ fontSize:34, fontWeight: 500 }}>{count}</div>
                    <div className="muted"> {sentQuery} · {Math.round(ms ?? 0)} ms</div>
                </div>
            )}

            {imgUrl && (
                <div style={{ position: "relative" }}>
                    <img src={imgUrl} alt="" style={{ width: "100%", display: "block" }} />
                    {dets.map((d, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        left: `${d.box.xmin * 100}%`,
                        top: `${d.box.ymin * 100}%`,
                        width: `${(d.box.xmax - d.box.xmin) * 100}%`,
                        height: `${(d.box.ymax - d.box.ymin) * 100}%`,
                        border: "2px solid #e11",
                    }}>
                        <span style={{ fontSize: 10, background: "#fff" }}>{d.label} {d.score.toFixed(2)}</span>
                    </div>
                    ))}
                </div>
            )}

            <pre style={{ fontSize: 11, overflowX: "auto" }}>{JSON.stringify(dets, null, 2)}</pre>
            
        
        </main>

    );
}