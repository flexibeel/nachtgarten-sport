import { useCallback, useEffect, useRef, useState } from "react";
import { History, House, Rows3, SlidersHorizontal } from "lucide-react";
import { HistoryView } from "@/components/history-view";
import { HomeView } from "@/components/home-view";
import { PlansView } from "@/components/plans-view";
import { SessionView } from "@/components/session-view";
import { SettingsView } from "@/components/settings-view";
import { ShareStudio } from "@/components/share-studio";
import { Boot } from "@/components/ui";
import { Onboarding } from "@/components/onboarding";
import { imageForMuscle } from "@/lib/catalog";
import { del, getAll, put, seedIfEmpty } from "@/lib/idb";
import { loadLive, saveLive } from "@/lib/live";
import { hydrateRest, stopRest } from "@/lib/rest";
import { useSettings } from "@/lib/settings";
import { buildShare, commitSet, lastPerformance, prefillSets } from "@/lib/stats";
import type { Exercise, LiveSession, Plan, Session, SharePayload, View } from "@/lib/types";

type GymData = {
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
};

const TABS: { id: View; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "plans", label: "Pläne", icon: Rows3 },
  { id: "history", label: "Verlauf", icon: History },
  { id: "settings", label: "Mehr", icon: SlidersHorizontal },
];

export function App() {
  const settings = useSettings();
  const [data, setData] = useState<GymData | null>(null);
  const [view, setView] = useState<View>("home");
  const [live, setLive] = useState<LiveSession | null>(null);
  const [share, setShare] = useState<SharePayload | null>(null);
  const [error, setError] = useState("");
  const dataRef = useRef<GymData | null>(null);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    await seedIfEmpty();
    const [exercises, plans, sessions] = await Promise.all([
      getAll<Exercise>("exercises"),
      getAll<Plan>("plans"),
      getAll<Session>("sessions"),
    ]);
    exercises.sort((a, b) => a.name.localeCompare(b.name, "de"));
    sessions.sort((a, b) => b.date - a.date);
    const next = { exercises, plans, sessions };
    setData(next);
    return next;
  }, []);

  useEffect(() => {
    hydrateRest();
    const stored = loadLive();
    if (stored) setLive(stored);
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Speicher nicht erreichbar");
    });
  }, [refresh]);

  function updateLive(next: LiveSession | null) {
    setLive(next);
    saveLive(next);
  }

  function openLive(next: LiveSession) {
    setShare(null);
    updateLive(next);
  }

  function startEmpty() {
    openLive({
      planId: null,
      planName: null,
      startedAt: Date.now(),
      restOn: settings.restEnabled,
      exercises: [],
    });
  }

  function startPlan(plan: Plan) {
    const sessions = data?.sessions ?? [];
    openLive({
      planId: plan.id ?? null,
      planName: plan.name,
      startedAt: Date.now(),
      restOn: settings.restEnabled,
      exercises: plan.exercises.map((item) => ({
        exId: item.exId,
        sets: prefillSets(item.sets, lastPerformance(sessions, item.exId)),
      })),
    });
  }

  function startRepeat(session: Session) {
    openLive({
      planId: session.planId,
      planName: session.planName,
      startedAt: Date.now(),
      restOn: settings.restEnabled,
      exercises: session.exercises.map((exercise) => ({
        exId: exercise.exId,
        sets: prefillSets(Math.max(1, exercise.sets.length), exercise.sets),
      })),
    });
  }

  async function finish() {
    if (!live || !data) return;
    const session = materialize(live, data.exercises);
    if (!session) return;
    await put("sessions", session);
    const payload = buildShare(session, data.sessions, settings.name, settings.pro);
    stopRest();
    updateLive(null);
    setShare(payload);
    await refresh();
  }

  function cancel() {
    stopRest();
    updateLive(null);
  }

  async function createExercise(input: { name: string; muscles: string[]; equipment: string }) {
    const current = dataRef.current;
    const existing = current?.exercises.find(
      (exercise) => exercise.name.toLocaleLowerCase("de") === input.name.trim().toLocaleLowerCase("de"),
    );
    if (existing) return existing;
    const image = imageForMuscle(input.muscles[0] ?? "Brust");
    const exercise = {
      name: input.name.trim(),
      muscles: input.muscles,
      equipment: input.equipment,
      image,
      custom: true,
    };
    const id = await put("exercises", exercise);
    await refresh();
    return { ...exercise, id };
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p>{error}</p>
      </div>
    );
  }
  if (!settings.name) return <Onboarding />;
  if (!data) return <Boot />;
  if (share) return <ShareStudio payload={share} onClose={() => setShare(null)} />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      {live ? (
        <SessionView
          live={live}
          exercises={data.exercises}
          sessions={data.sessions}
          onChange={updateLive}
          onCreateExercise={createExercise}
          onFinish={() => void finish()}
          onCancel={cancel}
        />
      ) : (
        <>
          <main className="scroll-pad px-4 pt-6">
            {view === "home" ? (
              <HomeView
                name={settings.name}
                pro={settings.pro}
                exercises={data.exercises}
                plans={data.plans}
                sessions={data.sessions}
                onTrain={startEmpty}
                onPlan={startPlan}
                onRepeat={startRepeat}
                onOpenPlans={() => setView("plans")}
              />
            ) : null}
            {view === "plans" ? (
              <PlansView
                exercises={data.exercises}
                plans={data.plans}
                onCreatePlan={async (name) => {
                  await put("plans", { name, exercises: [] });
                  await refresh();
                }}
                onSavePlan={async (plan) => {
                  await put("plans", plan);
                  await refresh();
                }}
                onDeletePlan={async (id) => {
                  await del("plans", id);
                  await refresh();
                }}
                onCreateExercise={createExercise}
                onStart={startPlan}
              />
            ) : null}
            {view === "history" ? (
              <HistoryView
                sessions={data.sessions}
                exercises={data.exercises}
                pro={settings.pro}
                athlete={settings.name}
                onShare={setShare}
                onDelete={(id) => {
                  void del("sessions", id).then(() => refresh());
                }}
              />
            ) : null}
            {view === "settings" ? (
              <SettingsView
                settings={settings}
                exercises={data.exercises}
                plans={data.plans}
                sessions={data.sessions}
                onImported={refresh}
              />
            ) : null}
          </main>
          <nav className="fixed inset-x-0 bottom-0 z-20">
            <div className="safe-bottom mx-auto grid max-w-md grid-cols-4 border-t border-line bg-bg/95 px-2 pt-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    className={active ? "flex min-h-14 flex-col items-center justify-center text-accent" : "flex min-h-14 flex-col items-center justify-center text-muted"}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    <span className="mt-1 text-xs">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function materialize(live: LiveSession, exercises: Exercise[]): Session | null {
  const items = live.exercises
    .map((exercise) => ({
      exId: exercise.exId,
      name: exercises.find((item) => item.id === exercise.exId)?.name ?? "Übung",
      sets: exercise.sets.map(commitSet).filter((set): set is NonNullable<ReturnType<typeof commitSet>> => set !== null),
    }))
    .filter((exercise) => exercise.sets.length > 0);
  if (items.length === 0) return null;
  return {
    date: Date.now(),
    planId: live.planId,
    planName: live.planName,
    durationSec: Math.max(1, Math.round((Date.now() - live.startedAt) / 1000)),
    exercises: items,
  };
}
