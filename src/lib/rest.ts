import { useEffect, useState } from "react";

type RestState = {
  endsAt: number;
  total: number;
  running: boolean;
};

const KEY = "nachtgarten-rest-v1";

let rest: RestState = { endsAt: 0, total: 90, running: false };
let vibrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (rest.running) sessionStorage.setItem(KEY, JSON.stringify(rest));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

export function hydrateRest() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as RestState;
    if (parsed.running && parsed.endsAt > Date.now()) {
      rest = parsed;
      notify();
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
}

export function startRest(seconds: number) {
  const total = Math.max(5, Math.round(seconds));
  vibrated = false;
  rest = { endsAt: Date.now() + total * 1000, total, running: true };
  notify();
}

export function shiftRest(deltaSec: number) {
  if (!rest.running) return;
  const endsAt = rest.endsAt + deltaSec * 1000;
  if (endsAt <= Date.now()) {
    expireRest();
    return;
  }
  rest = { ...rest, endsAt, total: Math.max(5, rest.total + deltaSec) };
  notify();
}

export function stopRest() {
  rest = { endsAt: 0, total: rest.total, running: false };
  notify();
}

function expireRest() {
  if (!rest.running) return;
  rest = { endsAt: 0, total: rest.total, running: false };
  notify();
  if (!vibrated && typeof navigator !== "undefined" && navigator.vibrate) {
    vibrated = true;
    navigator.vibrate([28, 50, 28]);
  }
}

export function useRestClock() {
  const [rev, setRev] = useState(0);

  useEffect(() => {
    const listener = () => setRev((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!rest.running) return;
    const id = window.setInterval(() => {
      if (Date.now() >= rest.endsAt) expireRest();
      setRev((n) => n + 1);
    }, 200);
    return () => window.clearInterval(id);
  }, [rest.running, rest.endsAt]);

  const remainingMs = rest.running ? Math.max(0, rest.endsAt - Date.now()) : 0;
  return {
    running: rest.running && remainingMs > 0,
    remainingMs,
    total: rest.total,
  };
}
