import type { LiveSet, LoggedSet, Session, SharePayload } from "@/lib/types";
import { formatNum, parseNum } from "@/lib/format";

export function e1rm(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function workingSets<T extends { warm?: boolean }>(sets: T[]): T[] {
  return sets.filter((set) => !set.warm);
}

export function volumeOf(sets: LoggedSet[]): number {
  return workingSets(sets).reduce((sum, set) => sum + (set.weight > 0 && set.reps > 0 ? set.weight * set.reps : 0), 0);
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce((sum, ex) => sum + volumeOf(ex.sets), 0);
}

export function sessionSets(session: Session): number {
  return session.exercises.reduce((sum, ex) => {
    const work = workingSets(ex.sets);
    return sum + (work.length > 0 ? work.length : ex.sets.length);
  }, 0);
}

export function bestMarks(sessions: Session[], exId: number, before = Infinity) {
  let weight = 0;
  let estimated = 0;
  for (const session of sessions) {
    if (session.date >= before) continue;
    for (const ex of session.exercises) {
      if (ex.exId !== exId) continue;
      for (const set of ex.sets) {
        if (set.warm) continue;
        if (set.weight > weight) weight = set.weight;
        const estimatedSet = e1rm(set.weight, set.reps);
        if (estimatedSet > estimated) estimated = estimatedSet;
      }
    }
  }
  return { weight, estimated };
}

export type PrHit = { exId: number; name: string; label: string };

export function detectPrs(session: Session, history: Session[]): PrHit[] {
  const hits: PrHit[] = [];
  for (const ex of session.exercises) {
    const prior = bestMarks(history, ex.exId, session.date);
    if (prior.weight <= 0 && prior.estimated <= 0) continue;
    let bestWeight = 0;
    let bestEstimated = 0;
    let bestSet: LoggedSet | null = null;
    for (const set of ex.sets) {
      if (set.warm) continue;
      if (set.weight > bestWeight) bestWeight = set.weight;
      const estimated = e1rm(set.weight, set.reps);
      if (estimated >= bestEstimated) {
        bestEstimated = estimated;
        bestSet = set;
      }
    }
    if (!bestSet) continue;
    const weightPr = bestWeight > prior.weight && bestWeight > 0;
    const strengthPr = bestEstimated > prior.estimated + 0.4;
    if (!weightPr && !strengthPr) continue;
    hits.push({
      exId: ex.exId,
      name: ex.name,
      label: `${formatNum(bestSet.weight)} × ${bestSet.reps}`,
    });
  }
  return hits;
}

export function isLivePr(sessions: Session[], exId: number, weight: number, reps: number, warm = false): boolean {
  if (warm) return false;
  const prior = bestMarks(sessions, exId);
  if (prior.weight <= 0 && prior.estimated <= 0) return false;
  if (!(reps > 0)) return false;
  return weight > prior.weight || e1rm(weight, reps) > prior.estimated + 0.4;
}

export function lastPerformance(sessions: Session[], exId: number): LoggedSet[] | null {
  for (const session of sessions) {
    const found = session.exercises.find((ex) => ex.exId === exId);
    if (found && found.sets.length > 0) return found.sets;
  }
  return null;
}

export function prefillSets(count: number, last: LoggedSet[] | null): LiveSet[] {
  const size = Math.max(1, count);
  return Array.from({ length: size }, (_, index) => {
    const source = last?.[index] ?? (last && last.length > 0 ? last[last.length - 1] : null);
    return {
      weight: source ? String(source.weight) : "",
      reps: source ? String(source.reps) : "",
      done: false,
      warm: source?.warm === true,
    };
  });
}

export function commitSet(set: LiveSet): LoggedSet | null {
  const weight = parseNum(set.weight);
  const reps = Math.round(parseNum(set.reps));
  if (reps <= 0) return null;
  return set.warm ? { weight, reps, warm: true } : { weight, reps };
}

export type ExerciseStop = {
  date: number;
  sets: LoggedSet[];
  topWeight: number;
  topReps: number;
  estimated: number;
};

export function exerciseTrail(sessions: Session[], exId: number): ExerciseStop[] {
  const stops: ExerciseStop[] = [];
  for (const session of sessions) {
    const sets = session.exercises.filter((exercise) => exercise.exId === exId).flatMap((exercise) => exercise.sets);
    if (sets.length === 0) continue;
    const scored = workingSets(sets);
    const pool = scored.length > 0 ? scored : sets;
    let topWeight = 0;
    let topReps = 0;
    let estimated = 0;
    for (const set of pool) {
      if (set.weight > topWeight) topWeight = set.weight;
      if (set.reps > topReps) topReps = set.reps;
      const value = e1rm(set.weight, set.reps);
      if (value > estimated) estimated = value;
    }
    stops.push({ date: session.date, sets, topWeight, topReps, estimated });
  }
  return stops;
}

export function weekStart(now = Date.now()): number {
  const date = new Date(now);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - mondayOffset);
  return date.getTime();
}

export function dayStreak(sessions: Session[], now = Date.now()): number {
  const days = new Set(
    sessions.map((session) => {
      const date = new Date(session.date);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );
  const cursor = new Date(now);
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(key(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function buildShare(session: Session, history: Session[], athlete: string, pro: boolean): SharePayload {
  const prs = detectPrs(session, history);
  const prIds = new Set(prs.map((pr) => pr.exId));
  return {
    athlete,
    when: session.date,
    durationSec: session.durationSec,
    planName: session.planName,
    exercises: session.exercises.map((ex) => {
      const scored = workingSets(ex.sets);
      const sets = scored.length > 0 ? scored : ex.sets;
      return {
        name: ex.name,
        sets,
        pr: prIds.has(ex.exId),
        e1rm: sets.reduce((best, set) => Math.max(best, e1rm(set.weight, set.reps)), 0),
      };
    }),
    volume: Math.round(sessionVolume(session)),
    setCount: sessionSets(session),
    prs: prs.map((pr) => ({ name: pr.name, label: pr.label })),
    pro,
  };
}
