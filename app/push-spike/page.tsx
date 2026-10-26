"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { base64UrlToBytes } from "@/core/vapid";

export default function PushSpike() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const say = (line: string) => setLog((l) => [...l, line]);

  // Facts the spike depends on, checked once on open
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    say(`Service worker: ${"serviceWorker" in navigator ? "yes" : "no"}`);
    say(`Push API: ${"PushManager" in window ? "yes" : "no (on iPhone, open Plate from the home-screen icon)"}`);
    say(`Opened from home screen: ${standalone ? "yes" : "no"}`);
    say(`Permission: ${"Notification" in window ? Notification.permission : "n/a"}`);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(() => say("Service worker registered"), (e) => say(`SW failed: ${e.message}`));
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      // Ask first, straight from the tap: iOS only allows this inside a user gesture
      const perm = await Notification.requestPermission();
      say(`Permission: ${perm}`);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) as BufferSource }));

      const j = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth },
        { onConflict: "endpoint" }
      );
      say(error ? `Save failed: ${error.message}` : `Subscribed: ${new URL(sub.endpoint).host}`);
    } catch (e) {
      say(`Enable failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function send(delay: number) {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { say("Not logged in"); return; }
      say(delay ? `Sending in ${delay} s, lock your phone now` : "Sending...");
      const res = await fetch("/api/push-test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ delay }),
      });
      say(`Server: ${JSON.stringify(await res.json())}`);
    } catch (e) {
      say(`Send failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "52px 18px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="muted">Spike · web push</div>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>Can Plate reach you?</h1>
      <button type="button" className="btn" onClick={enable} disabled={busy}>1. Enable notifications</button>
      <button type="button" className="btn" onClick={() => send(0)} disabled={busy}>2. Send test now</button>
      <button type="button" className="btn-quiet" onClick={() => send(8)} disabled={busy}>3. Send in 8 s (lock the phone)</button>
      <div className="card" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, display: "grid", gap: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </main>
  );
}