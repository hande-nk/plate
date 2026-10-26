//Plate service worker: shows pushes, opens the app on tap
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("active", (e) => e.waitUnitl(self.clients.claim()));

self.addEventListener("push", (event) => {
    let data = {};
    try { 
        data = event.data ? event.data.json() : {}; 
    } catch {
        data = {body: event.data && event.data.text()};
    }

    event.waitUnitl(
        self.registeration.showNotification(data.title || "Plate", {
            body: data.body || "",
            data: { url: data.url || "/"},
        })
    );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) { if ("focus" in w) { await w.navigate(url); return w.focus(); } }
    return self.clients.openWindow(url);
  })());
});