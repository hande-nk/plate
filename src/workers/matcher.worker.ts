/// <reference lib="webworker" />
// Speed-test worker. Runs CLIP off the main thread so the UI never freezes.
// This is plumbing around a library call, not the scoring logic (that's src/core/matcher.ts).
import { pipeline, env, type ZeroShotImageClassificationPipeline } from "@huggingface/transformers";

env.allowLocalModels = false; // models come from the Hugging Face hub, cached by the browser after the first load

type Msg =
  | { type: "load"; model: string; device: "webgpu" | "wasm"; dtype: "fp32" | "fp16" | "q8" | "q4" }
  | { type: "run"; imageUrl: string; labels: string[] };

let classifier: ZeroShotImageClassificationPipeline | null = null;

self.onmessage = async (e: MessageEvent<Msg>) => {
  const msg = e.data;
  try {
    if (msg.type === "load") {
      const t0 = performance.now();
      classifier = (await pipeline("zero-shot-image-classification", msg.model, {
        device: msg.device,
        dtype: msg.dtype,
        progress_callback: (p: unknown) => self.postMessage({ type: "progress", p }),
      })) as ZeroShotImageClassificationPipeline;
      self.postMessage({ type: "loaded", ms: performance.now() - t0 });
    } else if (msg.type === "run") {
      if (!classifier) throw new Error("Model not loaded");
      const t0 = performance.now();
      const out = await classifier(msg.imageUrl, msg.labels, { hypothesis_template: "a photo of {}" });
      self.postMessage({ type: "result", ms: performance.now() - t0, out });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
