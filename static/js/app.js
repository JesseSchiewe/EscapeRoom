const state = {
  scenarios: [],
  activeScenarioId: null,
  activePayload: null,
  lastUnlockedCount: null,
  lastVisibleClueIds: [],
  adminMode: false,
  timer: { interval: null, limitSeconds: 0, startedAt: null, expired: false },
  refreshInterval: null,
  isTypingCode: false,
  isTypingLeaderboardName: false,
  lastActiveLockIds: [],
  hasAutoScrolledScorePanel: false,
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
const adminBtnEl = document.getElementById("admin-btn");
const soundEnableBtnEl = document.getElementById("sound-enable-btn");
const layoutRootEl = document.getElementById("layout-root");
const scenarioLeaderboardPanelEl = document.getElementById("scenario-leaderboard-panel");
const scenarioLeaderboardTitleEl = document.getElementById("scenario-leaderboard-title");
const scenarioLeaderboardSubtitleEl = document.getElementById("scenario-leaderboard-subtitle");
const scenarioLeaderboardCloseBtnEl = document.getElementById("scenario-leaderboard-close");
const scenarioLeaderboardBodyEl = document.getElementById("scenario-leaderboard-body");
const scenarioLeaderboardEmptyEl = document.getElementById("scenario-leaderboard-empty");

homeBtnEl.addEventListener("click", goHome);
adminBtnEl?.addEventListener("click", onAdminButtonClick);
scenarioLeaderboardCloseBtnEl?.addEventListener("click", hideScenarioLeaderboard);

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
      <div class="scenario-card-actions">
        <button class="select-btn" data-scenario-id="${scenario.id}">Play This Scenario</button>
        <button class="leaderboard-btn" data-leaderboard-scenario-id="${scenario.id}">View Leaderboard</button>
      </div>
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

  scenarioListEl.querySelectorAll(".leaderboard-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      const scenarioId = target.dataset.leaderboardScenarioId;
      if (!scenarioId) {
        return;
      }

      const scenario = state.scenarios.find((item) => item.id === scenarioId);
      await showScenarioLeaderboard(scenarioId, scenario?.title || "Leaderboard");
    });
  });
}

async function startScenario(scenarioId) {
  stopTimer();
  stopAutoRefresh();
  scorePanelEl.classList.add("hidden");
  try {
    const response = await fetch(scenarioApiPath(scenarioId, "start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to start scenario.");
    }

    state.activeScenarioId = scenarioId;
    state.activePayload = payload;
    state.lastUnlockedCount = payload?.state?.unlocked_count ?? 0;
    state.lastVisibleClueIds = getClueIds(payload?.state?.clues);
    state.lastActiveLockIds = Array.isArray(payload?.state?.active_lock_ids)
      ? [...payload.state.active_lock_ids]
      : [];
    state.hasAutoScrolledScorePanel = false;
    state.adminMode = Boolean(payload?.state?.admin_mode);
    scenariosSectionEl.classList.add("hidden");
    homeBtnEl.classList.remove("hidden");
    adminBtnEl?.classList.remove("hidden");
    updateAdminButton();
    layoutRootEl?.classList.add("playing");
    startAutoRefresh();
    renderGame();
    showToast(`Scenario started: ${payload.scenario.title}`, "ok");
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to start scenario.", "error");
  }
}

function goHome() {
  stopTimer();
  stopAutoRefresh();
  state.activeScenarioId = null;
  state.activePayload = null;
  state.lastUnlockedCount = null;
  state.lastVisibleClueIds = [];
  state.lastActiveLockIds = [];
  state.isTypingLeaderboardName = false;
  state.hasAutoScrolledScorePanel = false;
  state.timer.expired = false;
  gameAreaEl.classList.add("hidden");
  scorePanelEl.classList.add("hidden");
  homeBtnEl.classList.add("hidden");
  adminBtnEl?.classList.add("hidden");
  layoutRootEl?.classList.remove("playing");
  hideScenarioLeaderboard();
  scenariosSectionEl.classList.remove("hidden");
}

async function showScenarioLeaderboard(scenarioId, scenarioTitle) {
  if (!scenarioLeaderboardPanelEl || !scenarioLeaderboardTitleEl || !scenarioLeaderboardSubtitleEl) {
    return;
  }

  scenarioLeaderboardTitleEl.textContent = `${scenarioTitle} Leaderboard`;
  scenarioLeaderboardSubtitleEl.textContent = `Top scores for ${scenarioTitle}.`;
  scenarioLeaderboardPanelEl.classList.remove("hidden");
  await fetchLeaderboard(scenarioId, scenarioLeaderboardBodyEl, scenarioLeaderboardEmptyEl);
}

function hideScenarioLeaderboard() {
  scenarioLeaderboardPanelEl?.classList.add("hidden");
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
  const previousUnlockedCount = state.lastUnlockedCount;
  state.adminMode = Boolean(progress.admin_mode);
  updateAdminButton();

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
    if (!state.hasAutoScrolledScorePanel) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      state.hasAutoScrolledScorePanel = true;
    }
  }

  renderLocks(progress);
  renderClues(progress.clues);
  renderHistory(progress.unlocked_history);
  gameAreaEl.classList.remove("hidden");

  const currentClueIds = getClueIds(progress.clues);
  const hasNewVisibleClue = currentClueIds.some((clueId) => !state.lastVisibleClueIds.includes(clueId));
  if (hasNewVisibleClue) {
    playClueUnlockedSound();
  }
  state.lastVisibleClueIds = currentClueIds;

  const currentActiveLockIds = Array.isArray(progress.active_lock_ids)
    ? progress.active_lock_ids
    : [];
  const hasNewAvailableLock = currentActiveLockIds.some(
    (lockId) => !state.lastActiveLockIds.includes(lockId)
  );
  state.lastActiveLockIds = [...currentActiveLockIds];

  if (
    typeof previousUnlockedCount === "number"
    && progress.unlocked_count > previousUnlockedCount
  ) {
    playUnlockSuccessSound();
  } else if (hasNewAvailableLock) {
    playLockAvailableSound();
  }

  state.lastUnlockedCount = progress.unlocked_count;
}

function renderLocks(progressState) {
  locksListEl.innerHTML = "";

  const activeLockIds = new Set(progressState.active_lock_ids || []);
  const activeGroupId = progressState.active_group?.id || null;
  let renderedCount = 0;

  progressState.locks.forEach((lock) => {
    if (!state.adminMode) {
      // Keep the Locks panel focused on the current unlock group only.
      if (activeGroupId && lock.group_id !== activeGroupId) {
        return;
      }

      if (!activeGroupId && !progressState.completed) {
        return;
      }

      if (lock.status === "locked" && !activeLockIds.has(lock.id)) {
        return;
      }
    } else if (lock.status === "unlocked") {
      // In admin mode, focus on remaining locks that can be completed instantly.
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

    const promptHtml = typeof lock.prompt === "string" && lock.prompt.trim().length > 0
      ? `<p>${escapeHtml(lock.prompt)}</p>`
      : "";

    const imageHtml = lock.image_url
      ? `<img src="${lock.image_url}" alt="Puzzle image for ${escapeHtml(lock.name)}" class="lock-image" />`
      : "";

    card.innerHTML = `
      <div class="lock-card-body">
        <div class="lock-card-main">
          <h3>${escapeHtml(lock.name)}</h3>
          ${promptHtml}
          ${imageHtml}
          ${codeInfo}
          ${unlockTime}
        </div>
        <aside class="lock-card-meta">
          <span class="status-pill ${lock.status}">${lock.status.toUpperCase()}</span>
          ${groupInfo}
          <p class="meta">Attempts: ${lock.attempts}</p>
        </aside>
      </div>
    `;

    if (lock.sounds && Array.isArray(lock.sounds)) {
      const soundBtn = document.createElement("button");
      soundBtn.className = "sound-btn";
      soundBtn.type = "button";
      soundBtn.textContent = "\u266a Play Clue";
      soundBtn.setAttribute("aria-label", "Play musical clue");
      soundBtn.addEventListener("click", () => playNotes(lock.sounds, 0.52, true));
      card.appendChild(soundBtn);
    }

    if (state.adminMode && lock.status === "locked") {
      const adminCompleteBtn = document.createElement("button");
      adminCompleteBtn.className = "unlock-btn";
      adminCompleteBtn.type = "button";
      adminCompleteBtn.textContent = "Complete (Admin)";
      adminCompleteBtn.addEventListener("click", async () => {
        await submitAdminUnlock(lock.id);
      });
      card.appendChild(adminCompleteBtn);
      locksListEl.appendChild(card);
      renderedCount += 1;
      return;
    }

    if (isCurrent && lock.status === "locked") {
      if (lock.input_type !== "code") {
        const helper = `Waiting for ${lock.input_type} event from external source.`;
        const motionHint = document.createElement("p");
        motionHint.className = "meta";
        motionHint.textContent = helper;
        card.appendChild(motionHint);
        locksListEl.appendChild(card);
        return;
      }

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
          input.addEventListener("focus", () => {
            state.isTypingCode = true;
          });

          input.addEventListener("blur", () => {
            state.isTypingCode = false;
            // Pull fresh state after editing ends so motion updates are not delayed.
            refreshScenarioState();
          });

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

            state.isTypingCode = false;
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
    renderedCount += 1;
  });

  if (renderedCount === 0) {
    const emptyItem = document.createElement("p");
    emptyItem.className = "meta";
    emptyItem.textContent = progressState.completed
      ? "All lock groups complete."
      : "Current lock group complete. Waiting for the next group...";
    locksListEl.appendChild(emptyItem);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!state.activeScenarioId) {
    return;
  }
  state.refreshInterval = window.setInterval(() => {
    refreshScenarioState();
  }, 1500);
}

function stopAutoRefresh() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = null;
  }
}

async function refreshScenarioState() {
  if (!state.activeScenarioId) {
    return;
  }

  if (state.isTypingCode) {
    return;
  }

  if (state.isTypingLeaderboardName) {
    return;
  }

  try {
    const response = await fetch(scenarioApiPath(state.activeScenarioId, "state"));
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    state.activePayload = payload;
    renderGame();
  } catch (_err) {
    // Ignore polling errors; user-triggered actions surface errors explicitly.
  }
}

function renderClues(clues) {
  clueListEl.innerHTML = "";
  if (!Array.isArray(clues) || clues.length === 0) {
    clueListEl.innerHTML = "<li>No current clues. Incorrect attempts may reveal hints.</li>";
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
    const hasMessage = typeof entry.message === "string" && entry.message.trim().length > 0;
    const messageHtml = hasMessage ? `<p>${escapeHtml(entry.message)}</p>` : "";
    item.innerHTML = `
      <details class="history-item">
        <summary>
          <span class="history-lock-name">${escapeHtml(entry.lock_name)}</span>
          <span class="history-expand-label">Expand</span>
        </summary>
        <div class="history-details">
          <p>Successful code: ${escapeHtml(entry.code)}</p>
          ${messageHtml}
          <span class="entry-time">Unlocked: ${formatTime(entry.unlocked_at)}</span>
        </div>
      </details>
    `;

    const detailsEl = item.querySelector("details.history-item");
    const expandLabelEl = item.querySelector(".history-expand-label");
    if (detailsEl && expandLabelEl) {
      detailsEl.addEventListener("toggle", () => {
        expandLabelEl.textContent = detailsEl.open ? "Collapse" : "Expand";
      });
    }

    historyListEl.appendChild(item);
  });
}

async function submitUnlock(lockId, code) {
  if (!state.activeScenarioId) {
    return;
  }

  try {
    const response = await fetch(scenarioApiPath(state.activeScenarioId, "unlock"), {
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
      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        showToast(payload.message, "ok");
      }
    } else {
      showToast(payload.message || "Incorrect code.", "error");
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to process code.", "error");
  }
}

async function submitAdminUnlock(lockId) {
  if (!state.activeScenarioId || !state.adminMode) {
    return;
  }

  try {
    const response = await fetch(scenarioApiPath(state.activeScenarioId, "admin-unlock"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lock_id: lockId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to complete lock in admin mode.");
    }

    state.activePayload = payload.state ? payload.state : payload;
    renderGame();
    showToast(payload.message || "Lock completed in Admin mode.", "ok");
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to complete lock in admin mode.", "error");
  }
}

async function onAdminButtonClick() {
  if (!state.adminMode) {
    const passcode = window.prompt("Enter admin passcode", "");
    if (passcode === null) {
      return;
    }
    await setAdminMode(true, passcode);
    return;
  }

  await setAdminMode(false);
}

async function setAdminMode(enabled, passcode = "") {
  try {
    const response = await fetch("/api/admin-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, passcode }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to update admin mode.");
    }

    state.adminMode = Boolean(payload.admin_mode);
    updateAdminButton();
    if (state.activeScenarioId) {
      await refreshScenarioState();
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Unable to update admin mode.", "error");
  }
}

function updateAdminButton() {
  if (!adminBtnEl) {
    return;
  }
  adminBtnEl.classList.toggle("admin-on", state.adminMode);
  adminBtnEl.textContent = state.adminMode ? "🔓 Admin On" : "🔒 Admin";
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
let _soundEnabled = false;
let _audioUnlockAttempted = false;

async function unlockAudioFromGesture(showFeedback = true) {
  if (_soundEnabled) {
    updateSoundEnableButton();
    return true;
  }

  const ctx = getAudioCtx();
  if (!ctx) {
    return false;
  }

  try {
    if (ctx.state === "suspended") {
      const resumeResult = ctx.resume();
      if (resumeResult && typeof resumeResult.then === "function") {
        resumeResult.catch(() => {
          // Ignore; we'll still try the priming beep in this gesture.
        });
      }
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.0001, now);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.01);

    _soundEnabled = true;
    updateSoundEnableButton();
    if (showFeedback) {
      showToast("Sound enabled.", "ok");
    }
    return true;
  } catch (_err) {
    _audioUnlockAttempted = true;
    updateSoundEnableButton();
    if (showFeedback) {
      showToast("Tap Enable Sound again to allow audio on this device.", "error");
    }
    return false;
  }
}

function updateSoundEnableButton() {
  if (!soundEnableBtnEl) {
    return;
  }

  soundEnableBtnEl.classList.toggle("sound-on", _soundEnabled);
  if (_soundEnabled) {
    soundEnableBtnEl.textContent = "🔊 Sound On";
  } else if (_audioUnlockAttempted) {
    soundEnableBtnEl.textContent = "🔊 Enable Sound";
  } else {
    soundEnableBtnEl.textContent = "🔈 Enable Sound";
  }
}

if (soundEnableBtnEl) {
  soundEnableBtnEl.addEventListener("click", async () => {
    const enabled = await unlockAudioFromGesture(true);
    if (enabled) {
      // Immediate audible confirmation on tap.
      playNotes(["C5", "E5"], 0.09, true);
    }
  });
}

document.addEventListener("pointerdown", () => {
  unlockAudioFromGesture(false);
}, { once: true });

document.addEventListener("touchstart", () => {
  unlockAudioFromGesture(false);
}, { once: true, passive: true });

updateSoundEnableButton();

function getAudioCtx() {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {
        // Some browsers block audio resume until an explicit user gesture.
      });
    }
    return _audioCtx;
  } catch (_err) {
    return null;
  }
}

function playNotes(notes, noteDuration = 0.52, fromUserGesture = false) {
  try {
    if (!_soundEnabled) {
      if (!fromUserGesture) {
        return;
      }
      // Try once more during direct user gestures (e.g. tapping Play Clue on iPad).
      unlockAudioFromGesture(false);
      if (!_soundEnabled) {
        return;
      }
    }

    const ctx = getAudioCtx();
    if (!ctx) {
      return;
    }
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
  } catch (_err) {
    // Audio errors should never block gameplay actions.
  }
}

function playUnlockSuccessSound() {
  // A short ascending triad gives immediate positive feedback for lock unlocks.
  playNotes(["C5", "E5", "G5"], 0.13);
}

function playClueUnlockedSound() {
  // Distinct single-note ding when a new clue is revealed.
  playNotes(["A5"], 0.18);
}

function playLockAvailableSound() {
  // Gentle two-note cue indicating a new lock can now be attempted.
  playNotes(["D5", "F5"], 0.1);
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

  playerNameInputEl.onfocus = () => {
    state.isTypingLeaderboardName = true;
  };
  playerNameInputEl.onblur = () => {
    state.isTypingLeaderboardName = false;
    refreshScenarioState();
  };

  submitScoreBtnEl.onclick = async () => {
    const name = playerNameInputEl.value.trim();
    if (!name) {
      showToast("Enter your name first.", "error");
      return;
    }
    state.isTypingLeaderboardName = false;
    await submitLeaderboard(scenarioId, name);
  };

  fetchLeaderboard(scenarioId, leaderboardBodyEl, leaderboardEmptyEl);
}

async function submitLeaderboard(scenarioId, name) {
  try {
    const response = await fetch(scenarioApiPath(scenarioId, "leaderboard"), {
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
    renderLeaderboard(data.leaderboard, leaderboardBodyEl, leaderboardEmptyEl);
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Could not submit score.", "error");
  }
}

async function fetchLeaderboard(scenarioId, bodyEl = leaderboardBodyEl, emptyEl = leaderboardEmptyEl) {
  try {
    const response = await fetch(scenarioApiPath(scenarioId, "leaderboard"));
    const data = await response.json();
    if (response.ok) {
      renderLeaderboard(data.leaderboard || [], bodyEl, emptyEl);
    }
  } catch (_err) {
    // leaderboard is a bonus feature; ignore fetch errors
  }
}

function renderLeaderboard(entries, bodyEl = leaderboardBodyEl, emptyEl = leaderboardEmptyEl) {
  if (!bodyEl || !emptyEl) {
    return;
  }

  if (!entries || entries.length === 0) {
    bodyEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  bodyEl.innerHTML = entries
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

function getClueIds(clues) {
  if (!Array.isArray(clues)) {
    return [];
  }
  return clues
    .map((clue) => clue?.id)
    .filter((id) => typeof id === "string");
}

function scenarioApiPath(scenarioId, endpoint) {
  const encodedScenarioId = encodeURIComponent(String(scenarioId || ""));
  return `/api/scenarios/${encodedScenarioId}/${endpoint}`;
}
