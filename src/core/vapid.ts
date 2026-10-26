import { bytes } from "node:stream/consumers";

// "BEl62i..." → Uint8Array of raw bytes. Throws on bad input.
export function base64UrlToBytes(s: string): Uint8Array {
    // 1. only base64url chars plus at most two "=" at the very end
    if (!/^[A-Za-z0-9_-]*={0,2}$/.test(s)) throw new Error("Not base64url");

    // 2. base64url - plain base64, withoput padding
    const b64 = s
        .replace(/-/g, "+" )
        .replace(/_/g, "/")
        .replace(/=+$/, "");

    // a group of 4 can't have just 1 char left over
    if (b64.length % 4 === 1) throw new Error("Impossible length");

    //pad up to a multiple of 4
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    // decode to a binary string, then to bytes
    const bin = atob(padded);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));


}