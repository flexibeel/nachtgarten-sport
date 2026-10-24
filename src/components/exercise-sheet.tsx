import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ExerciseVisual } from "@/components/exercise-visual";
import { formatNum, formatWhen } from "@/lib/format";
import { exerciseTrail, type ExerciseStop } from "@/lib/stats";
import type { Exercise, Session } from "@/lib/types";

export function ExerciseSheet({
  exercise,
  sessions,
  pro,
  onClose,
}: {
  exercise: Exercise;
  sessions: Session[];
  pro: boolean;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const trail = exerciseTrail(sessions, exercise.id ?? -1);
  const bestWeight = trail.reduce((best, stop) => Math.max(best, stop.topWeight), 0);
  const bestReps = trail.reduce((best, stop) => Math.max(best, stop.topReps), 0);
  const bestEstimated = trail.reduce((best, stop) => Math.max(best, stop.estimated), 0);
  const weighted = bestWeight > 0;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 pt-6 pb-12">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Verlauf</p>
            <h1 className="mt-2 font-display text-5xl italic leading-none">{exercise.name}</h1>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full border border-line"
          >
            <X className="size-5" />
          </button>
        </header>

        <ExerciseVisual src={exercise.image} name={exercise.name} className="mt-6 h-40 rounded-card" />

        {trail.length === 0 ? (
          <p className="mt-8 text-muted">Diese Übung steht noch in keinem Training.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Einheiten" value={String(trail.length)} />
              <Stat label="Rekord" value={weighted ? `${formatNum(bestWeight)} kg` : `${bestReps} Wdh`} />
            </div>
            {pro && weighted && bestEstimated > 0 ? (
              <p className="nums mt-3 text-sm text-muted">
                Geschätzt {formatNum(Math.round(bestEstimated))} kg bei einer Wiederholung
              </p>
            ) : null}
            {pro && trail.length > 1 ? <TrailChart trail={trail} weighted={weighted} /> : null}
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {trail.map((stop, index) => (
                <li key={`${stop.date}-${index}`} className="py-3">
                  <p className="text-sm text-muted">{formatWhen(stop.date)}</p>
                  <p className="nums mt-1">
                    {stop.sets.map((set, setIndex) => (
                      <span key={setIndex} className={set.warm ? "text-muted" : undefined}>
                        {setIndex > 0 ? "  " : ""}
                        {set.weight > 0 ? `${formatNum(set.weight)}×${set.reps}` : `${set.reps} Wdh`}
                        {set.warm ? " Aufwärmen" : ""}
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3">
      <p className="eyebrow text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl italic leading-none">{value}</p>
    </div>
  );
}

function TrailChart({ trail, weighted }: { trail: ExerciseStop[]; weighted: boolean }) {
  const [mod, setMod] = useState<typeof import("recharts") | null>(null);
  useEffect(() => {
    void import("recharts").then(setMod);
  }, []);
  if (!mod) return <div className="mt-4 h-28 rounded-card border border-line bg-surface" />;
  const { Area, AreaChart, ResponsiveContainer, YAxis } = mod;
  const points = [...trail].reverse().map((stop) => ({
    value: weighted ? stop.topWeight : stop.topReps,
  }));
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(2.5, (max - min) * 0.35);
  return (
    <section className="mt-4 rounded-card border border-line bg-surface p-4">
      <p className="eyebrow text-muted">{weighted ? "Schwerster Satz" : "Meiste Wiederholungen"}</p>
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <YAxis hide domain={[min - pad, max + pad]} />
            <Area
              dataKey="value"
              stroke="var(--color-accent)"
              fill="var(--color-accent)"
              fillOpacity={0.16}
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
