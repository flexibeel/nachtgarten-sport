const DB_NAME = "nachtgarten-sport";
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("exercises")) {
        const ex = db.createObjectStore("exercises", { keyPath: "id", autoIncrement: true });
        ex.createIndex("name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains("plans")) {
        db.createObjectStore("plans", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("sessions")) {
        const s = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function del(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function seedExercises() {
  const existing = await getAll("exercises");
  if (existing.length > 0) return;
  const basics = [
    { name: "Kniebeuge", muscles: ["Beine", "Gesäß"], equipment: "Langhantel" },
    { name: "Bankdrücken", muscles: ["Brust", "Schultern", "Trizeps"], equipment: "Langhantel" },
    { name: "Kreuzheben", muscles: ["Rücken", "Beine"], equipment: "Langhantel" },
    { name: "Schulterdrücken", muscles: ["Schultern", "Trizeps"], equipment: "Langhantel" },
    { name: "Klimmzüge", muscles: ["Rücken", "Bizeps"], equipment: "Körpergewicht" },
    { name: "Rudern", muscles: ["Rücken", "Bizeps"], equipment: "Langhantel" },
    { name: "Beinpresse", muscles: ["Beine"], equipment: "Maschine" },
    { name: "Bizeps Curls", muscles: ["Bizeps"], equipment: "Kurzhantel" },
  ];
  for (const ex of basics) await put("exercises", ex);
}
