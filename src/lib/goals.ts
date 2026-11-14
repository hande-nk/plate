// One place for goal and feeling words. Change the labels here; values are what the database stores.
import type { Goal } from "@/core/suggest";

export const GOALS: { id: Goal; label: string; blurb: string }[] = [
  { id: "energy",   label: "Energy",   blurb: "awake and moving, no crash" },
  { id: "focus",    label: "Focus",    blurb: "clear head for class and work" },
  { id: "comfort",  label: "Comfort",  blurb: "warm, settled, a good mood" },
  { id: "recovery", label: "Recovery", blurb: "getting over a cold or a long week" },
];

// Feeling chips on a plate after eating. "hungry" keeps its old value so past taps still count.
export const FEELINGS: { value: string; label: string }[] = [
  { value: "energized", label: "Energized" },
  { value: "focused",   label: "Focused" },
  { value: "satisfied", label: "Satisfied" },
  { value: "cozy",      label: "Cozy" },
  { value: "better",    label: "Better" },
  { value: "heavy",     label: "Heavy" },
  { value: "hungry",    label: "Still hungry" },
];

// Which feelings count as "it worked" for each goal (feeds Naz's suggestDishes).
export const HITS: Record<Goal, string[]> = {
  energy:   ["energized"],
  focus:    ["focused"],
  comfort:  ["cozy", "satisfied"],
  recovery: ["better"],
};

// Past-tense words for "Left you focused 3 of 4 times"
export const HIT_WORD: Record<Goal, string> = {
  energy: "energized", focus: "focused", comfort: "cozy or satisfied", recovery: "feeling better",
};

export const HALLS = [
  { id: "carm", label: "Carm" },
  { id: "dewick", label: "Dewick" },
  { id: "hodge", label: "Hodge" },
  { id: "kindlevan", label: "Kindlevan" },
] as const;

export const HEALTH_SERVICE_URL = "https://students.tufts.edu/health-service/make-appointment/make-appointment";