import { useEffect, useState } from "react";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { Confirm } from "@/components/ui";
import { formatMinutes, formatNum, formatStamp } from "@/lib/format";
import { buildShare, e1rm, sessionSets, sessionVolume } from "@/lib/stats";
import type { Exercise, Session, SharePayload } from "@/lib/types";

export function HistoryView({
  sessions,
  exercises,
  pro,
  athlete,
  onShare,
  onDelete,
}: {
  sessions: Session[];
  exercises: Exercise[];
  pro: boolean;
  athlete: string;
  onShare: (payload: SharePayload) => void;
  onDelete: (id: number) => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [trailId, setTrailId] = useState<number | null>(null);
  const [pending, setPending] = useState<Session | null>(null);
  const points = [...sessions]
    .reverse()
    .slice(-10)
    .map((session) => ({
      label: formatStamp(session.date),
      volume: Math.round(sessionVolume(session)),
    }));

  const records = new Map<number, { name: string; weight: number; estimated: number }>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const current = records.get(exercise.exId) ?? { name: exercise.name, weight: 0, estimated: 0 };
      for (const set of exercise.sets) {
        if (set.warm) continue;
        current.weight = Math.max(current.weight, set.weight);
        current.estimated = Math.max(current.estimated, e1rm(set.weight, set.reps));
      }
      records.set(exercise.exId, current);
    }
  }
  const top = [...records.entries()]
    .map(([exId, record]) => ({ exId, ...record }))
    .filter((record) => record.weight > 0)
    .sort((a, b) => b.estimated - a.estimated)
    .slice(0, 6);

  const trailExercise = resolveExercise(exercises, sessions, trailId);

  return (
    <div>
      <p className="eyebrow text-accent">Verlauf</p>
      <h1 className="mt-2 font-display text-5xl italic leading-none">Was war</h1>

      {pro && points.length > 1 ? (
        <section className="mt-6 rounded-card border border-line bg-surface p-4">
          <p className="eyebrow text-muted">Volumen</p>
          <VolumeChart points={points} />
        </section>
      ) : null}

      {pro && top.length > 0 ? (
        <section className="mt-4 rounded-card border border-line bg-surface px-4 py-2">
          <p className="eyebrow mb-1 pt-3 text-muted">Rekorde</p>
          <ul>
            {top.map((record) => (
              <li key={record.exId} className="border-b border-line last:border-0">
                <button
                  type="button"
                  className="flex min-h-12 w-full items-baseline justify-between text-left"
                  onClick={() => setTrailId(record.exId)}
                >
                  <span>{record.name}</span>
                  <span className="nums text-accent">{formatNum(record.weight)} kg</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sessions.length === 0 ? (
        <p className="mt-10 text-muted">Noch keine Einheit. Der Verlauf füllt sich von selbst.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((session) => {
            const open = openId === session.id;
            return (
              <li key={session.id ?? session.date} className="rounded-card border border-line bg-surface">
                <button
                  type="button"
                  className="w-full px-4 py-4 text-left"
                  onClick={() => setOpenId(open ? null : (session.id ?? null))}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-2xl italic">{session.planName || "Frei"}</span>
                    <span className="nums text-sm text-muted">{formatNum(Math.round(sessionVolume(session)))} kg</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {formatStamp(session.date)} · {formatMinutes(session.durationSec)} · {sessionSets(session)}{" "}
                    {sessionSets(session) === 1 ? "Satz" : "Sätze"}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-line px-4 py-3">
                    {session.exercises.map((exercise) => (
                      <button
                        key={`${session.id}-${exercise.exId}-${exercise.name}`}
                        type="button"
                        className="block min-h-11 w-full py-2 text-left"
                        onClick={() => setTrailId(exercise.exId)}
                      >
                        <span>{exercise.name}</span>
                        <span className="nums mt-0.5 block text-sm">
                          {exercise.sets.map((set, index) => (
                            <span key={index} className={set.warm ? "text-muted" : "text-fg"}>
                              {index > 0 ? "  " : ""}
                              {formatNum(set.weight)}×{set.reps}
                              {set.warm ? " Aufwärmen" : ""}
                            </span>
                          ))}
                        </span>
                      </button>
                    ))}
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="min-h-11 text-sm text-accent"
                        onClick={() => onShare(buildShare(session, sessions, athlete, pro))}
                      >
                        Karte erstellen
                      </button>
                      {typeof session.id === "number" ? (
                        <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setPending(session)}>
                          Löschen
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {trailExercise ? (
        <ExerciseSheet exercise={trailExercise} sessions={sessions} pro={pro} onClose={() => setTrailId(null)} />
      ) : null}
      <Confirm
        open={pending != null}
        title="Einheit löschen?"
        body="Sie verschwindet aus dem Verlauf. Eine Sicherung holt sie zurück."
        confirm="Löschen"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const id = pending?.id;
          setPending(null);
          if (typeof id !== "number") return;
          if (openId === id) setOpenId(null);
          onDelete(id);
        }}
      />
    </div>
  );
}

function resolveExercise(exercises: Exercise[], sessions: Session[], exId: number | null): Exercise | null {
  if (exId == null) return null;
  const known = exercises.find((exercise) => exercise.id === exId);
  if (known) return known;
  for (const session of sessions) {
    const found = session.exercises.find((exercise) => exercise.exId === exId);
    if (found) {
      return { id: exId, name: found.name, muscles: [], equipment: "", image: "" };
    }
  }
  return null;
}

function VolumeChart({ points }: { points: { label: string; volume: number }[] }) {
  const [mod, setMod] = useState<typeof import("recharts") | null>(null);
  useEffect(() => {
    void import("recharts").then(setMod);
  }, []);
  if (!mod) return <div className="h-24" />;
  const { Area, AreaChart, ResponsiveContainer } = mod;
  return (
    <div className="mt-3 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <Area
            dataKey="volume"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.16}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
