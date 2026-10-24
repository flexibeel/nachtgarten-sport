import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ExercisePicker } from "@/components/exercise-picker";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { ExerciseVisual } from "@/components/exercise-visual";
import { RestBanner, RestOverlay } from "@/components/rest-timer";
import { Button, Confirm } from "@/components/ui";
import { formatElapsed, formatNum, bumpNum, parseNum } from "@/lib/format";
import { startRest, stopRest } from "@/lib/rest";
import { bestMarks, commitSet, isLivePr, lastPerformance, prefillSets } from "@/lib/stats";
import { useSettings } from "@/lib/settings";
import type { Exercise, LiveSession, LiveSet, Session } from "@/lib/types";

function Elapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <p className="nums text-sm text-muted">{formatElapsed(now - startedAt)}</p>;
}

export function SessionView({
  live,
  exercises,
  sessions,
  onChange,
  onCreateExercise,
  onFinish,
  onCancel,
}: {
  live: LiveSession;
  exercises: Exercise[];
  sessions: Session[];
  onChange: (session: LiveSession) => void;
  onCreateExercise: (input: { name: string; muscles: string[]; equipment: string }) => Promise<Exercise | null>;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const settings = useSettings();
  const [picker, setPicker] = useState(live.exercises.length === 0);
  const [timerOpen, setTimerOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [trailId, setTrailId] = useState<number | null>(null);

  const logged = live.exercises.flatMap((exercise) =>
    exercise.sets.map(commitSet).filter((set): set is NonNullable<ReturnType<typeof commitSet>> => set !== null),
  );
  const work = logged.filter((set) => !set.warm);
  const counted = work.length > 0 ? work : logged;
  const volume = work.reduce((sum, set) => sum + set.weight * set.reps, 0);
  const hint = (() => {
    for (const exercise of live.exercises) {
      if (exercise.sets.some((set) => !set.done)) {
        return exercises.find((item) => item.id === exercise.exId)?.name ?? null;
      }
    }
    return null;
  })();

  function patchExercise(index: number, sets: LiveSet[]) {
    onChange({
      ...live,
      exercises: live.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, sets } : exercise,
      ),
    });
  }

  function toggleDone(exerciseIndex: number, setIndex: number) {
    const exercise = live.exercises[exerciseIndex];
    if (!exercise) return;
    const current = exercise.sets[setIndex];
    if (!current) return;
    const done = !current.done;
    patchExercise(
      exerciseIndex,
      exercise.sets.map((set, index) => (index === setIndex ? { ...set, done } : set)),
    );
    if (done && live.restOn) {
      startRest(settings.restSeconds);
      if (navigator.vibrate) navigator.vibrate(12);
    }
  }

  function addExercise(exercise: Exercise) {
    if (exercise.id == null) return;
    const last = lastPerformance(sessions, exercise.id);
    onChange({
      ...live,
      exercises: [...live.exercises, { exId: exercise.id, sets: prefillSets(last?.length || 3, last) }],
    });
    setPicker(false);
  }

  return (
    <div className="session-pad px-4 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Training</p>
          <h1 className="mt-1 font-display text-4xl italic leading-none">{live.planName || "Frei"}</h1>
        </div>
        <div className="text-right">
          <Elapsed startedAt={live.startedAt} />
          <button
            type="button"
            className="mt-1 text-sm text-accent"
            onClick={() => {
              const restOn = !live.restOn;
              onChange({ ...live, restOn });
              if (!restOn) stopRest();
            }}
          >
            {live.restOn ? `Pause ${settings.restSeconds}s` : "Pause aus"}
          </button>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {live.exercises.map((exercise, exerciseIndex) => {
          const meta = exercises.find((item) => item.id === exercise.exId);
          const name = meta?.name ?? "Übung";
          const prior = bestMarks(sessions, exercise.exId);
          const last = lastPerformance(sessions, exercise.exId);
          const lastSet = last?.[0];
          return (
            <article key={`${exercise.exId}-${exerciseIndex}`} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="relative">
                <ExerciseVisual src={meta?.image} name={name} className="h-36" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h2 className="font-display text-4xl italic leading-none">{name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {prior.weight > 0 ? `Rekord ${formatNum(prior.weight)} kg` : "Erstes Mal"}
                    {lastSet ? ` · zuletzt ${formatNum(lastSet.weight)}×${lastSet.reps}` : ""}
                  </p>
                </div>
              </div>
              {last ? (
                <div className="flex justify-end px-3 pt-2">
                  <button type="button" className="min-h-11 text-sm text-accent" onClick={() => setTrailId(exercise.exId)}>
                    Bisher
                  </button>
                </div>
              ) : null}
              <div className="space-y-2 p-3">
                {exercise.sets.map((set, setIndex) => {
                  const weight = parseNum(set.weight);
                  const reps = Math.round(parseNum(set.reps));
                  const pr = set.done && isLivePr(sessions, exercise.exId, weight, reps, set.warm);
                  return (
                    <div key={setIndex} className={set.done ? "rounded-control bg-bg/70 p-2" : "rounded-control bg-bg p-2"}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="nums text-xs text-muted">Satz {setIndex + 1}</span>
                          <button
                            type="button"
                            aria-pressed={set.warm === true}
                            onClick={() =>
                              patchExercise(
                                exerciseIndex,
                                exercise.sets.map((entry, index) =>
                                  index === setIndex ? { ...entry, warm: !entry.warm } : entry,
                                ),
                              )
                            }
                            className={set.warm ? "min-h-11 text-sm text-accent" : "min-h-11 text-sm text-muted"}
                          >
                            Aufwärmen
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {pr ? <span className="text-xs text-accent">Rekord</span> : null}
                          <button
                            type="button"
                            aria-pressed={set.done}
                            aria-label={set.done ? "Satz zurücknehmen" : "Satz erledigt"}
                            onClick={() => toggleDone(exerciseIndex, setIndex)}
                            className={
                              set.done
                                ? "grid size-11 place-items-center rounded-full bg-accent text-ink"
                                : "grid size-11 place-items-center rounded-full border border-line text-muted"
                            }
                          >
                            <Check className="size-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Stepper
                          label="kg"
                          value={set.weight}
                          delta={2.5}
                          onChange={(weightValue) =>
                            patchExercise(
                              exerciseIndex,
                              exercise.sets.map((entry, index) =>
                                index === setIndex ? { ...entry, weight: weightValue } : entry,
                              ),
                            )
                          }
                        />
                        <Stepper
                          label="Wdh"
                          value={set.reps}
                          delta={1}
                          onChange={(repsValue) =>
                            patchExercise(
                              exerciseIndex,
                              exercise.sets.map((entry, index) =>
                                index === setIndex ? { ...entry, reps: repsValue } : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-1 pt-1">
                  <button
                    type="button"
                    className="min-h-11 text-sm text-muted"
                    onClick={() => {
                      const previous = exercise.sets[exercise.sets.length - 1];
                      patchExercise(exerciseIndex, [
                        ...exercise.sets,
                        { weight: previous?.weight ?? "", reps: previous?.reps ?? "", done: false },
                      ]);
                    }}
                  >
                    Satz dazu
                  </button>
                  {exercise.sets.length > 1 ? (
                    <button
                      type="button"
                      className="min-h-11 text-sm text-muted"
                      onClick={() => patchExercise(exerciseIndex, exercise.sets.slice(0, -1))}
                    >
                      Letzten weg
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="min-h-11 text-sm text-muted"
                      onClick={() =>
                        onChange({
                          ...live,
                          exercises: live.exercises.filter((_, index) => index !== exerciseIndex),
                        })
                      }
                    >
                      Übung raus
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Button tone="ghost" full className="mt-4" onClick={() => setPicker(true)}>
        Übung dazu
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="safe-bottom mx-auto max-w-md border-t border-line bg-bg/95 px-4 pt-3">
          <p className="nums mb-2 text-center text-xs text-muted">
            {counted.length} {counted.length === 1 ? "Satz" : "Sätze"} · {formatNum(Math.round(volume))} kg
          </p>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button tone="ghost" onClick={() => (logged.length > 0 ? setConfirmCancel(true) : onCancel())}>
              Abbrechen
            </Button>
            <Button disabled={logged.length === 0} onClick={onFinish}>
              Beenden
            </Button>
          </div>
        </div>
      </div>

      <RestBanner onOpen={() => setTimerOpen(true)} />
      <RestOverlay open={timerOpen} hint={hint} onClose={() => setTimerOpen(false)} />
      {picker ? (
        <ExercisePicker
          exercises={exercises}
          onClose={() => setPicker(false)}
          onPick={addExercise}
          onCreate={onCreateExercise}
        />
      ) : null}
      <Confirm
        open={confirmCancel}
        title="Abbrechen?"
        body="Nichts davon wird gespeichert."
        confirm="Verwerfen"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={onCancel}
      />
      {trailId != null ? (
        <ExerciseSheet
          exercise={exercises.find((item) => item.id === trailId) ?? { id: trailId, name: "Übung", muscles: [], equipment: "", image: "" }}
          sessions={sessions}
          pro={settings.pro}
          onClose={() => setTrailId(null)}
        />
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  value,
  delta,
  onChange,
}: {
  label: string;
  value: string;
  delta: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center rounded-control border border-line">
      <button type="button" className="grid size-11 place-items-center text-lg" aria-label={`${label} weniger`} onClick={() => onChange(bumpNum(value, -delta))}>
        −
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
        <input
          inputMode="decimal"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          className="nums w-full bg-transparent text-center text-base outline-none"
        />
      </label>
      <button type="button" className="grid size-11 place-items-center text-lg" aria-label={`${label} mehr`} onClick={() => onChange(bumpNum(value, delta))}>
        +
      </button>
    </div>
  );
}
