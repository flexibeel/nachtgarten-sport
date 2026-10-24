import { useSyncExternalStore } from "react";
import type { Settings } from "@/lib/types";

const KEY = "nachtgarten-settings-v1";

export const defaultSettings: Settings = {
  name: "",
  pro: false,
  restEnabled: true,
  restSeconds: 90,
};

const REST_CHOICES = [60, 90, 120, 180];

function read(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const restSeconds = Number(parsed.restSeconds);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      pro: parsed.pro === true,
      restEnabled: parsed.restEnabled !== false,
      restSeconds: REST_CHOICES.includes(restSeconds) ? restSeconds : 90,
    };
  } catch {
    return defaultSettings;
  }
}

let snapshot: Settings = defaultSettings;
const listeners = new Set<() => void>();

function emit(next: Settings) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function hydrateSettings() {
  const next = read();
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getSettings(): Settings {
  return snapshot;
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...read(), ...patch };
  if (typeof next.name === "string") next.name = next.name.trim();
  localStorage.setItem(KEY, JSON.stringify(next));
  emit(next);
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => snapshot,
    () => defaultSettings,
  );
}
