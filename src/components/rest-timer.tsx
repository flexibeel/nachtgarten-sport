import { useEffect } from "react";
import { formatTimer } from "@/lib/format";
import { shiftRest, stopRest, useRestClock } from "@/lib/rest";

export function RestBanner({ onOpen }: { onOpen: () => void }) {
  const clock = useRestClock();
  if (!clock.running) return null;
  return (
    <div className="timer-dock pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-card bg-accent px-4 py-3 text-left text-ink transition-transform duration-150 active:scale-[0.96]"
      >
        <span className="text-sm">Pause</span>
        <span className="nums font-display text-3xl italic leading-none">{formatTimer(clock.remainingMs)}</span>
        <span className="text-sm">Öffnen</span>
      </button>
    </div>
  );
}

export function RestOverlay({
  open,
  hint,
  onClose,
}: {
  open: boolean;
  hint: string | null;
  onClose: () => void;
}) {
  const clock = useRestClock();
  useEffect(() => {
    if (open && !clock.running) onClose();
  }, [open, clock.running, onClose]);

  if (!open || !clock.running) return null;
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, clock.remainingMs / Math.max(1, clock.total * 1000)));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg px-6">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="eyebrow text-accent">Pause</p>
        <div className="relative mt-8 grid place-items-center">
          <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden>
            <circle cx="140" cy="140" r={radius} fill="none" stroke="#2a3d33" strokeWidth="3" />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="#d6f25c"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 140 140)"
            />
          </svg>
          <p className="nums absolute font-display text-7xl italic text-fg" aria-live="polite">
            {formatTimer(clock.remainingMs)}
          </p>
        </div>
        <p className="mt-2 h-6 text-sm text-muted">{hint ? `Als Nächstes  ${hint}` : "Satz geschafft."}</p>
        <div className="mt-8 grid w-full grid-cols-3 gap-2">
          <button type="button" className="min-h-14 rounded-control border border-line" onClick={() => shiftRest(-15)}>
            −15s
          </button>
          <button
            type="button"
            className="min-h-14 rounded-control bg-accent text-ink"
            onClick={() => {
              stopRest();
              onClose();
            }}
          >
            Skip
          </button>
          <button type="button" className="min-h-14 rounded-control border border-line" onClick={() => shiftRest(15)}>
            +15s
          </button>
        </div>
        <button type="button" className="mt-6 min-h-11 text-sm text-muted" onClick={onClose}>
          Zurück zum Satz
        </button>
      </div>
    </div>
  );
}
