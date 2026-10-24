export type Exercise = {
  id?: number;
  name: string;
  muscles: string[];
  equipment: string;
  image: string;
  custom?: boolean;
};

export type PlanExercise = {
  exId: number;
  sets: number;
};

export type Plan = {
  id?: number;
  name: string;
  exercises: PlanExercise[];
};

export type LoggedSet = {
  weight: number;
  reps: number;
  warm?: boolean;
};

export type SessionExercise = {
  exId: number;
  name: string;
  sets: LoggedSet[];
};

export type Session = {
  id?: number;
  date: number;
  planId: number | null;
  planName: string | null;
  durationSec: number;
  exercises: SessionExercise[];
};

export type LiveSet = {
  weight: string;
  reps: string;
  done: boolean;
  warm?: boolean;
};

export type LiveExercise = {
  exId: number;
  sets: LiveSet[];
};

export type LiveSession = {
  planId: number | null;
  planName: string | null;
  startedAt: number;
  restOn: boolean;
  exercises: LiveExercise[];
};

export type ShareExercise = {
  name: string;
  sets: LoggedSet[];
  pr: boolean;
  e1rm: number;
};

export type SharePayload = {
  athlete: string;
  when: number;
  durationSec: number;
  planName: string | null;
  exercises: ShareExercise[];
  volume: number;
  setCount: number;
  prs: { name: string; label: string }[];
  pro: boolean;
};

export type View = "home" | "plans" | "history" | "settings";

export type CardDesign = "garten" | "protokoll" | "mond" | "labor";

export type Settings = {
  name: string;
  pro: boolean;
  restEnabled: boolean;
  restSeconds: number;
};
