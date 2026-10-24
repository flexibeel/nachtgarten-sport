import type { Exercise } from "@/lib/types";

export const MUSCLES = [
  "Beine",
  "Gesäß",
  "Brust",
  "Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Core",
  "Waden",
] as const;

export const EQUIPMENT = ["Langhantel", "Kurzhantel", "Maschine", "Kabel", "Körpergewicht"] as const;

const MUSCLE_IMAGE: Record<string, string> = {
  Beine: "/exercises/squat.jpg",
  Gesäß: "/exercises/hip.jpg",
  Brust: "/exercises/bench.jpg",
  Rücken: "/exercises/row.jpg",
  Schultern: "/exercises/ohp.jpg",
  Bizeps: "/exercises/curl.jpg",
  Trizeps: "/exercises/dip.jpg",
  Core: "/exercises/core.jpg",
  Waden: "/exercises/lunge.jpg",
};

export function imageForMuscle(muscle: string): string {
  return MUSCLE_IMAGE[muscle] ?? "/exercises/squat.jpg";
}

export const CATALOG: Omit<Exercise, "id">[] = [
  { name: "Kniebeuge", muscles: ["Beine", "Gesäß"], equipment: "Langhantel", image: "/exercises/squat.jpg" },
  { name: "Frontkniebeuge", muscles: ["Beine", "Core"], equipment: "Langhantel", image: "/exercises/squat.jpg" },
  { name: "Goblet Squat", muscles: ["Beine", "Core"], equipment: "Kurzhantel", image: "/exercises/squat.jpg" },
  { name: "Beinpresse", muscles: ["Beine", "Gesäß"], equipment: "Maschine", image: "/exercises/legpress.jpg" },
  { name: "Ausfallschritte", muscles: ["Beine", "Gesäß"], equipment: "Kurzhantel", image: "/exercises/lunge.jpg" },
  { name: "Bulgarian Split Squat", muscles: ["Beine", "Gesäß"], equipment: "Kurzhantel", image: "/exercises/lunge.jpg" },
  { name: "Kreuzheben", muscles: ["Rücken", "Beine"], equipment: "Langhantel", image: "/exercises/deadlift.jpg" },
  { name: "Rumänisches Kreuzheben", muscles: ["Beine", "Gesäß", "Rücken"], equipment: "Langhantel", image: "/exercises/deadlift.jpg" },
  { name: "Hip Thrust", muscles: ["Gesäß"], equipment: "Langhantel", image: "/exercises/hip.jpg" },
  { name: "Beinbeuger", muscles: ["Beine"], equipment: "Maschine", image: "/exercises/legpress.jpg" },
  { name: "Wadenheben", muscles: ["Waden"], equipment: "Maschine", image: "/exercises/lunge.jpg" },
  { name: "Bankdrücken", muscles: ["Brust", "Schultern", "Trizeps"], equipment: "Langhantel", image: "/exercises/bench.jpg" },
  { name: "Schrägbankdrücken", muscles: ["Brust", "Schultern"], equipment: "Kurzhantel", image: "/exercises/bench.jpg" },
  { name: "Liegestütz", muscles: ["Brust", "Trizeps", "Core"], equipment: "Körpergewicht", image: "/exercises/pushup.jpg" },
  { name: "Dips", muscles: ["Brust", "Trizeps"], equipment: "Körpergewicht", image: "/exercises/dip.jpg" },
  { name: "Schulterdrücken", muscles: ["Schultern", "Trizeps"], equipment: "Langhantel", image: "/exercises/ohp.jpg" },
  { name: "Seitheben", muscles: ["Schultern"], equipment: "Kurzhantel", image: "/exercises/ohp.jpg" },
  { name: "Klimmzüge", muscles: ["Rücken", "Bizeps"], equipment: "Körpergewicht", image: "/exercises/pullup.jpg" },
  { name: "Latziehen", muscles: ["Rücken", "Bizeps"], equipment: "Kabel", image: "/exercises/pullup.jpg" },
  { name: "Rudern", muscles: ["Rücken", "Bizeps"], equipment: "Langhantel", image: "/exercises/row.jpg" },
  { name: "Face Pull", muscles: ["Schultern", "Rücken"], equipment: "Kabel", image: "/exercises/row.jpg" },
  { name: "Bizeps Curls", muscles: ["Bizeps"], equipment: "Kurzhantel", image: "/exercises/curl.jpg" },
  { name: "Hammer Curls", muscles: ["Bizeps"], equipment: "Kurzhantel", image: "/exercises/curl.jpg" },
  { name: "Trizepsdrücken", muscles: ["Trizeps"], equipment: "Kabel", image: "/exercises/dip.jpg" },
  { name: "Plank", muscles: ["Core"], equipment: "Körpergewicht", image: "/exercises/core.jpg" },
  { name: "Beinheben", muscles: ["Core"], equipment: "Körpergewicht", image: "/exercises/core.jpg" },
];
