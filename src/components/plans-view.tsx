import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ExercisePicker } from "@/components/exercise-picker";
import { ExerciseVisual } from "@/components/exercise-visual";
import { Button, Confirm, Field } from "@/components/ui";
import type { Exercise, Plan } from "@/lib/types";

export function PlansView({
  exercises,
  plans,
  onCreatePlan,
  onSavePlan,
  onDeletePlan,
  onCreateExercise,
  onStart,
}: {
  exercises: Exercise[];
  plans: Plan[];
  onCreatePlan: (name: string) => Promise<void>;
  onSavePlan: (plan: Plan) => Promise<void>;
  onDeletePlan: (id: number) => Promise<void>;
  onCreateExercise: (input: { name: string; muscles: string[]; equipment: string }) => Promise<Exercise | null>;
  onStart: (plan: Plan) => void;
}) {
  const [name, setName] = useState("");
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  function exerciseName(id: number) {
    return exercises.find((exercise) => exercise.id === id);
  }

  async function addExercise(exercise: Exercise) {
    const plan = plans.find((item) => item.id === pickerFor);
    if (!plan || exercise.id == null) return;
    await onSavePlan({
      ...plan,
      exercises: [...plan.exercises, { exId: exercise.id, sets: 3 }],
    });
    setPickerFor(null);
  }

  return (
    <div>
      <p className="eyebrow text-accent">Pläne</p>
      <h1 className="mt-2 font-display text-5xl italic leading-none">Reihenfolge</h1>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = name.trim();
          if (!next) return;
          void onCreatePlan(next);
          setName("");
        }}
      >
        <Field value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, zum Beispiel Push" aria-label="Plan-Name" />
        <Button type="submit" disabled={!name.trim()}>
          Anlegen
        </Button>
      </form>

      <div className="mt-6 space-y-4">
        {plans.length === 0 ? <p className="text-muted">Noch keine Pläne. Ein Name reicht für den Anfang.</p> : null}
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-3xl italic">{plan.name}</h2>
              <Button disabled={plan.exercises.length === 0} onClick={() => onStart(plan)}>
                Starten
              </Button>
            </div>
            <ul className="mt-3 space-y-2">
              {plan.exercises.map((item, index) => {
                const exercise = exerciseName(item.exId);
                return (
                  <li key={`${item.exId}-${index}`} className="rounded-control bg-bg p-2">
                    <div className="flex items-center gap-3">
                      <ExerciseVisual src={exercise?.image} name={exercise?.name ?? "?"} className="size-14 shrink-0 rounded-control" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{exercise?.name ?? "Gelöschte Übung"}</p>
                        <p className="text-sm text-muted">{item.sets} Sätze</p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex">
                        <IconButton label="Nach oben" disabled={index === 0} onClick={() => void move(plan, index, -1, onSavePlan)}>
                          <ChevronUp className="size-4" />
                        </IconButton>
                        <IconButton
                          label="Nach unten"
                          disabled={index === plan.exercises.length - 1}
                          onClick={() => void move(plan, index, 1, onSavePlan)}
                        >
                          <ChevronDown className="size-4" />
                        </IconButton>
                      </div>
                      <div className="flex items-center">
                        <button
                          type="button"
                          className="grid size-11 place-items-center text-muted"
                          aria-label="Weniger Sätze"
                          onClick={() =>
                            void onSavePlan({
                              ...plan,
                              exercises: plan.exercises.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sets: Math.max(1, entry.sets - 1) } : entry,
                              ),
                            })
                          }
                        >
                          −
                        </button>
                        <span className="nums w-5 text-center">{item.sets}</span>
                        <button
                          type="button"
                          className="grid size-11 place-items-center"
                          aria-label="Mehr Sätze"
                          onClick={() =>
                            void onSavePlan({
                              ...plan,
                              exercises: plan.exercises.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sets: Math.min(12, entry.sets + 1) } : entry,
                              ),
                            })
                          }
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="grid size-11 place-items-center text-muted"
                          aria-label="Aus Plan nehmen"
                          onClick={() =>
                            void onSavePlan({
                              ...plan,
                              exercises: plan.exercises.filter((_, entryIndex) => entryIndex !== index),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button tone="ghost" onClick={() => setPickerFor(plan.id ?? null)}>
                Übung dazu
              </Button>
              <Button tone="quiet" onClick={() => setConfirmId(plan.id ?? null)}>
                Löschen
              </Button>
            </div>
          </article>
        ))}
      </div>

      {pickerFor != null ? (
        <ExercisePicker
          exercises={exercises}
          onClose={() => setPickerFor(null)}
          onPick={(exercise) => void addExercise(exercise)}
          onCreate={onCreateExercise}
        />
      ) : null}
      <Confirm
        open={confirmId != null}
        title="Plan löschen?"
        body="Die Einheiten im Verlauf bleiben."
        confirm="Löschen"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId != null) void onDeletePlan(confirmId);
          setConfirmId(null);
        }}
      />
    </div>
  );
}

function move(plan: Plan, index: number, direction: number, save: (plan: Plan) => Promise<void>) {
  const next = [...plan.exercises];
  const target = index + direction;
  if (target < 0 || target >= next.length) return;
  const [item] = next.splice(index, 1);
  if (!item) return;
  next.splice(target, 0, item);
  return save({ ...plan, exercises: next });
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid size-11 place-items-center text-muted disabled:opacity-30">
      {children}
    </button>
  );
}
