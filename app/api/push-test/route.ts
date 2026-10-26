import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";  // web-push needs Node crypto
export const maxDuration = 30;    // room for the 8 s delay

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "Not logged in" }, { status: 401 });
  const { delay = 0 } = await req.json().catch(() => ({}));

  // The user's own token, so RLS only returns THEIR subscriptions. No service_role.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,  // use the same name as in src/lib/supabase.ts
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!subs?.length) return Response.json({ error: "No subscription. Tap Enable first." }, { status: 404 });
    // Spike-only self-check: does the private key really belong to the public key?
  const { createECDH } = await import("node:crypto");
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  let pairOk = false;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(priv.trim(), "base64url"));
    pairOk = ecdh.getPublicKey().toString("base64url") === pub.trim();
  } catch {}
  const check = { pairOk, pubLen: pub.length, privLen: priv.length, pubHasSpace: /\s/.test(pub), privHasSpace: /\s/.test(priv) };
  webpush.setVapidDetails(
    "mailto:YOUR_EMAIL_HERE",  // Apple rejects fake addresses: use your real one
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 10) * 1000));

  const payload = JSON.stringify({ title: "Plate", body: "Test push. If you see this on a locked phone, it works.", url: "/" });
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
  );

  // 404/410 = the phone dropped this subscription: clean it up
  const failed: string[] = [];
  for (const [i, r] of results.entries()) {
    if (r.status === "rejected") {
      const code = (r.reason as { statusCode?: number }).statusCode;
      const body = (r.reason as { body?: string }).body;
      failed.push(`${code ?? "?"}: ${body || (r.reason as Error).message}`);
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", subs[i].id);
    }
  }
  return Response.json({ sent: results.length - failed.length, failed, check });
}