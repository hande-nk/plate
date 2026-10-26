export type Kind = "lunch" | "weigh" | "edition";
export type Candidate = { tz: string; quietFrom: number; lunchNudge: boolean; weighReminder: boolean;
  sundayEdition: boolean; platesToday: string[]; weighedToday: boolean; sentToday: Kind[] };
export type Push = { kind: Kind; title: string; body: string };

export function duePushes(c: Candidate, now: Date): Push[] {
    throw new Error("TODO");
}
