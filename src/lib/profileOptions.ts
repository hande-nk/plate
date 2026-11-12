import type { Activity } from "@/core/energy";
import type { PaceChoice } from "@/core/range";

export const ACTIVITY: { id: Activity; label: string }[] = [
  { id: "light", label: "Mostly sitting" },
  { id: "moderate", label: "Walk a lot" },
  { id: "active", label: "Train often" },
];

export const PACES: { id: PaceChoice; label: string; note: string }[] = [
  { id: "gentle", label: "Gentle", note: "about 0.25 kg a week" },
  { id: "steady", label: "Steady", note: "about 0.5 kg a week" },
  { id: "track", label: "Just track, no target", note: "see trends only" },
];

export const AVOIDS = ["Vegetarian", "Halal", "No dairy", "Allergy"];

export const GOALS = [
  { id: "energy", label: "Energy", note: "steady through the day" },
  { id: "recovery", label: "Recovery", note: "colds, rough weeks" },
  { id: "focus", label: "Focus", note: "exams, long days" },
  { id: "comfort", label: "Comfort", note: "warm, easy food" },
];

export const MOTIVATIONS = [
  { id: "proof", label: "Seeing proof", note: "charts, my trend" },
  { id: "feeling", label: "Feeling good", note: "what works for me" },
  { id: "new", label: "Something new", note: "dishes, ideas" },
  { id: "people", label: "People", note: "what campus loves" },
];