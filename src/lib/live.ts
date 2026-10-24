import type { LiveSession } from "@/lib/types";

const KEY = "nachtgarten-live-v1";

export function loadLive(): LiveSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    if (!parsed || !Array.isArray(parsed.exercises) || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLive(session: LiveSession | null) {
  if (typeof sessionStorage === "undefined") return;
  if (!session) sessionStorage.removeItem(KEY);
  else sessionStorage.setItem(KEY, JSON.stringify(session));
}
