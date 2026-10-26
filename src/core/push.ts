export type Kind = "lunch" | "weigh" | "edition";
export type Candidate = { tz: string; quietFrom: number; lunchNudge: boolean; weighReminder: boolean;
  sundayEdition: boolean; platesToday: string[]; weighedToday: boolean; sentToday: Kind[] };
export type Push = { kind: Kind; title: string; body: string };

const BODY: Record<Kind, string> = {
  lunch: "Lunch time. Snap your plate when you eat.",
  weigh: "Weigh-in morning. Before breakfast keeps it consistent.",
  edition: "Your Sunday edition is out.",
};

// What the clock says in that time zone: weekday + minutes since midnight
function local(d: Date, tz: string): { day: string; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  // parts looks like [{type:"weekday", value:"Thu"}, {type:"literal", ...}, {type:"hour", value:"11"}, ...]
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { day: get("weekday"), min: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function duePushes(c: Candidate, now: Date): Push[] {
  const { day, min } = local(now, c.tz);

  // 1. Quiet hours: from quietFrom (21:00) until 08:00
  if (min >= c.quietFrom * 60 || min < 480) return [];

  // 2. Daily cap of two
  const room = 2 - c.sentToday.length;
  if (room <= 0) return [];

  const due: Kind[] = [];

  // 3. Sunday edition, 9:00 to 10:00
  if (c.sundayEdition && day === "Sun" && min >= 540 && min < 600 && !c.sentToday.includes("edition")) due.push("edition");

  // 4. Lunch, 11:45 to 13:00, only if nothing was logged after 10:30
  const lunchLogged = c.platesToday.some((t) => local(new Date(t), c.tz).min >= 630);
  if (c.lunchNudge && min >=705 && min < 780 && !lunchLogged && !c.sentToday.includes("lunch")) due.push("lunch");

  // 5. Weigh-in, Mon/Wed/Fri, 7:30 to 9:30
  if (c.weighReminder && ["Mon", "Wed", "Fri"].includes(day) && min >=450 && min < 570 && !c.weighedToday && !c.sentToday.includes("weigh")) due.push("weigh");

  // 6. Respect the room left, then build the pushes
  return due.slice(0, room).map((kind) => ({ kind, title: "Plate", body: BODY[kind] }));
}
