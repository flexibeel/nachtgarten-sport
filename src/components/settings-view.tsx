import { useRef, useState } from "react";
import { Button, Confirm, Field, Toggle } from "@/components/ui";
import { clearPlansAndSessions, parseBackup, replaceAll, type Backup } from "@/lib/idb";
import { updateSettings } from "@/lib/settings";
import type { Exercise, Plan, Session, Settings } from "@/lib/types";

const REST = [60, 90, 120, 180];

export function SettingsView({
  settings,
  exercises,
  plans,
  sessions,
  onImported,
}: {
  settings: Settings;
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
  onImported: () => Promise<unknown>;
}) {
  const [name, setName] = useState(settings.name);
  const [note, setNote] = useState("");
  const [wipe, setWipe] = useState(false);
  const [importFile, setImportFile] = useState<Backup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportBackup() {
    const backup: Backup = {
      version: 1,
      exportedAt: Date.now(),
      exercises,
      plans,
      sessions,
      settings,
    };
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nachtgarten-sicherung.json";
    link.click();
    URL.revokeObjectURL(url);
    setNote("Sicherung liegt im Download.");
  }

  return (
    <div>
      <p className="eyebrow text-accent">Mehr</p>
      <h1 className="mt-2 font-display text-5xl italic leading-none">Ruhig bleiben</h1>

      <section className="mt-8 rounded-card border border-line bg-surface p-4">
        <label className="text-sm text-muted" htmlFor="alias">
          Name
        </label>
        <Field id="alias" className="mt-2" value={name} onChange={(event) => setName(event.target.value)} />
        <Button
          full
          className="mt-3"
          disabled={!name.trim() || name.trim() === settings.name}
          onClick={() => updateSettings({ name: name.trim() })}
        >
          Speichern
        </Button>
      </section>

      <section className="mt-4 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Pro-Modus</p>
            <p className="text-sm text-muted">Verlauf, Rekorde, dichtere Karten. Kein Abo.</p>
          </div>
          <Toggle checked={settings.pro} label="Pro-Modus" onChange={(pro) => updateSettings({ pro })} />
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Pause nach dem Satz</p>
            <p className="text-sm text-muted">Startet von selbst. Im Training ausschaltbar.</p>
          </div>
          <Toggle
            checked={settings.restEnabled}
            label="Pause nach dem Satz"
            onChange={(restEnabled) => updateSettings({ restEnabled })}
          />
        </div>
        <p className="mt-5 text-sm text-muted">Pausenlänge</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {REST.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => updateSettings({ restSeconds: seconds })}
              className={
                settings.restSeconds === seconds
                  ? "min-h-11 rounded-control bg-accent text-sm text-ink"
                  : "min-h-11 rounded-control border border-line text-sm text-muted"
              }
            >
              {seconds}s
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-card border border-line bg-surface p-4">
        <p>Alles bleibt auf diesem Gerät.</p>
        <p className="mt-1 text-sm text-muted">Eine Sicherung ist nur eine Datei, kein Konto.</p>
        <div className="mt-4 flex gap-2">
          <Button tone="ghost" onClick={exportBackup}>
            Sichern
          </Button>
          <Button tone="ghost" onClick={() => fileRef.current?.click()}>
            Laden
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 2_000_000) {
              setNote("Die Datei ist zu groß.");
              return;
            }
            void file.text().then((text) => {
              try {
                setImportFile(parseBackup(JSON.parse(text) as unknown));
              } catch (error) {
                setNote(error instanceof Error ? error.message : "Laden fehlgeschlagen.");
              }
            });
          }}
        />
        <Button tone="quiet" className="mt-3 px-0" onClick={() => setWipe(true)}>
          Trainingsdaten löschen
        </Button>
        {note ? <p className="mt-3 text-sm text-accent">{note}</p> : null}
      </section>

      <Confirm
        open={wipe}
        title="Wirklich leeren?"
        body="Pläne und Verlauf werden gelöscht. Dein Name und die Übungen bleiben."
        confirm="Löschen"
        onCancel={() => setWipe(false)}
        onConfirm={() => {
          setWipe(false);
          void clearPlansAndSessions().then(() => onImported());
          setNote("Verlauf und Pläne sind leer.");
        }}
      />
      <Confirm
        open={importFile != null}
        title="Sicherung laden?"
        body="Sie ersetzt, was gerade auf diesem Gerät liegt."
        confirm="Ersetzen"
        onCancel={() => setImportFile(null)}
        onConfirm={() => {
          const backup = importFile;
          setImportFile(null);
          if (!backup) return;
          void replaceAll(backup).then(async () => {
            if (backup.settings?.name) updateSettings(backup.settings);
            await onImported();
            setNote("Sicherung ist da.");
          });
        }}
      />
    </div>
  );
}
