//tells TypeScript that this file runs inside a Web Worker, not a browser page
/// <reference lib="webworker" />

import { pipeline, env, type ZeroShotObjectDetectionPipeline } from "@huggingface/transformers";

//don't look for models on local server
//fetch from Hugging Face hub
env.allowLocalModels = false;

//the mesages the page can send
//load: which model to use, where to run it and it's presicion
// detect: the photo, the text queries, minimum confidence for a box to come back
type Msg =
    | { type: "load"; model: string; device: "webgpu" | "wasm"; dtype: "fp32" | "fp16" | "q8" | "q4" }
    | { type: "detect"; imageUrl: string; queries: string[]; threshold: number };

//holds the loaded model
let detector:  ZeroShotObjectDetectionPipeline | null = null;

//runs every time the page calls worker, e-> what the page sent
//async because loading takes time
self.onmessage = async (e: MessageEvent<Msg>) => {
    const msg = e.data;
    try {
        if (msg.type === "load") {
            //downloads OWL-ViT and builds the detector
            //zero-shot: finds objects from a text description with no training on food
            const t0 = performance.now();
            detector = (await pipeline("zero-shot-object-detection", msg.model, {
                device: msg.device,
                dtype: msg.dtype,
                progress_callback: (p: unknown) => self.postMessage({ type: "progress", p}),
            })) as ZeroShotObjectDetectionPipeline;
            self.postMessage({ type: "loaded", ms: performance.now() - t0 });
        } else if (msg.type === "detect") {
            //runs the model on the photo
            if (!detector) throw new Error("Detector not loaded");
            const t0 = performance.now();
            //percentage: true gives box coords from 0 to 1, so photo size doesn't matter
            const out = await detector(msg.imageUrl, msg.queries, { threshold: msg.threshold, percentage: true});
            self.postMessage({ type: "result", ms: performance.now() - t0, out });
        }
    } catch (err) {
        self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err)});
    }
}