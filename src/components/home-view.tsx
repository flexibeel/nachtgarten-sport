import { ExerciseVisual } from "@/components/exercise-visual";
import { MoonMark } from "@/components/ui";
import { formatNum, formatWhen, greeting } from "@/lib/format";
import { dayStreak, sessionSets, sessionVolume, weekStart } from "@/lib/stats";
import type { Exercise, Plan, Session } from "@/lib/types";

export function HomeView({
  name,
  pro,
  exercises,
  plans,
  sessions,
  onTrain,
  onPlan,
  onRepeat,
  onOpenPlans,
}: {
  name: string;
  pro: boolean;
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
  onTrain: () => void;
  onPlan: (plan: Plan) => void;
  onRepeat: (session: Session) => void;
  onOpenPlans: () => void;
}) {
  const latest = sessions[0];
  const streak = dayStreak(sessions);
  const week = sessions.filter((session) => session.date >= weekStart());
  const weekVolume = week.reduce((sum, session) => sum + sessionVolume(session), 0);

  return (
    <div>
      <header className="rise flex items-start justify-between">
        <div>
          <p className="eyebrow text-accent">Nachtgarten</p>
          <h1 className="mt-3 font-display text-5xl italic leading-none">{greeting()}</h1>
          <p className="mt-3 text-lg text-muted">{name}</p>
          {streak >= 2 ? <p className="mt-1 text-sm text-accent">{streak} Tage in Folge</p> : null}
        </div>
        <MoonMark className="mt-2 size-14 text-accent" />
      </header>

      <button
        type="button"
        onClick={onTrain}
        className="rise rise-2 mt-8 w-full rounded-card bg-accent px-5 py-5 text-left text-ink transition-transform duration-150 active:scale-[0.96]"
      >
        <span className="block font-display text-4xl italic leading-none">Trainieren</span>
        <span className="mt-2 block text-sm">Ohne Plan. Übung für Übung.</span>
      </button>

      {latest ? (
        <button
          type="button"
          onClick={() => onRepeat(latest)}
          className="rise rise-3 mt-3 flex w-full items-center justify-between rounded-card border border-line px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm text-muted">Nochmal {formatWhen(latest.date)}</span>
            <span className="block">{latest.planName || "Freies Training"}</span>
          </span>
          <span className="text-sm text-accent">Start</span>
        </button>
      ) : null}

      <section className="rise rise-3 mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-3xl italic">Pläne</h2>
          <button type="button" className="text-sm text-muted" onClick={onOpenPlans}>
            Bearbeiten
          </button>
        </div>
        {plans.length === 0 ? (
          <button type="button" onClick={onOpenPlans} className="w-full rounded-card border border-dashed border-line px-4 py-6 text-left">
            <p>Ein Plan ist eine Reihenfolge. Mehr nicht.</p>
            <p className="mt-2 text-sm text-accent">Plan anlegen</p>
          </button>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const first = exercises.find((exercise) => exercise.id === plan.exercises[0]?.exId);
              const names = plan.exercises
                .map((item) => exercises.find((exercise) => exercise.id === item.exId)?.name)
                .filter((value): value is string => Boolean(value));
              return (
                <article key={plan.id} className="overflow-hidden rounded-card border border-line bg-surface">
                  <ExerciseVisual src={first?.image} name={plan.name} className="h-28" />
                  <div className="flex items-end justify-between gap-3 px-4 py-3">
                    <div>
                      <h3 className="font-display text-2xl italic">{plan.name}</h3>
                      <p className="text-sm text-muted">{names.slice(0, 3).join(", ") || "Noch leer"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={plan.exercises.length === 0}
                      onClick={() => onPlan(plan)}
                      className="min-h-11 rounded-control bg-accent px-4 text-sm text-ink disabled:opacity-40"
                    >
                      Starten
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {pro && week.length > 0 ? (
        <section className="mt-8 rounded-card border border-line bg-surface px-4 py-4">
          <p className="eyebrow text-muted">Diese Woche</p>
          <p className="mt-2 font-display text-3xl italic">
            {week.length} {week.length === 1 ? "Einheit" : "Einheiten"}
          </p>
          <p className="nums text-sm text-muted">{formatNum(Math.round(weekVolume))} kg Volumen</p>
        </section>
      ) : null}

      {sessions.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl italic">Zuletzt</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {sessions.slice(0, 4).map((session) => (
              <li key={session.id ?? session.date} className="flex items-baseline justify-between py-3">
                <span>
                  <span className="block">{session.planName || "Frei"}</span>
                  <span className="text-sm text-muted">{formatWhen(session.date)}</span>
                </span>
                <span className="nums text-sm text-muted">{sessionSets(session)} Sätze</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
