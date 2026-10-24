export function parseNum(raw: string): number {
  const n = Number.parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

export function bumpNum(raw: string, delta: number): string {
  const next = Math.max(0, Math.round((parseNum(raw) + delta) * 10) / 10);
  return Number.isInteger(next) ? String(next) : next.toFixed(1);
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);
}

export function formatStamp(ts: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(ts);
}

export function formatClock(ts: number): string {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(ts);
}

export function formatWhen(ts: number, now = Date.now()): string {
  const day = new Date(ts).toDateString();
  if (day === new Date(now).toDateString()) return "heute";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (day === y.toDateString()) return "gestern";
  return formatStamp(ts);
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Noch wach";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export function formatMinutes(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
