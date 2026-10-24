import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { ExerciseVisual } from "@/components/exercise-visual";
import { Button, Field } from "@/components/ui";
import { EQUIPMENT, MUSCLES } from "@/lib/catalog";
import type { Exercise } from "@/lib/types";

export function ExercisePicker({
  exercises,
  onClose,
  onPick,
  onCreate,
}: {
  exercises: Exercise[];
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
  onCreate: (input: { name: string; muscles: string[]; equipment: string }) => Promise<Exercise | null>;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [muscles, setMuscles] = useState<string[]>(["Brust"]);
  const [equipment, setEquipment] = useState<string>("Kurzhantel");
  const [busy, setBusy] = useState(false);

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

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return exercises
      .filter((exercise) => {
        if (!needle) return true;
        const hay = `${exercise.name} ${exercise.muscles.join(" ")} ${exercise.equipment}`.toLocaleLowerCase("de");
        return hay.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [exercises, query]);

  function toggleMuscle(muscle: string) {
    setMuscles((current) => {
      if (current.includes(muscle)) return current.filter((item) => item !== muscle);
      return [...current, muscle];
    });
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || muscles.length === 0) return;
    setBusy(true);
    try {
      const created = await onCreate({ name: trimmed, muscles, equipment });
      if (created) onPick(created);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-bg">
      <div className="flex h-full w-full max-w-md flex-col">
        <div className="flex items-center gap-3 px-4 pt-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Field
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Übung suchen"
              aria-label="Übung suchen"
              className="pl-10"
            />
          </div>
          <button type="button" className="grid size-12 place-items-center rounded-control border border-line" onClick={onClose} aria-label="Schließen">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <button
            type="button"
            className="text-sm text-accent"
            onClick={() => setCreating((value) => !value)}
          >
            {creating ? "Schließen" : "Eigene Übung"}
          </button>
          {creating ? (
            <div className="mt-3 rounded-card border border-line bg-surface p-4">
              <Field
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                aria-label="Name der Übung"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {MUSCLES.map((muscle) => {
                  const on = muscles.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => toggleMuscle(muscle)}
                      className={on ? "rounded-full bg-accent px-3 py-1.5 text-sm text-ink" : "rounded-full border border-line px-3 py-1.5 text-sm text-muted"}
                    >
                      {muscle}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EQUIPMENT.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEquipment(item)}
                    className={item === equipment ? "rounded-full bg-raised px-3 py-1.5 text-sm text-fg" : "rounded-full px-3 py-1.5 text-sm text-muted"}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Button full className="mt-4" disabled={busy || !name.trim() || muscles.length === 0} onClick={() => void create()}>
                Anlegen
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-4 pb-8">
          {filtered.length === 0 ? <p className="py-10 text-center text-muted">Nichts unter diesem Namen.</p> : null}
          {filtered.map((exercise) => (
            <button
              key={exercise.id ?? exercise.name}
              type="button"
              onClick={() => onPick(exercise)}
              className="block w-full overflow-hidden rounded-card border border-line bg-surface text-left transition-transform duration-150 active:scale-[0.96]"
            >
              <ExerciseVisual src={exercise.image} name={exercise.name} className="h-28" />
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-base">{exercise.name}</p>
                  <p className="text-sm text-muted">
                    {exercise.muscles.join(" · ")} · {exercise.equipment}
                  </p>
                </div>
                <Plus className="size-5 text-accent" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
