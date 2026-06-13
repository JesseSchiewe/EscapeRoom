const state = {
  scenarios: [],
  activeScenarioId: null,
  activePayload: null,
  timer: { interval: null, limitSeconds: 0, startedAt: null, expired: false },
};

const scenarioListEl = document.getElementById("scenario-list");
const gameAreaEl = document.getElementById("game-area");
const titleEl = document.getElementById("scenario-title");
const descriptionEl = document.getElementById("scenario-description");
const progressFillEl = document.getElementById("progress-fill");
const progressTextEl = document.getElementById("progress-text");
const completionBannerEl = document.getElementById("completion-banner");
const locksListEl = document.getElementById("locks-list");
const clueListEl = document.getElementById("clue-list");
const historyListEl = document.getElementById("history-list");
const toastEl = document.getElementById("toast");
const timerWrapEl = document.getElementById("timer-wrap");
const timerDisplayEl = document.getElementById("timer-display");
const scorePanelEl = document.getElementById("score-panel");
const scBaseEl = document.getElementById("sc-base");
const scAttemptsEl = document.getElementById("sc-attempts");
const scHintsEl = document.getElementById("sc-hints");
const scTimeBonusEl = document.getElementById("sc-time-bonus");
const scTotalEl = document.getElementById("sc-total");
const playerNameInputEl = document.getElementById("player-name-input");
const submitScoreBtnEl = document.getElementById("submit-score-btn");
const submitFeedbackEl = document.getElementById("submit-feedback");
const leaderboardBodyEl = document.getElementById("leaderboard-body");
const leaderboardEmptyEl = document.getElementById("leaderboard-empty");
const scenariosSectionEl = document.querySelector(".scenarios");
const homeBtnEl = document.getElementById("home-btn");

homeBtnEl.addEventListener("click", goHome);

init();

async function init() {
  try {
    const response = await fetch("/api/scenarios");
    const data = await response.json();
    state.scenarios = data.scenarios || [];
    renderScenarioList();
  } catch (_err) {
    showToast("Unable to load scenarios.", "error");
  }
}

function renderScenarioList() {
  if (state.scenarios.length === 0) {
    scenarioListEl.innerHTML = "<p>No scenarios available.</p>";
    return;
  }

  scenarioListEl.innerHTML = "";

  state.scenarios.forEach((scenario) => {
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.innerHTML = `
      <h3>${escapeHtml(scenario.title)}</h3>
      <p>${escapeHtml(scenario.description)}</p>
      <p class="meta">Difficulty: ${escapeHtml(scenario.difficulty)} | Locks: ${scenario.total_locks}</p>
      <button class="select-btn" data-scenario-id="${scenario.id}">Play This Scenario</button>
    `;
    scenarioListEl.appendChild(card);
  });

  scenarioListEl.querySelectorAll(".select-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      const scenarioId = target.dataset.scenarioId;
      if (!scenarioId) {
        return;
      }

      await startScenario(scenarioId);
    });
  });
}

async function startScenario(scenarioId) {
  stopTimer();
  scorePanelEl.classList.add("hidden");
  try {
    const response = await fetch(`/api/scenarios/${scenarioId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to start scenario.");
    }

    state.activeScenarioId = scenarioId;
    state.activePayload = payload;
    scenariosSectionEl.classList.add("hidden");
    homeBtnEl.classList.remove("hidden");
    renderGame();
    showToast(`Scenario started: ${payload.scenario.title}`, "ok");
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to start scenario.", "error");
  }
}

function goHome() {
  stopTimer();
  state.activeScenarioId = null;
  state.activePayload = null;
  state.timer.expired = false;
  gameAreaEl.classList.add("hidden");
  scorePanelEl.classList.add("hidden");
  homeBtnEl.classList.add("hidden");
  scenariosSectionEl.classList.remove("hidden");
}

function renderGame() {
  const payload = state.activePayload;
  if (!payload) {
    gameAreaEl.classList.add("hidden");
    stopTimer();
    return;
  }

  const scenario = payload.scenario;
  const progress = payload.state;

  titleEl.textContent = scenario.title;
  descriptionEl.textContent = scenario.description;
  progressFillEl.style.width = `${progress.progress_pct}%`;
  progressTextEl.textContent = `${progress.progress_pct}% complete (${progress.unlocked_count}/${scenario.total_locks} locks unlocked)`;
  completionBannerEl.classList.toggle("hidden", !progress.completed);

  if (!state.timer.interval && !progress.completed && !state.timer.expired) {
    startTimer(progress.started_at, scenario.time_limit_seconds);
  }

  if (progress.completed) {
    stopTimer();
    timerWrapEl.classList.add("hidden");
    if (progress.score) {
      renderScorePanel(progress.score, state.activeScenarioId);
    }
  }

  renderLocks(progress);
  renderClues(progress.clues);
  renderHistory(progress.unlocked_history);
  gameAreaEl.classList.remove("hidden");
}

function renderLocks(progressState) {
  locksListEl.innerHTML = "";

  const activeLockIds = new Set(progressState.active_lock_ids || []);

  progressState.locks.forEach((lock) => {
    if (lock.status === "locked" && !activeLockIds.has(lock.id)) {
      return;
    }

    const card = document.createElement("article");
    const isCurrent = activeLockIds.has(lock.id);

    card.className = `lock-card ${lock.status} ${isCurrent ? "current" : ""}`.trim();

    const codeInfo = lock.successful_code
      ? `<p class="meta">Unlocked with code ${escapeHtml(lock.successful_code)}</p>`
      : "";

    const groupInfo = lock.group_name
      ? `<p class="meta">Stage: ${escapeHtml(lock.group_name)}</p>`
      : "";

    const unlockTime = lock.unlocked_at
      ? `<span class="entry-time">Unlocked: ${formatTime(lock.unlocked_at)}</span>`
      : "";

    const imageHtml = lock.image_url
      ? `<img src="${lock.image_url}" alt="Puzzle image for ${escapeHtml(lock.name)}" class="lock-image" />`
      : "";

    card.innerHTML = `
      <h3>${escapeHtml(lock.name)}</h3>
      <p>${escapeHtml(lock.prompt)}</p>
      ${imageHtml}
      <span class="status-pill ${lock.status}">${lock.status.toUpperCase()}</span>
      ${groupInfo}
      <p class="meta">Attempts: ${lock.attempts}</p>
      ${codeInfo}
      ${unlockTime}
    `;

    if (lock.sounds && Array.isArray(lock.sounds)) {
      const soundBtn = document.createElement("button");
      soundBtn.className = "sound-btn";
      soundBtn.type = "button";
      soundBtn.textContent = "\u266a Play Clue";
      soundBtn.setAttribute("aria-label", "Play musical clue");
      soundBtn.addEventListener("click", () => playNotes(lock.sounds));
      card.appendChild(soundBtn);
    }

    if (isCurrent && lock.status === "locked") {
      const isExpired = state.timer.expired;
      const placeholder = isExpired ? "Time expired" : `Enter ${lock.input_length}-digit code`;
      const disabledAttr = isExpired ? "disabled" : "";
      const formRow = document.createElement("div");
      formRow.className = "form-row";
      formRow.innerHTML = `
        <input
          class="code-input"
          type="text"
          maxlength="${lock.input_length}"
          placeholder="${placeholder}"
          aria-label="Code for ${escapeHtml(lock.name)}"
          ${disabledAttr}
        />
        <button class="unlock-btn" ${disabledAttr}>Unlock</button>
      `;
      card.appendChild(formRow);

      if (!isExpired) {
        const input = formRow.querySelector("input");
        const button = formRow.querySelector("button");

        if (input && button) {
          const submit = async () => {
            const code = input.value.trim();
            if (!code) {
              showToast("Enter a code first.", "error");
              return;
            }

            if (code.length !== lock.input_length) {
              showToast(`This lock expects ${lock.input_length} characters.`, "error");
              return;
            }

            await submitUnlock(lock.id, code);
          };

          button.addEventListener("click", submit);
          input.addEventListener("keydown", async (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              await submit();
            }
          });
        }
      }
    }

    locksListEl.appendChild(card);
  });
}

function renderClues(clues) {
  clueListEl.innerHTML = "";
  if (!Array.isArray(clues) || clues.length === 0) {
    clueListEl.innerHTML = "<li>No clues yet. Incorrect attempts may reveal hints.</li>";
    return;
  }

  clues.forEach((clue) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${escapeHtml(clue.source)}</strong>
      <p>${escapeHtml(clue.text)}</p>
      <span class="entry-time">Revealed: ${formatTime(clue.revealed_at)}</span>
    `;
    clueListEl.appendChild(item);
  });
}

function renderHistory(history) {
  historyListEl.innerHTML = "";
  if (!Array.isArray(history) || history.length === 0) {
    historyListEl.innerHTML = "<li>No locks unlocked yet.</li>";
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${escapeHtml(entry.lock_name)}</strong>
      <p>Successful code: ${escapeHtml(entry.code)}</p>
      <p>${escapeHtml(entry.message)}</p>
      <span class="entry-time">Unlocked: ${formatTime(entry.unlocked_at)}</span>
    `;
    historyListEl.appendChild(item);
  });
}

async function submitUnlock(lockId, code) {
  if (!state.activeScenarioId) {
    return;
  }

  try {
    const response = await fetch(`/api/scenarios/${state.activeScenarioId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lock_id: lockId, code }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to process code.");
    }

    state.activePayload = payload.state ? payload.state : payload;
    renderGame();

    if (payload.success) {
      showToast(payload.message || "Lock unlocked.", "ok");
    } else {
      showToast(payload.message || "Incorrect code.", "error");
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to process code.", "error");
  }
}

function showToast(message, type) {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2800);
}

showToast.timeoutId = 0;

// ── Piano Sound ──────────────────────────────────────────────────────────────────

const NOTE_FREQ = {
  A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00,
};

let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function playNotes(notes, noteDuration = 0.52) {
  const ctx = getAudioCtx();
  notes.forEach((note, i) => {
    const freq = NOTE_FREQ[note];
    if (!freq) return;
    const t = ctx.currentTime + i * noteDuration;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.008);      // attack
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.15);  // decay
    gain.gain.setValueAtTime(0.12, t + noteDuration - 0.06); // sustain
    gain.gain.linearRampToValueAtTime(0, t + noteDuration + 0.06); // release
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteDuration + 0.1);
  });
}

// ── Timer ──────────────────────────────────────────────────────────────────

function startTimer(startedAt, limitSeconds) {
  stopTimer();
  state.timer.limitSeconds = limitSeconds || 1800;
  state.timer.startedAt = new Date(startedAt);
  state.timer.expired = false;
  timerWrapEl.classList.remove("hidden");

  function tick() {
    const elapsed = (Date.now() - state.timer.startedAt.getTime()) / 1000;
    const remaining = Math.max(0, state.timer.limitSeconds - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    timerDisplayEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    timerDisplayEl.classList.toggle("urgent", remaining <= 300 && remaining > 60);
    timerDisplayEl.classList.toggle("critical", remaining <= 60);
    if (remaining <= 0) {
      handleTimeExpired();
    }
  }

  tick();
  state.timer.interval = setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timer.interval) {
    clearInterval(state.timer.interval);
    state.timer.interval = null;
  }
}

function handleTimeExpired() {
  stopTimer();
  state.timer.expired = true;
  timerDisplayEl.textContent = "00:00";
  timerDisplayEl.classList.remove("urgent");
  timerDisplayEl.classList.add("critical");
  if (state.activePayload) {
    renderLocks(state.activePayload.state);
  }
  showToast("Time's up! You didn't escape in time.", "error");
}

// ── Score & Leaderboard ────────────────────────────────────────────────────

function renderScorePanel(score, scenarioId) {
  scBaseEl.textContent = score.base_score;
  scAttemptsEl.textContent = `-${score.attempts_penalty}`;
  scHintsEl.textContent = `-${score.hints_penalty}`;
  scTimeBonusEl.textContent = `+${score.time_bonus}`;
  scTotalEl.textContent = score.final_score;
  scorePanelEl.classList.remove("hidden");
  submitFeedbackEl.classList.add("hidden");
  submitScoreBtnEl.disabled = false;
  playerNameInputEl.disabled = false;
  playerNameInputEl.value = "";

  submitScoreBtnEl.onclick = async () => {
    const name = playerNameInputEl.value.trim();
    if (!name) {
      showToast("Enter your name first.", "error");
      return;
    }
    await submitLeaderboard(scenarioId, name);
  };

  fetchLeaderboard(scenarioId);
}

async function submitLeaderboard(scenarioId, name) {
  try {
    const response = await fetch(`/api/scenarios/${scenarioId}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not submit score.");
    }
    submitFeedbackEl.textContent = "Score submitted!";
    submitFeedbackEl.classList.remove("hidden");
    submitScoreBtnEl.disabled = true;
    playerNameInputEl.disabled = true;
    renderLeaderboard(data.leaderboard);
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Could not submit score.", "error");
  }
}

async function fetchLeaderboard(scenarioId) {
  try {
    const response = await fetch(`/api/scenarios/${scenarioId}/leaderboard`);
    const data = await response.json();
    if (response.ok) {
      renderLeaderboard(data.leaderboard || []);
    }
  } catch (_err) {
    // leaderboard is a bonus feature; ignore fetch errors
  }
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    leaderboardBodyEl.innerHTML = "";
    leaderboardEmptyEl.classList.remove("hidden");
    return;
  }
  leaderboardEmptyEl.classList.add("hidden");
  leaderboardBodyEl.innerHTML = entries
    .map(
      (entry) =>
        `<tr>
          <td>${entry.rank}</td>
          <td>${escapeHtml(entry.name)}</td>
          <td>${entry.score}</td>
          <td>${formatDuration(entry.elapsed_seconds)}</td>
        </tr>`
    )
    .join("");
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    return iso;
  }
  return date.toLocaleString();
}

function formatDuration(seconds) {
  if (typeof seconds !== "number") {
    return "-";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
