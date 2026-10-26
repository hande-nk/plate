import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { duePushes, type Candidate, type Kind } from "@/core/push";

export const runtime = "nodejs";

type Sub = { endpoint: string; p256dh: string; auth: string };
type Row = Candidate & { userId: string; subs: Sub[] | null };
const URLS: Record<Kind, string> = { lunch: "/log", weigh: "/weigh", edition: "/" };

// "2026-10-29" as the calendar reads in that time zone
const localDay = (now: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);

export async function POST(req: Request) {
  const secret = process.env.PUSH_TICK_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }
  const { candidates } = (await req.json()) as { candidates: Row[] };
  const now = new Date();
  webpush.setVapidDetails("https://plate-tawny-sigma.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

  const sent: { userId: string; kind: Kind; localDay: string }[] = [];
  const dead: string[] = [];
  for (const c of candidates) {
    for (const p of duePushes(c, now)) {          // your logic decides
      let delivered = false;
      for (const s of c.subs ?? []) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: p.title, body: p.body, url: URLS[p.kind] }));
          delivered = true;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.endpoint);
          else console.error("push failed", code, (e as { body?: string }).body);
        }
      }
      if (delivered) sent.push({ userId: c.userId, kind: p.kind, localDay: localDay(now, c.tz) });
    }
  }

  if (sent.length || dead.length) {
    // Publishable key only. The database function checks the secret.
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } });
    const { error } = await db.rpc("record_pushes", { p_secret: secret, p_sent: sent, p_dead: dead });
    if (error) return Response.json({ error: error.message, sent: sent.length }, { status: 500 });
  }
  return Response.json({ sent: sent.length, dead: dead.length });
}