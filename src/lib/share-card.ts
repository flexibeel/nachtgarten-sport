import { formatClock, formatElapsed, formatNum, formatStamp } from "@/lib/format";
import { e1rm, volumeOf } from "@/lib/stats";
import type { CardDesign, LoggedSet, SharePayload } from "@/lib/types";

const W = 1080;
const H = 1440;

type Ctx = CanvasRenderingContext2D;

function traceRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillTracked(ctx: Ctx, text: string, x: number, y: number, tracking: number) {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
}

function ellipsize(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > max) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function wrap(ctx: Ctx, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function rule(ctx: Ctx, y: number) {
  ctx.save();
  ctx.strokeStyle = "#2a3d33";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, y);
  ctx.lineTo(1000, y);
  ctx.stroke();
  ctx.restore();
}

export function bestLabel(sets: LoggedSet[]): string {
  if (sets.length === 0) return "—";
  let best = sets[0]!;
  let score = e1rm(best.weight, best.reps);
  for (const set of sets) {
    const next = e1rm(set.weight, set.reps);
    if (next > score) {
      best = set;
      score = next;
    }
  }
  return `${formatNum(best.weight)} × ${best.reps}`;
}

function night(ctx: Ctx) {
  ctx.fillStyle = "#07110c";
  ctx.fillRect(0, 0, W, H);
}

function drawGarten(ctx: Ctx, data: SharePayload) {
  night(ctx);
  ctx.strokeStyle = "#d6f25c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(940, 150, 190, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(150, 1310, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 26px Outfit";
  ctx.textAlign = "left";
  fillTracked(ctx, "NACHTGARTEN", 80, 120, 7);

  ctx.fillStyle = "#93a399";
  ctx.font = "500 24px Outfit";
  ctx.textAlign = "right";
  ctx.fillText(formatStamp(data.when).toUpperCase(), 1000, 120);
  ctx.textAlign = "left";

  ctx.fillStyle = "#f4f1e8";
  ctx.font = "italic 600 84px Fraunces";
  const title = data.planName || "Freies Training";
  const lines = wrap(ctx, title, 900).slice(0, 2);
  let y = 250;
  for (const line of lines) {
    ctx.fillText(line, 80, y);
    y += 92;
  }

  ctx.font = "500 30px Outfit";
  ctx.fillStyle = "#93a399";
  ctx.fillText(`${data.athlete}   ·   ${formatElapsed(data.durationSec * 1000)}`, 80, y + 16);
  y += 78;
  rule(ctx, y);

  y += 110;
  const stats: [string, string][] = [
    [String(data.exercises.length), "Übungen"],
    [String(data.setCount), "Sätze"],
    [formatNum(data.volume), "Kilogramm"],
  ];
  stats.forEach(([value, label], index) => {
    const x = 80 + index * 320;
    ctx.fillStyle = "#f4f1e8";
    ctx.font = "600 68px Outfit";
    ctx.fillText(value, x, y);
    ctx.fillStyle = "#93a399";
    ctx.font = "500 22px Outfit";
    ctx.fillText(label.toUpperCase(), x, y + 40);
  });

  y += 120;
  for (const exercise of data.exercises.slice(0, 7)) {
    if (y > 1260) break;
    const nameX = exercise.pr ? 108 : 80;
    if (exercise.pr) {
      ctx.fillStyle = "#d6f25c";
      ctx.beginPath();
      ctx.arc(88, y - 10, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f4f1e8";
    ctx.font = "600 32px Outfit";
    ctx.textAlign = "left";
    ctx.fillText(ellipsize(ctx, exercise.name, 560), nameX, y);
    ctx.fillStyle = "#d6f25c";
    ctx.font = "600 30px Outfit";
    ctx.textAlign = "right";
    ctx.fillText(bestLabel(exercise.sets), 1000, y);
    ctx.textAlign = "left";
    y += 72;
  }

  ctx.fillStyle = "#93a399";
  ctx.font = "500 22px Outfit";
  ctx.fillText("Alles bleibt bei dir.", 80, 1360);
  ctx.textAlign = "right";
  ctx.fillStyle = "#d6f25c";
  ctx.fillText("Nachtgarten Sport", 1000, 1360);
  ctx.textAlign = "left";
}

function drawProtokoll(ctx: Ctx, data: SharePayload) {
  ctx.fillStyle = "#0c1612";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 24px Outfit";
  ctx.textAlign = "left";
  fillTracked(ctx, "NACHTGARTEN", 80, 110, 6);

  ctx.fillStyle = "#f4f1e8";
  ctx.font = "italic 600 78px Fraunces";
  ctx.fillText("Protokoll", 80, 210);
  ctx.font = "500 26px Outfit";
  ctx.fillStyle = "#93a399";
  ctx.fillText(`${data.athlete}    ${formatStamp(data.when)}    ${formatClock(data.when)}`, 80, 268);
  if (data.planName) ctx.fillText(data.planName, 80, 308);
  rule(ctx, data.planName ? 348 : 318);

  let y = data.planName ? 410 : 380;
  const summaryOnly = data.exercises.reduce((sum, ex) => sum + ex.sets.length + 1, 0) > 16;
  for (const exercise of data.exercises) {
    if (y > 1160) break;
    ctx.fillStyle = "#f4f1e8";
    ctx.font = "600 30px Outfit";
    ctx.textAlign = "left";
    ctx.fillText(ellipsize(ctx, exercise.name, summaryOnly ? 620 : 900), 80, y);
    if (summaryOnly) {
      ctx.fillStyle = exercise.pr ? "#d6f25c" : "#93a399";
      ctx.font = "500 26px Outfit";
      ctx.textAlign = "right";
      ctx.fillText(ellipsize(ctx, setsInline(exercise.sets), 360), 1000, y);
      ctx.textAlign = "left";
      y += 58;
      continue;
    }
    y += 42;
    exercise.sets.slice(0, 6).forEach((set, index) => {
      if (y > 1160) return;
      ctx.font = "500 24px Outfit";
      ctx.fillStyle = "#93a399";
      ctx.fillText(String(index + 1).padStart(2, "0"), 80, y);
      ctx.fillStyle = "#f4f1e8";
      ctx.fillText(`${formatNum(set.weight)} kg`, 180, y);
      ctx.textAlign = "right";
      ctx.fillText(String(set.reps), 1000, y);
      ctx.textAlign = "left";
      y += 36;
    });
    y += 22;
  }

  rule(ctx, 1228);
  ctx.font = "600 28px Outfit";
  ctx.fillStyle = "#93a399";
  ctx.fillText("SÄTZE", 80, 1290);
  ctx.fillText("VOLUMEN", 80, 1350);
  ctx.fillStyle = "#f4f1e8";
  ctx.textAlign = "right";
  ctx.fillText(String(data.setCount), 1000, 1290);
  ctx.fillText(`${formatNum(data.volume)} kg`, 1000, 1350);
  ctx.textAlign = "left";
}

function setsInline(sets: LoggedSet[]): string {
  return sets.map((set) => `${formatNum(set.weight)}×${set.reps}`).join("  ");
}

function drawMond(ctx: Ctx, data: SharePayload) {
  night(ctx);
  ctx.strokeStyle = "#d6f25c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(540, 250, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#07110c";
  ctx.beginPath();
  ctx.arc(640, 210, 112, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 22px Outfit";
  fillTracked(ctx, "NACHTGARTEN", 80, 500, 6);

  ctx.fillStyle = "#f4f1e8";
  ctx.font = "italic 600 72px Fraunces";
  ctx.fillText(ellipsize(ctx, data.athlete, 900), 80, 590);

  ctx.font = "600 96px Outfit";
  ctx.fillText(formatElapsed(data.durationSec * 1000), 80, 710);
  ctx.font = "500 24px Outfit";
  ctx.fillStyle = "#93a399";
  ctx.fillText(data.planName || "Freies Training", 80, 760);

  const rows = data.prs.length
    ? data.prs.map((pr) => ({ name: pr.name, value: pr.label, accent: true }))
    : data.exercises.slice(0, 6).map((exercise) => ({
        name: exercise.name,
        value: bestLabel(exercise.sets),
        accent: false,
      }));

  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 20px Outfit";
  ctx.fillText(data.prs.length ? "REKORDE" : "BESTE SÄTZE", 80, 860);

  let y = 930;
  for (const row of rows.slice(0, 6)) {
    ctx.font = "500 32px Outfit";
    ctx.fillStyle = "#f4f1e8";
    ctx.textAlign = "left";
    ctx.fillText(ellipsize(ctx, row.name, 640), 80, y);
    ctx.textAlign = "right";
    ctx.fillStyle = row.accent ? "#d6f25c" : "#93a399";
    ctx.fillText(row.value, 1000, y);
    ctx.textAlign = "left";
    y += 64;
  }

  ctx.fillStyle = "#93a399";
  ctx.font = "500 22px Outfit";
  ctx.fillText("Nachtgarten Sport", 80, 1360);
}

function drawLabor(ctx: Ctx, data: SharePayload) {
  night(ctx);
  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 24px Outfit";
  ctx.textAlign = "left";
  fillTracked(ctx, "LABOR", 80, 110, 8);

  ctx.fillStyle = "#f4f1e8";
  ctx.font = "italic 600 64px Fraunces";
  ctx.fillText(ellipsize(ctx, data.planName || "Training", 900), 80, 200);
  ctx.font = "500 26px Outfit";
  ctx.fillStyle = "#93a399";
  ctx.fillText(`${data.athlete}   ·   ${formatStamp(data.when)}`, 80, 252);

  const minutes = Math.max(1 / 60, data.durationSec / 60);
  const density = data.setCount / minutes;
  const tiles: [string, string][] = [
    [formatElapsed(data.durationSec * 1000), "Dauer"],
    [String(data.setCount), "Sätze"],
    [formatNum(data.volume), "kg Volumen"],
    [formatNum(Math.round(density * 10) / 10), "Sätze / min"],
  ];
  tiles.forEach(([value, label], index) => {
    const x = 80 + (index % 2) * 470;
    const y = 310 + Math.floor(index / 2) * 168;
    traceRound(ctx, x, y, 430, 142, 28);
    ctx.fillStyle = "#101c16";
    ctx.fill();
    ctx.strokeStyle = "#2a3d33";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f4f1e8";
    ctx.font = "600 48px Outfit";
    ctx.fillText(value, x + 28, y + 78);
    ctx.fillStyle = "#93a399";
    ctx.font = "500 20px Outfit";
    ctx.fillText(label.toUpperCase(), x + 28, y + 114);
  });

  const ranked = [...data.exercises].sort((a, b) => b.e1rm - a.e1rm);
  const top = ranked[0];
  ctx.fillStyle = "#d6f25c";
  ctx.font = "600 20px Outfit";
  ctx.fillText(top && top.e1rm > 0 ? `SPITZE   ${top.name.toUpperCase()}   ${formatNum(top.e1rm)}` : "VOLUMEN", 80, 690);

  const maxVolume = Math.max(1, ...data.exercises.map((exercise) => volumeOf(exercise.sets)));
  let y = 730;
  for (const exercise of data.exercises.slice(0, 7)) {
    const volume = volumeOf(exercise.sets);
    ctx.fillStyle = "#f4f1e8";
    ctx.font = "500 26px Outfit";
    ctx.textAlign = "left";
    ctx.fillText(ellipsize(ctx, exercise.name, 620), 80, y + 24);
    ctx.textAlign = "right";
    ctx.fillStyle = exercise.pr ? "#d6f25c" : "#93a399";
    ctx.fillText(`${formatNum(volume)} kg`, 1000, y + 24);
    ctx.textAlign = "left";
    traceRound(ctx, 80, y + 40, 920, 12, 6);
    ctx.fillStyle = "#17261e";
    ctx.fill();
    const width = Math.max(16, (920 * volume) / maxVolume);
    traceRound(ctx, 80, y + 40, width, 12, 6);
    ctx.fillStyle = "#d6f25c";
    ctx.fill();
    y += 86;
  }

  ctx.fillStyle = "#93a399";
  ctx.font = "500 22px Outfit";
  ctx.fillText("Nachtgarten Sport   ·   Pro", 80, 1360);
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load("italic 600 84px Fraunces"),
    document.fonts.load("600 68px Outfit"),
    document.fonts.load("500 30px Outfit"),
    document.fonts.ready,
  ]);
}

export async function paintCard(design: CardDesign, data: SharePayload): Promise<string> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Karte konnte nicht gezeichnet werden");
  if (design === "protokoll") drawProtokoll(ctx, data);
  else if (design === "mond") drawMond(ctx, data);
  else if (design === "labor") drawLabor(ctx, data);
  else drawGarten(ctx, data);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
