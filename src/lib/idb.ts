import { CATALOG } from "@/lib/catalog";
import type { Exercise, Plan, Session, Settings } from "@/lib/types";

const DB_NAME = "nachtgarten-sport";
const DB_VERSION = 1;

export type StoreName = "exercises" | "plans" | "sessions";

export type Backup = {
  version: 1;
  exportedAt: number;
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
  settings?: Settings;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Speicherfehler"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Speicher abgebrochen"));
    tx.onerror = () => reject(tx.error ?? new Error("Speicherfehler"));
  });
}

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Speicher ist hier nicht verfügbar"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("exercises")) {
          db.createObjectStore("exercises", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("plans")) {
          db.createObjectStore("plans", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Datenbank konnte nicht geöffnet werden"));
      };
    });
  }
  return dbPromise;
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const done = txDone(tx);
  const rows = await requestToPromise(tx.objectStore(storeName).getAll());
  await done;
  return rows as T[];
}

export async function put<T>(storeName: StoreName, item: T): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const done = txDone(tx);
  const key = await requestToPromise(tx.objectStore(storeName).put(item));
  await done;
  return Number(key);
}

export async function del(storeName: StoreName, id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const done = txDone(tx);
  tx.objectStore(storeName).delete(id);
  await done;
}

let seeding: Promise<void> | null = null;

async function dedupeExercises() {
  const all = await getAll<Exercise>("exercises");
  const seen = new Set<string>();
  for (const exercise of all) {
    const key = exercise.name.toLocaleLowerCase("de");
    if (seen.has(key)) {
      if (typeof exercise.id === "number") await del("exercises", exercise.id);
    } else {
      seen.add(key);
    }
  }
}

export function seedIfEmpty(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const existing = await getAll<Exercise>("exercises");
      if (existing.length === 0) {
        for (const exercise of CATALOG) await put("exercises", exercise);
      }
      await dedupeExercises();
    })().catch((error) => {
      seeding = null;
      throw error;
    });
  }
  return seeding;
}

export async function clearPlansAndSessions(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(["plans", "sessions"], "readwrite");
  const done = txDone(tx);
  tx.objectStore("plans").clear();
  tx.objectStore("sessions").clear();
  await done;
}

export async function replaceAll(backup: Backup): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(["exercises", "plans", "sessions"], "readwrite");
  const done = txDone(tx);
  tx.objectStore("exercises").clear();
  tx.objectStore("plans").clear();
  tx.objectStore("sessions").clear();
  for (const item of backup.exercises) tx.objectStore("exercises").put(withoutEmptyId(item));
  for (const item of backup.plans) tx.objectStore("plans").put(withoutEmptyId(item));
  for (const item of backup.sessions) tx.objectStore("sessions").put(withoutEmptyId(item));
  await done;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function withoutEmptyId<T extends { id?: number }>(item: T): T {
  if (typeof item.id === "number") return item;
  const copy = { ...item };
  delete copy.id;
  return copy;
}

export function parseBackup(raw: unknown): Backup {
  if (!isRecord(raw)) throw new Error("Diese Datei ist keine Nachtgarten-Sicherung.");
  if (!Array.isArray(raw.exercises) || !Array.isArray(raw.plans) || !Array.isArray(raw.sessions)) {
    throw new Error("Diese Datei ist keine Nachtgarten-Sicherung.");
  }
  if (raw.exercises.length > 500 || raw.sessions.length > 5000) {
    throw new Error("Die Sicherung ist zu groß.");
  }
  const exercises = raw.exercises.filter(isRecord).map((item) => ({
    id: typeof item.id === "number" ? item.id : undefined,
    name: typeof item.name === "string" ? item.name.slice(0, 80) : "Übung",
    muscles: Array.isArray(item.muscles) ? item.muscles.filter((m) => typeof m === "string").slice(0, 6) : [],
    equipment: typeof item.equipment === "string" ? item.equipment.slice(0, 40) : "Körpergewicht",
    image: typeof item.image === "string" ? item.image : "/exercises/squat.jpg",
    custom: item.custom === true,
  }));
  const plans = raw.plans.filter(isRecord).map((item) => ({
    id: typeof item.id === "number" ? item.id : undefined,
    name: typeof item.name === "string" ? item.name.slice(0, 60) : "Plan",
    exercises: Array.isArray(item.exercises)
      ? item.exercises.filter(isRecord).map((entry) => ({
          exId: Number(entry.exId) || 0,
          sets: Math.max(1, Math.min(20, Number(entry.sets) || 3)),
        }))
      : [],
  }));
  const sessions = raw.sessions.filter(isRecord).map((item) => ({
    id: typeof item.id === "number" ? item.id : undefined,
    date: typeof item.date === "number" ? item.date : Date.now(),
    planId: typeof item.planId === "number" ? item.planId : null,
    planName: typeof item.planName === "string" ? item.planName : null,
    durationSec: typeof item.durationSec === "number" ? item.durationSec : 0,
    exercises: Array.isArray(item.exercises)
      ? item.exercises.filter(isRecord).map((ex) => ({
          exId: Number(ex.exId) || 0,
          name: typeof ex.name === "string" ? ex.name : "Übung",
          sets: Array.isArray(ex.sets)
            ? ex.sets.filter(isRecord).map((set) => ({
                weight: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                ...(set.warm === true ? { warm: true } : {}),
              }))
            : [],
        }))
      : [],
  }));
  return {
    version: 1,
    exportedAt: typeof raw.exportedAt === "number" ? raw.exportedAt : Date.now(),
    exercises,
    plans,
    sessions,
    settings: isRecord(raw.settings)
      ? {
          name: typeof raw.settings.name === "string" ? raw.settings.name : "",
          pro: raw.settings.pro === true,
          restEnabled: raw.settings.restEnabled !== false,
          restSeconds: Number(raw.settings.restSeconds) || 90,
        }
      : undefined,
  };
}
