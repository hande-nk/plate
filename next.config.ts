import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js only runs in the browser (inside a web worker).
  // Keep its Node-only pieces out of any server bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
