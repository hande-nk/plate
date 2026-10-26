import { supabase } from "@/lib/supabase";
import { base64UrlToBytes } from "@/core/vapid";

export function pushSupported() {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Call straight from a tap: IOS only shows the permission prompt inside a user gesture, 
//so requestPermission must be the FIRST await.
export async function enablePush(): Promise<"on" | "denied" | "unsupported"> {
    if (!pushSupported()) return "unsupported";
    const perm = await Notification.requestPermission();
    if(perm !== "granted") return "denied";
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
        }));
    const j = sub.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
        { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth },
        { onConflict: "endpoint" }
    );
    if (error) throw new Error(error.message);
    return "on";
}

export async function disablePush() {
    if(!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
}