import { describe, it, expect } from "vitest";
import { base64UrlToBytes } from "./vapid";

describe("base64UrlToBytes", () => {
  it("empty string is zero bytes", () => {
    expect(base64UrlToBytes("")).toEqual(new Uint8Array([]));
  });
  it("decodes plain base64 text", () => {
    expect(Array.from(base64UrlToBytes("TWFu"))).toEqual([77, 97, 110]); // "Man"
  });
  it("adds the missing padding", () => {
    expect(Array.from(base64UrlToBytes("TWE"))).toEqual([77, 97]);  // "Ma"
    expect(Array.from(base64UrlToBytes("TQ"))).toEqual([77]);        // "M"
  });
  it("accepts padding that's already there", () => {
    expect(Array.from(base64UrlToBytes("TQ=="))).toEqual([77]);
  });
  it("turns - into + and _ into /", () => {
    expect(Array.from(base64UrlToBytes("-_8"))).toEqual([251, 255]);
  });
  it("returns a Uint8Array, which pushManager needs", () => {
    expect(base64UrlToBytes("TWFu")).toBeInstanceOf(Uint8Array);
  });
  it("a real VAPID public key is 65 bytes starting with 4", () => {
    const key = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    const bytes = base64UrlToBytes(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });
  it("throws on characters that aren't base64url", () => {
    expect(() => base64UrlToBytes("ab$c")).toThrow();
    expect(() => base64UrlToBytes("ab+c")).toThrow(); // + is plain base64, not url-safe
  });
  it("throws on an impossible length", () => {
    expect(() => base64UrlToBytes("TWFuT")).toThrow(); // 5 chars: 1 left over
  });
});