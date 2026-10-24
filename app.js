import { getAll, put, del, seedExercises } from "./db.js";

let currentView = "home";
let activeSession = null;
let restTimer = null;
let restRemaining = 0;

async function init() {
  await seedExercises();
  renderNav();
  await render();
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = `
    <button data-view="home" class="${currentView === "home" ? "active" : ""}">Home</button>
    <button data-view="plans" class="${currentView === "plans" ? "active" : ""}">Pläne</button>
    <button data-view="history" class="${currentView === "history" ? "active" : ""}">Verlauf</button>
  `;
  nav.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => { currentView = btn.dataset.view; renderNav(); render(); };
  });
}

async function render() {
  const main = document.getElementById("main");
  if (activeSession) return renderLiveSession(main);
  if (currentView === "home") return renderHome(main);
  if (currentView === "plans") return renderPlans(main);
  if (currentView === "history") return renderHistory(main);
}

async function renderHome(main) {
  const plans = await getAll("plans");
  const sessions = await getAll("sessions");
  const recent = sessions.sort((a,b) => b.date - a.date).slice(0, 3);
  main.innerHTML = `
    <div class="card">
      <h2>Schnellstart</h2>
      <button id="startEmpty" style="margin-top:12px;width:100%">Leere Session starten</button>
    </div>
    <div class="card">
      <h2>Deine Pläne</h2>
      ${plans.length === 0 ? '<p class="empty">Noch keine Pläne. Erstelle einen unter „Pläne“.</p>' : 
        plans.map(p => `<button class="secondary" style="width:100%;margin-top:8px" data-start="${p.id}">${p.name} starten</button>`).join("")}
    </div>
    ${recent.length ? `<div class="card"><h2>Letzte Sessions</h2>${recent.map(s => `<p>${new Date(s.date).toLocaleDateString("de-DE")} – ${s.exercises?.length || 0} Übungen</p>`).join("")}</div>` : ""}
  `;
  main.querySelector("#startEmpty").onclick = startEmptySession;
  main.querySelectorAll("[data-start]").forEach(btn => {
    btn.onclick = () => startFromPlan(+btn.dataset.start);
  });
}

async function renderPlans(main) {
  const plans = await getAll("plans");
  const exercises = await getAll("exercises");
  main.innerHTML = `
    <div class="card">
      <h2>Neuen Plan erstellen</h2>
      <input id="planName" placeholder="Plan-Name (z.B. Push)" style="margin:12px 0">
      <button id="createPlan">Plan anlegen</button>
    </div>
    ${plans.map(p => `
      <div class="card" data-plan="${p.id}">
        <h3>${p.name}</h3>
        <ul style="margin:8px 0;padding-left:20px">
          ${(p.exercises || []).map((e, i) => `<li>${exercises.find(x=>x.id===e.exId)?.name || "?"} – ${e.sets} Sätze <button class="danger" style="padding:2px 6px;font-size:0.75rem" data-remove="${p.id}-${i}">×</button></li>`).join("")}
        </ul>
        <div style="display:flex;gap:8px;margin-top:8px">
          <select id="exsel-${p.id}" style="flex:1">
            <option value="">Übung…</option>
            ${exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join("")}
          </select>
          <input id="sets-${p.id}" type="number" value="3" min="1" style="width:60px">
          <button data-add="${p.id}">+</button>
        </div>
        <button class="danger" data-del="${p.id}" style="margin-top:8px">Plan löschen</button>
      </div>
    `).join("")}
  `;

  main.querySelector("#createPlan").onclick = async () => {
    const name = main.querySelector("#planName").value.trim();
    if (!name) return;
    await put("plans", { name, exercises: [] });
    render();
  };

  main.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => { await del("plans", +btn.dataset.del); render(); };
  });

  main.querySelectorAll("[data-add]").forEach(btn => {
    btn.onclick = async () => {
      const pid = +btn.dataset.add;
      const plans = await getAll("plans");
      const plan = plans.find(p => p.id === pid);
      const exId = +main.querySelector(`#exsel-${pid}`).value;
      const sets = +main.querySelector(`#sets-${pid}`).value || 3;
      if (!exId || !plan) return;
      plan.exercises = plan.exercises || [];
      plan.exercises.push({ exId, sets });
      await put("plans", plan);
      render();
    };
  });

  main.querySelectorAll("[data-remove]").forEach(btn => {
    btn.onclick = async () => {
      const [pid, idx] = btn.dataset.remove.split("-").map(Number);
      const plans = await getAll("plans");
      const plan = plans.find(p => p.id === pid);
      if (plan) {
        plan.exercises.splice(idx, 1);
        await put("plans", plan);
        render();
      }
    };
  });
}

async function renderHistory(main) {
  const sessions = await getAll("sessions");
  const exercises = await getAll("exercises");
  sessions.sort((a,b) => b.date - a.date);
  main.innerHTML = sessions.length === 0 
    ? '<p class="empty">Noch keine Sessions.</p>'
    : sessions.map(s => `
      <div class="card">
        <strong>${new Date(s.date).toLocaleString("de-DE")}</strong>
        <ul style="margin-top:8px;padding-left:20px">
          ${(s.exercises || []).map(ex => {
            const name = exercises.find(e => e.id === ex.exId)?.name || "?";
            return `<li>${name}: ${ex.sets.map(set => `${set.weight||0}kg × ${set.reps}`).join(", ")}</li>`;
          }).join("")}
        </ul>
      </div>
    `).join("");
}

async function startEmptySession() {
  activeSession = { planId: null, exercises: [], startedAt: Date.now() };
  render();
}

async function startFromPlan(planId) {
  const plans = await getAll("plans");
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const sessions = await getAll("sessions");
  const lastByEx = {};
  for (const s of sessions.sort((a,b) => b.date - a.date)) {
    for (const ex of s.exercises || []) {
      if (!lastByEx[ex.exId] && ex.sets?.length) {
        const best = ex.sets.reduce((a,b) => (b.weight||0) > (a.weight||0) ? b : a, ex.sets[0]);
        lastByEx[ex.exId] = best;
      }
    }
  }

  activeSession = {
    planId,
    exercises: (plan.exercises || []).map(e => {
      const last = lastByEx[e.exId] || {};
      return {
        exId: e.exId,
        targetSets: e.sets,
        sets: Array.from({ length: e.sets }, () => ({
          weight: last.weight || "",
          reps: last.reps || "",
          done: false
        }))
      };
    }),
    startedAt: Date.now()
  };
  render();
}

async function renderLiveSession(main) {
  const exercises = await getAll("exercises");
  main.innerHTML = `
    <div class="card">
      <h2>Aktive Session</h2>
      <div id="timer" class="timer">${formatTime(restRemaining)}</div>
      <button id="skipRest" class="secondary" style="width:100%">Timer überspringen</button>
    </div>
    ${activeSession.exercises.map((ex, i) => {
      const name = exercises.find(e => e.id === ex.exId)?.name || "Übung";
      return `
        <div class="card">
          <h3>${name}</h3>
          ${ex.sets.map((set, si) => `
            <div class="set-row">
              <span>${si+1}</span>
              <input type="number" step="0.5" placeholder="kg" value="${set.weight}" data-ex="${i}" data-set="${si}" data-field="weight">
              <input type="number" placeholder="Wdh" value="${set.reps}" data-ex="${i}" data-set="${si}" data-field="reps">
              <button class="${set.done ? "success" : ""}" data-done="${i}-${si}">${set.done ? "✓" : "OK"}</button>
            </div>
          `).join("")}
          <button class="secondary" data-addset="${i}" style="margin-top:8px">+ Satz</button>
        </div>
      `;
    }).join("")}
    <div class="card">
      <select id="addEx">
        <option value="">Übung hinzufügen…</option>
        ${exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join("")}
      </select>
      <button id="addExBtn" style="margin-top:8px;width:100%">Hinzufügen</button>
    </div>
    <button id="finish" class="success" style="width:100%;margin-top:8px">Session beenden</button>
    <button id="cancel" class="danger" style="width:100%;margin-top:8px">Abbrechen</button>
  `;

  main.querySelectorAll("input").forEach(inp => {
    inp.onchange = () => {
      const ex = +inp.dataset.ex, set = +inp.dataset.set, field = inp.dataset.field;
      activeSession.exercises[ex].sets[set][field] = inp.value;
    };
  });

  main.querySelectorAll("[data-done]").forEach(btn => {
    btn.onclick = () => {
      const [ex, set] = btn.dataset.done.split("-").map(Number);
      const s = activeSession.exercises[ex].sets[set];
      s.done = !s.done;
      if (s.done) startRest(90);
      renderLiveSession(main);
    };
  });

  main.querySelectorAll("[data-addset]").forEach(btn => {
    btn.onclick = () => {
      activeSession.exercises[+btn.dataset.addset].sets.push({ weight: "", reps: "", done: false });
      renderLiveSession(main);
    };
  });

  main.querySelector("#addExBtn").onclick = () => {
    const id = +main.querySelector("#addEx").value;
    if (!id) return;
    activeSession.exercises.push({ exId: id, sets: [{ weight: "", reps: "", done: false }] });
    renderLiveSession(main);
  };

  main.querySelector("#finish").onclick = finishSession;
  main.querySelector("#cancel").onclick = () => { activeSession = null; stopRest(); render(); };
  main.querySelector("#skipRest").onclick = () => { stopRest(); renderLiveSession(main); };
}

function startRest(seconds) {
  stopRest();
  restRemaining = seconds;
  restTimer = setInterval(() => {
    restRemaining--;
    const el = document.getElementById("timer");
    if (el) el.textContent = formatTime(restRemaining);
    if (restRemaining <= 0) {
      stopRest();
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }, 1000);
}

function stopRest() {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  restRemaining = 0;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

async function finishSession() {
  if (!activeSession) return;
  const session = {
    date: Date.now(),
    planId: activeSession.planId,
    exercises: activeSession.exercises.map(ex => ({
      exId: ex.exId,
      sets: ex.sets.filter(s => s.done || s.weight || s.reps).map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0
      }))
    })).filter(ex => ex.sets.length > 0)
  };
  await put("sessions", session);
  activeSession = null;
  stopRest();
  currentView = "history";
  renderNav();
  render();
}

init();
