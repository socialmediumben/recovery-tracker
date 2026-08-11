/**
 * RECOVERY TRACKER - Core Application Logic
 * Version 2.5.0 - Interactive Drain Trends Line Chart (Cumulative & Daily Modes)
 */

// Global Application State
const STATE = {
  medications: [],
  logs: [],
  drainLogs: [],
  reminders: {}, // medId -> expiryTimestampMs
  appsScriptUrl: '',
  syncMode: 'local', // 'local' | 'sheets'
  version: 'v2.5.0',
  theme: 'light',
  lastSyncedTime: null,
  isInitialFetchDone: false,
  timerInterval: null,
  autoSyncInterval: null,
  drainChartMode: 'cumulative', // 'cumulative' | 'daily'
  drainChartInstance: null
};

// Optional Sample Data
const SAMPLE_DATA = {
  medications: [
    {
      id: 'med_sample_1',
      name: 'Ibuprofen',
      type: 'as-needed',
      quantity: 1,
      unit: 'Tablet',
      minIntervalHours: 4,
      scheduledSlots: [],
      notes: 'Take with food for pain or inflammation. Minimum 4 hours between doses.',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'med_sample_2',
      name: 'Acetaminophen (Tylenol)',
      type: 'as-needed',
      quantity: 2,
      unit: 'Tablet',
      minIntervalHours: 6,
      scheduledSlots: [],
      notes: 'For fever or headaches. Do not exceed 4,000 mg in 24 hours.',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'med_sample_3',
      name: 'Daily Multivitamin',
      type: 'scheduled',
      quantity: 1,
      unit: 'Capsule',
      minIntervalHours: 0,
      scheduledSlots: ['Morning'],
      notes: 'Take in the morning with breakfast.',
      updatedAt: new Date().toISOString()
    }
  ],
  logs: [
    {
      id: 'log_sample_1',
      medicationId: 'med_sample_1',
      medicationName: 'Ibuprofen',
      type: 'as-needed',
      quantity: 1,
      unit: 'Tablet',
      timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      timeSlot: '',
      notes: 'Logged after lunch for mild back pain.'
    }
  ],
  drainLogs: [
    {
      id: 'drain_sample_1',
      drainId: 'drain_1',
      drainName: 'Drain 1',
      volumeMl: 20,
      fluidCharacter: 'Serosanguinous (pink/red)',
      timestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
      notes: 'Day 1 morning'
    },
    {
      id: 'drain_sample_2',
      drainId: 'drain_1',
      drainName: 'Drain 1',
      volumeMl: 5,
      fluidCharacter: 'Serosanguinous (pink/red)',
      timestamp: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
      notes: 'Day 2'
    },
    {
      id: 'drain_sample_3',
      drainId: 'drain_1',
      drainName: 'Drain 1',
      volumeMl: 10,
      fluidCharacter: 'Serosanguinous (pink/red)',
      timestamp: new Date().toISOString(),
      notes: 'Day 3'
    },
    {
      id: 'drain_sample_4',
      drainId: 'drain_2',
      drainName: 'Drain 2',
      volumeMl: 15,
      fluidCharacter: 'Serous (straw/clear)',
      timestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
      notes: 'Day 1'
    },
    {
      id: 'drain_sample_5',
      drainId: 'drain_2',
      drainName: 'Drain 2',
      volumeMl: 10,
      fluidCharacter: 'Serous (straw/clear)',
      timestamp: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
      notes: 'Day 2'
    }
  ]
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initTheme();
  loadLocalState();
  initNotificationSystem();
  setupEventListeners();
  setupAppsScriptCodeDisplay();
  startLiveTimer();
  startAutoSync();
  renderAllViews();
}

/* ==========================================================================
   WEB PUSH NOTIFICATIONS & REMIND ME ENGINE
   ========================================================================== */

function initNotificationSystem() {
  const savedReminders = localStorage.getItem('rt_reminders');
  if (savedReminders) {
    try {
      STATE.reminders = JSON.parse(savedReminders);
    } catch (e) {
      STATE.reminders = {};
    }
  }
  updateNotificationUI();
}

function updateNotificationUI() {
  const btn = document.getElementById('btnNotificationPermission');
  const icon = document.getElementById('notificationIcon');
  const label = document.getElementById('notificationLabel');

  if (!btn || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    if (icon) icon.className = 'fa-solid fa-bell color-primary';
    if (label) label.textContent = 'Notifications On';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-outline');
  } else if (Notification.permission === 'denied') {
    if (icon) icon.className = 'fa-solid fa-bell-slash color-rose';
    if (label) label.textContent = 'Notifications Blocked';
  } else {
    if (icon) icon.className = 'fa-regular fa-bell';
    if (label) label.textContent = 'Enable Notifications';
  }
}

function requestNotificationPermission(callback) {
  if (!('Notification' in window)) {
    showToast('Web Push Notifications are not supported on this browser.', 'error');
    return;
  }

  if (Notification.permission === 'granted') {
    if (callback) callback(true);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      updateNotificationUI();
      if (permission === 'granted') {
        showToast('Web Push Notifications enabled! We will notify you when doses are ready.', 'success');
        if (callback) callback(true);
      } else {
        showToast('Notification permission was denied in your browser settings.', 'info');
        if (callback) callback(false);
      }
    });
  } else {
    showToast('Notifications are blocked by your browser settings. Please enable them in your address bar settings.', 'info');
    if (callback) callback(false);
  }
}

function toggleMedicationReminder(medId) {
  const med = STATE.medications.find(m => m.id === medId);
  if (!med) return;

  if (STATE.reminders[medId]) {
    delete STATE.reminders[medId];
    localStorage.setItem('rt_reminders', JSON.stringify(STATE.reminders));
    renderAsNeededMeds();
    showToast(`Cancelled reminder for ${med.name}`, 'info');
    return;
  }

  requestNotificationPermission((granted) => {
    const lastLog = getLastLogForMed(med.id);
    if (!lastLog) return;

    const lastTimeMs = new Date(lastLog.timestamp).getTime();
    const minIntervalMs = (med.minIntervalHours || 4) * 3600 * 1000;
    const expiryTimeMs = lastTimeMs + minIntervalMs;

    STATE.reminders[medId] = expiryTimeMs;
    localStorage.setItem('rt_reminders', JSON.stringify(STATE.reminders));
    renderAsNeededMeds();

    const remainMs = expiryTimeMs - Date.now();
    showToast(`🔔 Reminder set for ${med.name}! We will notify you in ${formatDuration(remainMs)}.`, 'success');
  });
}

function checkAndTriggerNotifications() {
  const now = Date.now();
  let changed = false;

  Object.keys(STATE.reminders).forEach(medId => {
    const expiryMs = STATE.reminders[medId];
    if (now >= expiryMs) {
      const med = STATE.medications.find(m => m.id === medId);
      if (med) {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('💊 Recovery Tracker - Dose Ready!', {
              body: `Your cooldown interval for ${med.name} (${med.quantity} ${med.unit}) has elapsed. You are now eligible for your next dose.`,
              icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💊</text></svg>',
              tag: `dose_ready_${medId}`
            });
          } catch (e) {
            console.warn('Could not launch system notification:', e);
          }
        }

        playNotificationChime();
        showToast(`🔔 Reminder: ${med.name} is now ready to take!`, 'success');
      }

      delete STATE.reminders[medId];
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem('rt_reminders', JSON.stringify(STATE.reminders));
    renderAsNeededMeds();
    renderOverviewStats();
  }
}

function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Ignore audio errors if blocked by browser policy
  }
}

/* ==========================================================================
   THEME MANAGER (LIGHT MODE / DARK MODE)
   ========================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('rt_theme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rt_theme', theme);

  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  if (themeIcon && themeLabel) {
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-moon';
      themeLabel.textContent = 'Dark';
    } else {
      themeIcon.className = 'fa-solid fa-sun';
      themeLabel.textContent = 'Light';
    }
  }

  // Re-render chart to reflect light/dark grid colors
  if (STATE.drainChartInstance) {
    renderDrainChart();
  }
}

function toggleTheme() {
  const newTheme = STATE.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

/* ==========================================================================
   STATE & PERSISTENCE MANAGEMENT
   ========================================================================== */

function loadLocalState() {
  const savedMeds = localStorage.getItem('rt_medications');
  const savedLogs = localStorage.getItem('rt_logs');
  const savedDrainLogs = localStorage.getItem('rt_drain_logs');
  const savedUrl = localStorage.getItem('rt_apps_script_url');

  if (savedUrl) {
    STATE.appsScriptUrl = savedUrl;
    STATE.syncMode = 'sheets';
    updateSyncStatusUI('online', 'Google Sheets');
    document.getElementById('appsScriptUrl').value = savedUrl;
  } else {
    STATE.syncMode = 'local';
    updateSyncStatusUI('offline', 'Local Mode');
  }

  STATE.medications = savedMeds ? JSON.parse(savedMeds) : [];
  STATE.logs = savedLogs ? JSON.parse(savedLogs) : [];
  STATE.drainLogs = savedDrainLogs ? JSON.parse(savedDrainLogs) : [];

  if (STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
    fetchFromGoogleSheets();
  }
}

function saveState(triggerRemoteSync = true) {
  localStorage.setItem('rt_medications', JSON.stringify(STATE.medications));
  localStorage.setItem('rt_logs', JSON.stringify(STATE.logs));
  localStorage.setItem('rt_drain_logs', JSON.stringify(STATE.drainLogs));
  
  if (STATE.appsScriptUrl) {
    localStorage.setItem('rt_apps_script_url', STATE.appsScriptUrl);
  } else {
    localStorage.removeItem('rt_apps_script_url');
  }

  if (triggerRemoteSync && STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
    syncToGoogleSheets();
  }

  renderAllViews();
}

function loadSampleData(shouldNotify = true) {
  STATE.medications = JSON.parse(JSON.stringify(SAMPLE_DATA.medications));
  STATE.logs = JSON.parse(JSON.stringify(SAMPLE_DATA.logs));
  STATE.drainLogs = JSON.parse(JSON.stringify(SAMPLE_DATA.drainLogs));
  saveState(true);
  if (shouldNotify) {
    showToast('Loaded sample medications, logs, and drain entries.');
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all local medications, dose logs, and drain entries?')) {
    STATE.medications = [];
    STATE.logs = [];
    STATE.drainLogs = [];
    STATE.reminders = {};
    localStorage.removeItem('rt_reminders');
    saveState(true);
    showToast('All local data cleared.', 'info');
  }
}

/* ==========================================================================
   MULTI-DEVICE SMART SYNC ENGINE (v2.5.0)
   ========================================================================== */

function fetchFromGoogleSheets() {
  if (!STATE.appsScriptUrl) return;
  updateSyncStatusUI('offline', 'Syncing...');

  const callbackName = 'rt_jsonp_cb_' + Math.floor(Math.random() * 1000000);
  const script = document.createElement('script');
  
  const separator = STATE.appsScriptUrl.includes('?') ? '&' : '?';
  script.src = `${STATE.appsScriptUrl}${separator}action=get_all&callback=${callbackName}`;

  const timeoutId = setTimeout(() => {
    handleTimeout();
  }, 25000);

  function handleTimeout() {
    window[callbackName] = () => {
      delete window[callbackName];
    };
    if (script.parentNode) script.parentNode.removeChild(script);
    updateSyncStatusUI('error', 'Sheets Timeout');
  }

  function cleanup() {
    clearTimeout(timeoutId);
    if (window[callbackName]) delete window[callbackName];
    if (script.parentNode) script.parentNode.removeChild(script);
  }

  window[callbackName] = (json) => {
    cleanup();
    STATE.isInitialFetchDone = true;
    if (json && json.status === 'success' && json.data) {
      const remoteMeds = json.data.medications || [];
      const remoteLogs = json.data.logs || [];
      const remoteDrainLogs = json.data.drainLogs || [];

      const { mergedMeds, mergedLogs, mergedDrainLogs, changesDetected } = smartMergeData(
        STATE.medications, STATE.logs, STATE.drainLogs,
        remoteMeds, remoteLogs, remoteDrainLogs
      );

      STATE.medications = mergedMeds;
      STATE.logs = mergedLogs;
      STATE.drainLogs = mergedDrainLogs;
      STATE.lastSyncedTime = new Date();

      localStorage.setItem('rt_medications', JSON.stringify(STATE.medications));
      localStorage.setItem('rt_logs', JSON.stringify(STATE.logs));
      localStorage.setItem('rt_drain_logs', JSON.stringify(STATE.drainLogs));

      updateSyncStatusUI('online', 'Google Sheets');
      renderAllViews();

      if (changesDetected) {
        syncToGoogleSheets(false);
      }
    } else {
      updateSyncStatusUI('error', 'Sync Failed');
    }
  };

  script.onerror = () => {
    cleanup();
    updateSyncStatusUI('error', 'CORS / URL Error');
  };

  document.body.appendChild(script);
}

/**
 * 3-Way Conflict-Free Smart Merge Algorithm
 */
function smartMergeData(localMeds, localLogs, localDrains, remoteMeds, remoteLogs, remoteDrains) {
  let changesDetected = false;

  // 1. MERGE DOSE LOGS
  const logMap = new Map();
  [...remoteLogs, ...localLogs].forEach(log => {
    if (log && log.id) {
      if (!logMap.has(log.id)) {
        logMap.set(log.id, log);
      }
    }
  });
  const mergedLogs = Array.from(logMap.values());
  mergedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (mergedLogs.length !== remoteLogs.length) changesDetected = true;

  // 2. MERGE DRAIN LOGS
  const drainMap = new Map();
  [...remoteDrains, ...localDrains].forEach(d => {
    if (d && d.id) {
      if (!drainMap.has(d.id)) {
        drainMap.set(d.id, d);
      }
    }
  });
  const mergedDrainLogs = Array.from(drainMap.values());
  mergedDrainLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (mergedDrainLogs.length !== remoteDrains.length) changesDetected = true;

  // 3. MERGE MEDICATIONS
  const medMap = new Map();
  [...remoteMeds, ...localMeds].forEach(med => {
    if (med && med.id) {
      const existing = medMap.get(med.id);
      if (!existing) {
        medMap.set(med.id, med);
      } else {
        const existingTime = new Date(existing.updatedAt || 0).getTime();
        const newTime = new Date(med.updatedAt || 0).getTime();
        if (newTime >= existingTime) {
          medMap.set(med.id, med);
        }
      }
    }
  });
  const mergedMeds = Array.from(medMap.values());
  if (mergedMeds.length !== remoteMeds.length) changesDetected = true;

  return { mergedMeds, mergedLogs, mergedDrainLogs, changesDetected };
}

function syncToGoogleSheets(fetchAfterSync = false) {
  if (!STATE.appsScriptUrl) return;

  updateSyncStatusUI('offline', 'Syncing...');

  fetch(STATE.appsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'save_all',
      medications: STATE.medications,
      logs: STATE.logs,
      drainLogs: STATE.drainLogs
    }),
    mode: 'no-cors'
  }).then(() => {
    STATE.lastSyncedTime = new Date();
    updateSyncStatusUI('online', 'Google Sheets');
    if (fetchAfterSync) {
      setTimeout(() => fetchFromGoogleSheets(), 500);
    }
  }).catch((err) => {
    console.warn('POST failed, attempting JSONP save fallback...', err);
    const payloadStr = encodeURIComponent(JSON.stringify({
      medications: STATE.medications,
      logs: STATE.logs,
      drainLogs: STATE.drainLogs
    }));
    
    const callbackName = 'rt_jsonp_save_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    const separator = STATE.appsScriptUrl.includes('?') ? '&' : '?';
    script.src = `${STATE.appsScriptUrl}${separator}action=save_all&data=${payloadStr}&callback=${callbackName}`;

    window[callbackName] = (json) => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      if (json && json.status === 'success') {
        STATE.lastSyncedTime = new Date();
        updateSyncStatusUI('online', 'Google Sheets');
        if (fetchAfterSync) fetchFromGoogleSheets();
      }
    };
    script.onerror = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      updateSyncStatusUI('error', 'Save Error');
    };
    document.body.appendChild(script);
  });
}

function startAutoSync() {
  window.addEventListener('focus', () => {
    if (STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
      fetchFromGoogleSheets();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
      fetchFromGoogleSheets();
    }
  });

  if (STATE.autoSyncInterval) clearInterval(STATE.autoSyncInterval);
  STATE.autoSyncInterval = setInterval(() => {
    if (STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
      fetchFromGoogleSheets();
    }
  }, 30000);
}

function updateSyncStatusUI(status, label) {
  const dot = document.getElementById('syncStatusDot');
  const text = document.getElementById('syncStatusText');
  if (!dot || !text) return;

  dot.className = `status-dot ${status}`;
  text.textContent = label;
}

/* ==========================================================================
   RENDER & VIEW RENDERERS
   ========================================================================== */

function renderAllViews() {
  renderOverviewStats();
  renderAsNeededMeds();
  renderScheduledMeds();
  renderDailySchedule();
  renderDrainViews();
  renderLogsTable();
}

// 1. STATS OVERVIEW
function renderOverviewStats() {
  const asNeeded = STATE.medications.filter(m => m.type === 'as-needed');
  const scheduled = STATE.medications.filter(m => m.type === 'scheduled');

  let readyCount = 0;
  let cooldownCount = 0;

  asNeeded.forEach(med => {
    const status = getAsNeededStatus(med);
    if (status.isCooldown) cooldownCount++;
    else readyCount++;
  });

  const drainTotalToday = STATE.drainLogs
    .filter(d => isTodayLocal(d.timestamp))
    .reduce((sum, d) => sum + (Number(d.volumeMl) || 0), 0);

  document.getElementById('statReadyCount').textContent = readyCount;
  document.getElementById('statCooldownCount').textContent = cooldownCount;
  document.getElementById('statScheduledCount').textContent = scheduled.length;
  document.getElementById('statDrainTotalToday').textContent = `${drainTotalToday} ml`;
}

// 2. AS-NEEDED MEDICATIONS GRID
function renderAsNeededMeds() {
  const container = document.getElementById('asNeededGrid');
  if (!container) return;

  const meds = STATE.medications.filter(m => m.type === 'as-needed');
  if (meds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-hand-holding-medical"></i>
        <h3>No As-Needed medications added</h3>
        <p>Click below to add your first interval-based medication.</p>
        <button class="btn btn-sm btn-primary" style="margin-top:0.75rem" onclick="openAddMedicationModal('as-needed')">
          <i class="fa-solid fa-plus"></i> Add As-Needed Medication
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = meds.map(med => {
    const status = getAsNeededStatus(med);
    const cardClass = status.isCooldown ? 'card-cooldown' : 'card-ready';
    const badgeText = status.isCooldown ? 'Cooldown Period' : 'Ready to Take';
    const badgeClass = status.isCooldown ? 'badge-cooldown' : 'badge-ready';
    const hasReminder = Boolean(STATE.reminders[med.id]);

    return `
      <div class="med-card ${cardClass}" data-id="${med.id}">
        <div class="card-top">
          <div class="med-info">
            <h3>${escapeHtml(med.name)}</h3>
            <span class="med-dosage-badge">${med.quantity} ${escapeHtml(med.unit)}</span>
          </div>
          <span class="card-status-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="card-middle">
          <div class="timer-box">
            <div class="timer-label">${status.isCooldown ? 'Next Eligible Dose In' : 'Status'}</div>
            <div class="timer-countdown" data-countdown="${med.id}">
              ${status.countdownText}
            </div>
          </div>

          <div class="card-meta-list">
            <div><i class="fa-solid fa-clock"></i> Minimum Interval: <strong>${med.minIntervalHours} hours</strong></div>
            <div><i class="fa-solid fa-history"></i> Last Dose: <strong>${status.lastTakenText}</strong></div>
            ${med.notes ? `<div class="card-notes"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(med.notes)}</div>` : ''}
          </div>
        </div>

        <div class="card-bottom">
          <button class="btn btn-primary touch-target" onclick="openLogDoseModal('${med.id}')">
            <i class="fa-solid fa-plus-circle"></i> Log Dose
          </button>
          
          ${status.isCooldown ? `
            <button class="btn ${hasReminder ? 'btn-reminder-active' : 'btn-reminder'} touch-target" onclick="toggleMedicationReminder('${med.id}')" title="Get a push notification when cooldown finishes">
              <i class="fa-solid ${hasReminder ? 'fa-bell' : 'fa-bell-concierge'}"></i> ${hasReminder ? 'Reminder Set' : 'Remind Me'}
            </button>
          ` : ''}

          <button class="btn btn-secondary btn-icon-only touch-target" onclick="openEditMedicationModal('${med.id}')" title="Edit Medication">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-secondary btn-icon-only touch-target" onclick="deleteMedication('${med.id}')" title="Delete Medication">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 3. SCHEDULED MEDICATIONS GRID
function renderScheduledMeds() {
  const container = document.getElementById('scheduledGrid');
  if (!container) return;

  const meds = STATE.medications.filter(m => m.type === 'scheduled');
  if (meds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-calendar-days"></i>
        <h3>No Scheduled medications added</h3>
        <p>Click below to add a scheduled daily medication.</p>
        <button class="btn btn-sm btn-primary" style="margin-top:0.75rem" onclick="openAddMedicationModal('scheduled')">
          <i class="fa-solid fa-plus"></i> Add Scheduled Medication
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = meds.map(med => {
    const lastLog = getLastLogForMed(med.id);
    const lastTakenText = lastLog ? formatRelativeTime(lastLog.timestamp) : 'Never logged';
    const slots = (med.scheduledSlots || []).map(s => `<span class="badge-version">${s}</span>`).join(' ');

    return `
      <div class="med-card" data-id="${med.id}">
        <div class="card-top">
          <div class="med-info">
            <h3>${escapeHtml(med.name)}</h3>
            <span class="med-dosage-badge">${med.quantity} ${escapeHtml(med.unit)}</span>
          </div>
          <span class="card-status-badge badge-ready">Scheduled</span>
        </div>

        <div class="card-middle">
          <div class="card-meta-list">
            <div><i class="fa-solid fa-sun"></i> Times: ${slots}</div>
            <div><i class="fa-solid fa-history"></i> Last Taken: <strong>${lastTakenText}</strong></div>
            ${med.notes ? `<div class="card-notes"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(med.notes)}</div>` : ''}
          </div>
        </div>

        <div class="card-bottom">
          <button class="btn btn-primary touch-target" onclick="openLogDoseModal('${med.id}')">
            <i class="fa-solid fa-check-double"></i> Quick Log
          </button>
          <button class="btn btn-secondary btn-icon-only touch-target" onclick="openEditMedicationModal('${med.id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-secondary btn-icon-only touch-target" onclick="deleteMedication('${med.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 4. DAILY SCHEDULE CHECKLIST
function renderDailySchedule() {
  const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const currentHour = new Date().getHours();

  let activeSlot = '';
  if (currentHour >= 7 && currentHour < 12) activeSlot = 'Morning';
  else if (currentHour >= 12 && currentHour < 16) activeSlot = 'Afternoon';
  else if (currentHour >= 16 && currentHour < 20) activeSlot = 'Evening';
  else if (currentHour >= 20 || currentHour < 2) activeSlot = 'Night';

  slots.forEach(slot => {
    const listEl = document.getElementById(`slotList${slot}`);
    const badgeEl = document.getElementById(`badge${slot}`);
    const cardEl = document.getElementById(`cardSlot${slot}`);
    if (!listEl) return;

    if (cardEl) {
      if (slot === activeSlot) {
        cardEl.classList.add('active-slot-card');
        const h3 = cardEl.querySelector('h3');
        if (h3 && !h3.querySelector('.now-active-pill')) {
          h3.innerHTML += `<span class="now-active-pill">NOW ACTIVE</span>`;
        }
      } else {
        cardEl.classList.remove('active-slot-card');
        const activePill = cardEl.querySelector('.now-active-pill');
        if (activePill) activePill.remove();
      }
    }

    const slotMeds = STATE.medications.filter(m => m.type === 'scheduled' && (m.scheduledSlots || []).includes(slot));
    
    let takenCount = 0;

    if (slotMeds.length === 0) {
      listEl.innerHTML = `<p class="help-text" style="text-align:center; padding:1rem;">No medications scheduled for ${slot}.</p>`;
      badgeEl.textContent = '0 / 0';
      return;
    }

    listEl.innerHTML = slotMeds.map(med => {
      const isTakenInWindow = isSlotLogTaken(med.id, slot);

      if (isTakenInWindow) takenCount++;

      return `
        <div class="schedule-item ${isTakenInWindow ? 'taken' : ''}">
          <div class="schedule-item-info">
            <strong>${escapeHtml(med.name)}</strong>
            <span>${med.quantity} ${escapeHtml(med.unit)}</span>
          </div>
          ${isTakenInWindow ? `
            <span class="badge-ready"><i class="fa-solid fa-check"></i> Logged</span>
          ` : `
            <button class="btn btn-sm btn-primary touch-target" onclick="openLogDoseModal('${med.id}', '${slot}')">
              <i class="fa-solid fa-check"></i> Mark Taken
            </button>
          `}
        </div>
      `;
    }).join('');

    badgeEl.textContent = `${takenCount} / ${slotMeds.length}`;
  });

  const dateDisplay = document.getElementById('currentDateDisplay');
  if (dateDisplay) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
  }
}

function isSlotLogTaken(medId, slotName) {
  return STATE.logs.some(l => {
    if (l.medicationId !== medId) return false;

    if (l.timeSlot === slotName && isTodayLocal(l.timestamp)) return true;

    const logDate = new Date(l.timestamp);
    if (isNaN(logDate.getTime())) return false;

    const logHours = logDate.getHours();

    if (slotName === 'Morning') {
      return isTodayLocal(l.timestamp) && logHours >= 7 && logHours < 12;
    } else if (slotName === 'Afternoon') {
      return isTodayLocal(l.timestamp) && logHours >= 12 && logHours < 16;
    } else if (slotName === 'Evening') {
      return isTodayLocal(l.timestamp) && logHours >= 16 && logHours < 20;
    } else if (slotName === 'Night') {
      if (logHours >= 20 && isTodayLocal(l.timestamp)) return true;
      if (logHours < 2) {
        return isTodayLocal(l.timestamp);
      }
      return false;
    }

    return false;
  });
}

// 5. MEDICAL DRAINS TRACKER VIEWS & CHART.JS LINE GRAPH (v2.5.0)
function renderDrainViews() {
  const drainIds = ['drain_1', 'drain_2', 'drain_3', 'drain_4'];

  drainIds.forEach((dId, idx) => {
    const num = idx + 1;
    const dLogs = STATE.drainLogs.filter(d => d.drainId === dId);
    dLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const todayTotal = dLogs
      .filter(d => isTodayLocal(d.timestamp))
      .reduce((sum, d) => sum + (Number(d.volumeMl) || 0), 0);

    const lastLog = dLogs[0];

    const todayEl = document.getElementById(`d${num}TodayTotal`);
    const timeEl = document.getElementById(`d${num}LastTime`);
    const charEl = document.getElementById(`d${num}LastChar`);

    if (todayEl) todayEl.textContent = todayTotal;
    if (timeEl) timeEl.textContent = lastLog ? formatRelativeTime(lastLog.timestamp) : 'Never';
    if (charEl) charEl.textContent = lastLog ? lastLog.fluidCharacter : 'N/A';
  });

  // Render Drain Table
  const tbody = document.getElementById('drainTableBody');
  const printTbody = document.getElementById('printDrainTableBody');
  const emptyState = document.getElementById('emptyDrainState');

  const sortedDrains = [...STATE.drainLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!tbody) return;

  if (sortedDrains.length === 0) {
    tbody.innerHTML = '';
    if (printTbody) printTbody.innerHTML = '<tr><td colspan="5">No drain entries.</td></tr>';
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');

    const rowsHtml = sortedDrains.map(d => `
      <tr>
        <td><strong>${formatFullDate(d.timestamp)}</strong></td>
        <td><span class="badge-version">${escapeHtml(d.drainName || d.drainId)}</span></td>
        <td><strong>${d.volumeMl} ml</strong></td>
        <td>${escapeHtml(d.fluidCharacter)}</td>
        <td>${d.notes ? escapeHtml(d.notes) : '<em>No notes</em>'}</td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline touch-target" onclick="deleteDrainLog('${d.id}')" title="Delete entry">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.innerHTML = rowsHtml;
    if (printTbody) printTbody.innerHTML = rowsHtml;
  }

  // Render Interactive Drain Trends Chart
  renderDrainChart();
}

/**
 * Renders the Chart.js Line Chart with Dual Modes:
 * 1. Cumulative Mode: Total accumulated fluid filled over time (non-decreasing line)
 * 2. Grouped by Day Mode: Exact volume recorded on each specific calendar day
 */
function renderDrainChart() {
  const canvas = document.getElementById('drainChart');
  const emptyState = document.getElementById('emptyChartState');
  if (!canvas || typeof Chart === 'undefined') return;

  if (STATE.drainLogs.length === 0) {
    canvas.style.display = 'none';
    if (emptyState) emptyState.classList.remove('hidden');
    if (STATE.drainChartInstance) {
      STATE.drainChartInstance.destroy();
      STATE.drainChartInstance = null;
    }
    return;
  }

  canvas.style.display = 'block';
  if (emptyState) emptyState.classList.add('hidden');

  // Extract unique calendar dates sorted chronologically
  const dateMap = new Map(); // "YYYY-MM-DD" -> Date object
  STATE.drainLogs.forEach(d => {
    if (!d.timestamp) return;
    const dt = new Date(d.timestamp);
    if (isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (!dateMap.has(key)) {
      dateMap.set(key, dt);
    }
  });

  const sortedDateKeys = Array.from(dateMap.keys()).sort();

  // Labels for X Axis (e.g. "Aug 4", "Aug 5")
  const labels = sortedDateKeys.map(key => {
    const dt = dateMap.get(key);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  // Calculate daily volume totals per drain for each date
  const drainIds = ['drain_1', 'drain_2', 'drain_3', 'drain_4'];
  const drainConfig = {
    'drain_1': { label: 'Drain 1', color: '#E11D48', bg: 'rgba(225, 29, 72, 0.1)' },
    'drain_2': { label: 'Drain 2', color: '#D97706', bg: 'rgba(217, 119, 6, 0.1)' },
    'drain_3': { label: 'Drain 3', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
    'drain_4': { label: 'Drain 4', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)' }
  };

  const dailyTotalsByDrain = {};
  drainIds.forEach(dId => {
    dailyTotalsByDrain[dId] = sortedDateKeys.map(dateKey => {
      return STATE.drainLogs
        .filter(d => {
          if (d.drainId !== dId || !d.timestamp) return false;
          const dt = new Date(d.timestamp);
          const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          return k === dateKey;
        })
        .reduce((sum, d) => sum + (Number(d.volumeMl) || 0), 0);
    });
  });

  // Generate Data Points based on selected Chart Mode
  const datasets = drainIds.map(dId => {
    const rawDaily = dailyTotalsByDrain[dId];
    let dataPoints = [];

    if (STATE.drainChartMode === 'cumulative') {
      // Cumulative Mode: Accumulate running total volume across dates (never decreases)
      let runningSum = 0;
      dataPoints = rawDaily.map(val => {
        runningSum += val;
        return runningSum;
      });
    } else {
      // Grouped by Day Mode: Exact volume recorded on each day
      dataPoints = [...rawDaily];
    }

    const cfg = drainConfig[dId];
    return {
      label: cfg.label,
      data: dataPoints,
      borderColor: cfg.color,
      backgroundColor: cfg.bg,
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 7,
      tension: 0.3,
      fill: true
    };
  });

  // Dark/Light Mode Colors
  const isDark = STATE.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  if (STATE.drainChartInstance) {
    STATE.drainChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  STATE.drainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', weight: '700', size: 12 },
            usePointStyle: true,
            boxWidth: 10
          }
        },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#F8FAFC',
          bodyColor: '#F8FAFC',
          borderColor: gridColor,
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.raw} ml`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', weight: '600' },
            callback: function(value) { return value + ' ml'; }
          }
        }
      }
    }
  });
}

function setDrainChartMode(mode) {
  STATE.drainChartMode = mode;
  const btnCum = document.getElementById('btnChartModeCumulative');
  const btnDaily = document.getElementById('btnChartModeDaily');

  if (mode === 'cumulative') {
    btnCum?.classList.add('active');
    btnDaily?.classList.remove('active');
  } else {
    btnCum?.classList.remove('active');
    btnDaily?.classList.add('active');
  }

  renderDrainChart();
}

// 6. HISTORY LOGS TABLE & FILTERS
function renderLogsTable() {
  const tbody = document.getElementById('logsTableBody');
  const emptyState = document.getElementById('emptyLogsState');
  if (!tbody) return;

  const searchQuery = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('filterDateRange')?.value || 'all';
  const typeFilter = document.getElementById('filterMedType')?.value || 'all';

  const now = Date.now();

  const filteredLogs = STATE.logs.filter(log => {
    const matchesSearch = log.medicationName.toLowerCase().includes(searchQuery) ||
                          (log.notes && log.notes.toLowerCase().includes(searchQuery));
    if (!matchesSearch) return false;

    if (typeFilter !== 'all' && typeFilter !== 'drains' && log.type !== typeFilter) return false;
    if (typeFilter === 'drains') return false;

    const logTime = new Date(log.timestamp).getTime();
    if (dateFilter === 'today') {
      if (!isTodayLocal(log.timestamp)) return false;
    } else if (dateFilter === '7days') {
      if (now - logTime > 7 * 24 * 3600 * 1000) return false;
    } else if (dateFilter === '30days') {
      if (now - logTime > 30 * 24 * 3600 * 1000) return false;
    }

    return true;
  });

  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filteredLogs.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  tbody.innerHTML = filteredLogs.map(log => {
    const dateFormatted = formatFullDate(log.timestamp);
    const typeBadge = log.type === 'as-needed' 
      ? '<span class="badge-version">As Needed</span>' 
      : '<span class="badge-version" style="background:#e0e7ff;color:#3730a3">Scheduled</span>';

    return `
      <tr>
        <td><strong>${dateFormatted}</strong></td>
        <td>${escapeHtml(log.medicationName)}</td>
        <td>${typeBadge}</td>
        <td>${log.quantity} ${escapeHtml(log.unit)}</td>
        <td>${log.timeSlot ? `<span class="slot-badge" style="color:#000">${log.timeSlot}</span>` : 'N/A'}</td>
        <td>${log.notes ? escapeHtml(log.notes) : '<em>No notes</em>'}</td>
        <td class="no-print">
          <button class="btn btn-sm btn-outline touch-target" onclick="deleteLogEntry('${log.id}')" title="Delete entry">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const printMeta = document.getElementById('printMetaDate');
  if (printMeta) {
    printMeta.textContent = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  }
}

/* ==========================================================================
   TIME & COOLDOWN CALCULATIONS
   ========================================================================== */

function getAsNeededStatus(med) {
  const lastLog = getLastLogForMed(med.id);
  if (!lastLog) {
    return {
      isCooldown: false,
      countdownText: 'READY TO TAKE',
      lastTakenText: 'Never'
    };
  }

  const lastTimeMs = new Date(lastLog.timestamp).getTime();
  const elapsedMs = Date.now() - lastTimeMs;
  const minIntervalMs = (med.minIntervalHours || 4) * 3600 * 1000;

  const isCooldown = elapsedMs < minIntervalMs;

  if (isCooldown) {
    const remainMs = minIntervalMs - elapsedMs;
    return {
      isCooldown: true,
      countdownText: formatDuration(remainMs),
      lastTakenText: `${formatRelativeTime(lastLog.timestamp)}`
    };
  }

  return {
    isCooldown: false,
    countdownText: 'READY TO TAKE',
    lastTakenText: `${formatRelativeTime(lastLog.timestamp)}`
  };
}

function getLastLogForMed(medId) {
  const medLogs = STATE.logs.filter(l => l.medicationId === medId);
  if (medLogs.length === 0) return null;
  medLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return medLogs[0];
}

function startLiveTimer() {
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  STATE.timerInterval = setInterval(() => {
    const asNeededMeds = STATE.medications.filter(m => m.type === 'as-needed');
    asNeededMeds.forEach(med => {
      const countdownEl = document.querySelector(`[data-countdown="${med.id}"]`);
      if (countdownEl) {
        const status = getAsNeededStatus(med);
        countdownEl.textContent = status.countdownText;

        const card = countdownEl.closest('.med-card');
        if (card) {
          if (status.isCooldown && !card.classList.contains('card-cooldown')) {
            renderAsNeededMeds();
            renderOverviewStats();
          } else if (!status.isCooldown && card.classList.contains('card-cooldown')) {
            renderAsNeededMeds();
            renderOverviewStats();
          }
        }
      }
    });

    checkAndTriggerNotifications();
  }, 1000);
}

/* ==========================================================================
   EVENT HANDLERS & MOBILE FAB MENU
   ========================================================================== */

function setupEventListeners() {
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => toggleTheme());
  document.getElementById('btnNotificationPermission')?.addEventListener('click', () => {
    requestNotificationPermission();
  });

  // Chart Mode Toggles
  document.getElementById('btnChartModeCumulative')?.addEventListener('click', () => setDrainChartMode('cumulative'));
  document.getElementById('btnChartModeDaily')?.addEventListener('click', () => setDrainChartMode('daily'));

  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const targetId = e.currentTarget.dataset.tab;
      document.getElementById(targetId).classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (targetId === 'tab-drains') {
        setTimeout(() => renderDrainChart(), 100);
      }
    });
  });

  // Mobile FAB
  const fabBtn = document.getElementById('btnMobileFab');
  const fabOptions = document.getElementById('fabOptions');
  
  if (fabBtn && fabOptions) {
    fabBtn.addEventListener('click', () => {
      const isHidden = fabOptions.classList.contains('hidden');
      if (isHidden) {
        fabOptions.classList.remove('hidden');
        fabBtn.classList.add('active');
      } else {
        closeFabMenu();
      }
    });
  }

  document.getElementById('btnAddMedication')?.addEventListener('click', () => openAddMedicationModal());
  document.getElementById('btnQuickLogDrain')?.addEventListener('click', () => openLogDrainModal());
  document.getElementById('btnInfoModal')?.addEventListener('click', () => openInfoModal());
  document.getElementById('syncStatusPill')?.addEventListener('click', () => {
    document.querySelector('[data-tab="tab-settings"]')?.click();
  });

  document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
    const urlInput = document.getElementById('appsScriptUrl').value.trim();
    if (urlInput) {
      STATE.appsScriptUrl = urlInput;
      STATE.syncMode = 'sheets';
      localStorage.setItem('rt_apps_script_url', urlInput);
      fetchFromGoogleSheets();
      showToast('Saved Web App URL! Fetching cloud data...');
    } else {
      STATE.appsScriptUrl = '';
      STATE.syncMode = 'local';
      saveState(false);
      showToast('Switched to LocalStorage mode.', 'info');
    }
  });

  document.getElementById('btnManualSync')?.addEventListener('click', () => {
    if (STATE.appsScriptUrl) {
      syncToGoogleSheets(true);
      showToast('Pushing local data and syncing with Google Sheets...');
    } else {
      showToast('Please enter a Google Apps Script Web App URL first.', 'error');
    }
  });

  document.getElementById('btnLoadSampleData')?.addEventListener('click', () => loadSampleData(true));
  document.getElementById('btnClearAllData')?.addEventListener('click', () => clearAllData());

  document.getElementById('btnCopyScriptCode')?.addEventListener('click', () => {
    const code = document.getElementById('scriptCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Google Apps Script code copied to clipboard!');
    });
  });

  document.getElementById('filterSearch')?.addEventListener('input', () => renderLogsTable());
  document.getElementById('filterDateRange')?.addEventListener('change', () => renderLogsTable());
  document.getElementById('filterMedType')?.addEventListener('change', () => renderLogsTable());

  document.getElementById('btnExportCSV')?.addEventListener('click', () => exportLogsToCSV());
  document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());

  document.getElementById('formMedication')?.addEventListener('submit', (e) => handleSaveMedication(e));
  document.getElementById('formLogDose')?.addEventListener('submit', (e) => handleSaveLogDose(e));
  document.getElementById('formDrainOutput')?.addEventListener('submit', (e) => handleSaveDrainOutput(e));

  document.getElementById('btnCloseInfoModal')?.addEventListener('click', () => closeInfoModal());
  document.getElementById('btnDismissInfoModal')?.addEventListener('click', () => closeInfoModal());
  document.getElementById('btnCloseMedModal')?.addEventListener('click', () => closeMedicationModal());
  document.getElementById('btnCancelMedModal')?.addEventListener('click', () => closeMedicationModal());
  document.getElementById('btnCloseLogDose')?.addEventListener('click', () => closeLogDoseModal());
  document.getElementById('btnCancelLogDose')?.addEventListener('click', () => closeLogDoseModal());
  document.getElementById('btnCloseDrainModal')?.addEventListener('click', () => closeLogDrainModal());
  document.getElementById('btnCancelDrainModal')?.addEventListener('click', () => closeLogDrainModal());

  document.getElementById('medType')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const grpInterval = document.getElementById('groupMinInterval');
    const grpScheduled = document.getElementById('groupScheduledSlots');

    if (val === 'as-needed') {
      grpInterval.classList.remove('hidden');
      grpScheduled.classList.add('hidden');
    } else {
      grpInterval.classList.add('hidden');
      grpScheduled.classList.remove('hidden');
    }
  });

  document.querySelectorAll('.info-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.info-tab-content').forEach(c => c.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const targetId = e.currentTarget.dataset.infotab;
      document.getElementById(targetId).classList.add('active');
    });
  });
}

function closeFabMenu() {
  const fabBtn = document.getElementById('btnMobileFab');
  const fabOptions = document.getElementById('fabOptions');
  if (fabOptions) fabOptions.classList.add('hidden');
  if (fabBtn) fabBtn.classList.remove('active');
}

/* ==========================================================================
   MODAL CONTROLLER FUNCTIONS
   ========================================================================== */

function openInfoModal() {
  document.getElementById('modalInfo').classList.remove('hidden');
}
function closeInfoModal() {
  document.getElementById('modalInfo').classList.add('hidden');
}

// LOG DRAIN OUTPUT MODAL
function openLogDrainModal(defaultDrain = 'drain_1') {
  document.getElementById('drainSelect').value = defaultDrain;
  document.getElementById('drainVolume').value = '';
  document.getElementById('drainCharacter').value = 'Serosanguinous (pink/red)';
  document.getElementById('drainNotes').value = '';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('drainTimestamp').value = now.toISOString().slice(0, 16);

  document.getElementById('modalDrainOutput').classList.remove('hidden');
}

function closeLogDrainModal() {
  document.getElementById('modalDrainOutput').classList.add('hidden');
}

function handleSaveDrainOutput(e) {
  e.preventDefault();

  const drainId = document.getElementById('drainSelect').value;
  const drainNames = {
    'drain_1': 'Drain 1',
    'drain_2': 'Drain 2',
    'drain_3': 'Drain 3',
    'drain_4': 'Drain 4'
  };

  const volumeMl = parseFloat(document.getElementById('drainVolume').value) || 0;
  const fluidCharacter = document.getElementById('drainCharacter').value;
  const timestampLocal = document.getElementById('drainTimestamp').value;
  const notes = document.getElementById('drainNotes').value.trim();

  const timestampIso = new Date(timestampLocal).toISOString();

  const newDrainLog = {
    id: `drainlog_${Date.now()}`,
    drainId,
    drainName: drainNames[drainId] || 'Drain',
    volumeMl,
    fluidCharacter,
    timestamp: timestampIso,
    notes
  };

  STATE.drainLogs.push(newDrainLog);
  saveState(true);
  closeLogDrainModal();
  showToast(`Recorded ${volumeMl} ml output for ${drainNames[drainId]}!`);
}

function deleteDrainLog(id) {
  if (confirm('Delete this drain log entry?')) {
    STATE.drainLogs = STATE.drainLogs.filter(d => d.id !== id);
    saveState(true);
    showToast('Drain log entry deleted.', 'info');
  }
}

// MEDICATION MODAL
function openAddMedicationModal(defaultType = 'as-needed') {
  document.getElementById('medModalTitle').innerHTML = '<i class="fa-solid fa-pills color-primary"></i> Add Medication';
  document.getElementById('editMedId').value = '';
  document.getElementById('medName').value = '';
  document.getElementById('medType').value = defaultType;
  document.getElementById('medQuantity').value = 1;
  document.getElementById('medUnit').value = 'Tablet';
  document.getElementById('medMinInterval').value = 4;
  document.getElementById('medNotes').value = '';

  document.querySelectorAll('input[name="schedSlot"]').forEach(cb => cb.checked = false);

  document.getElementById('medType').dispatchEvent(new Event('change'));
  document.getElementById('modalMedication').classList.remove('hidden');
}

function openEditMedicationModal(id) {
  const med = STATE.medications.find(m => m.id === id);
  if (!med) return;

  document.getElementById('medModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square color-primary"></i> Edit Medication';
  document.getElementById('editMedId').value = med.id;
  document.getElementById('medName').value = med.name;
  document.getElementById('medType').value = med.type;
  document.getElementById('medQuantity').value = med.quantity;
  document.getElementById('medUnit').value = med.unit;
  document.getElementById('medMinInterval').value = med.minIntervalHours || 4;
  document.getElementById('medNotes').value = med.notes || '';

  const slots = med.scheduledSlots || [];
  document.querySelectorAll('input[name="schedSlot"]').forEach(cb => {
    cb.checked = slots.includes(cb.value);
  });

  document.getElementById('medType').dispatchEvent(new Event('change'));
  document.getElementById('modalMedication').classList.remove('hidden');
}

function closeMedicationModal() {
  document.getElementById('modalMedication').classList.add('hidden');
}

function handleSaveMedication(e) {
  e.preventDefault();

  const id = document.getElementById('editMedId').value || `med_${Date.now()}`;
  const name = document.getElementById('medName').value.trim();
  const type = document.getElementById('medType').value;
  const quantity = parseFloat(document.getElementById('medQuantity').value) || 1;
  const unit = document.getElementById('medUnit').value;
  const minIntervalHours = parseFloat(document.getElementById('medMinInterval').value) || 0;
  const notes = document.getElementById('medNotes').value.trim();

  const scheduledSlots = [];
  if (type === 'scheduled') {
    document.querySelectorAll('input[name="schedSlot"]:checked').forEach(cb => {
      scheduledSlots.push(cb.value);
    });
  }

  const existingIdx = STATE.medications.findIndex(m => m.id === id);
  const medObj = {
    id,
    name,
    type,
    quantity,
    unit,
    minIntervalHours: type === 'as-needed' ? minIntervalHours : 0,
    scheduledSlots: type === 'scheduled' ? scheduledSlots : [],
    notes,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    STATE.medications[existingIdx] = medObj;
    showToast(`Updated medication: ${name}`);
  } else {
    STATE.medications.push(medObj);
    showToast(`Added new medication: ${name}`);
  }

  saveState(true);
  closeMedicationModal();
}

function deleteMedication(id) {
  const med = STATE.medications.find(m => m.id === id);
  if (!med) return;

  if (confirm(`Are you sure you want to delete ${med.name}?`)) {
    STATE.medications = STATE.medications.filter(m => m.id !== id);
    if (STATE.reminders[id]) delete STATE.reminders[id];
    localStorage.setItem('rt_reminders', JSON.stringify(STATE.reminders));
    saveState(true);
    showToast(`Deleted ${med.name}`, 'info');
  }
}

// LOG DOSE MODAL
function openLogDoseModal(medId, timeSlot = '') {
  const med = STATE.medications.find(m => m.id === medId);
  if (!med) return;

  document.getElementById('logMedId').value = med.id;
  document.getElementById('logSlotName').value = timeSlot;
  document.getElementById('logMedNameDisplay').textContent = med.name;
  document.getElementById('logMedDetailDisplay').textContent = `Type: ${med.type === 'as-needed' ? 'As Needed' : 'Scheduled'} ${timeSlot ? `(${timeSlot})` : ''}`;
  document.getElementById('logQuantity').value = med.quantity;
  document.getElementById('logUnit').value = med.unit;
  document.getElementById('logNotes').value = '';

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('logTimestamp').value = now.toISOString().slice(0, 16);

  document.getElementById('modalLogDose').classList.remove('hidden');
}

function closeLogDoseModal() {
  document.getElementById('modalLogDose').classList.add('hidden');
}

function handleSaveLogDose(e) {
  e.preventDefault();

  const medId = document.getElementById('logMedId').value;
  const med = STATE.medications.find(m => m.id === medId);
  if (!med) return;

  const quantity = parseFloat(document.getElementById('logQuantity').value) || 1;
  const unit = document.getElementById('logUnit').value;
  const timestampLocal = document.getElementById('logTimestamp').value;
  const notes = document.getElementById('logNotes').value.trim();
  const timeSlot = document.getElementById('logSlotName').value;

  const timestampIso = new Date(timestampLocal).toISOString();

  const newLog = {
    id: `log_${Date.now()}`,
    medicationId: med.id,
    medicationName: med.name,
    type: med.type,
    quantity,
    unit,
    timestamp: timestampIso,
    timeSlot,
    notes
  };

  STATE.logs.push(newLog);

  if (STATE.reminders[med.id]) {
    delete STATE.reminders[med.id];
    localStorage.setItem('rt_reminders', JSON.stringify(STATE.reminders));
  }

  saveState(true);
  closeLogDoseModal();
  showToast(`Logged dose for ${med.name}!`);
}

function deleteLogEntry(id) {
  if (confirm('Delete this log entry?')) {
    STATE.logs = STATE.logs.filter(l => l.id !== id);
    saveState(true);
    showToast('Log entry deleted.', 'info');
  }
}

/* ==========================================================================
   EXPORT CSV GENERATOR
   ========================================================================== */

function exportLogsToCSV() {
  if (STATE.logs.length === 0 && STATE.drainLogs.length === 0) {
    showToast('No logs available to export.', 'error');
    return;
  }

  const medHeaders = ['Record Type', 'Log ID', 'Timestamp (ISO)', 'Date & Time', 'Name / Drain', 'Type / Character', 'Quantity / Volume', 'Unit', 'Notes'];
  
  const medRows = STATE.logs.map(log => [
    'MedicationDose',
    log.id,
    log.timestamp,
    `"${formatFullDate(log.timestamp)}"`,
    `"${log.medicationName.replace(/"/g, '""')}"`,
    log.type,
    log.quantity,
    log.unit,
    `"${(log.notes || '').replace(/"/g, '""')}"`
  ]);

  const drainRows = STATE.drainLogs.map(d => [
    'MedicalDrainOutput',
    d.id,
    d.timestamp,
    `"${formatFullDate(d.timestamp)}"`,
    `"${d.drainName}"`,
    `"${d.fluidCharacter}"`,
    d.volumeMl,
    'ml',
    `"${(d.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [medHeaders.join(','), ...medRows.map(r => r.join(',')), ...drainRows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `recovery_tracker_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Comprehensive CSV Report Downloaded!');
}

/* ==========================================================================
   UTILITY & FORMATTING FUNCTIONS
   ========================================================================== */

function isTodayLocal(isoOrDateString) {
  if (!isoOrDateString) return false;
  const d = new Date(isoOrDateString);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const elapsedSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (elapsedSeconds < 60) return 'Just now';
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} mins ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`;
  const days = Math.floor(elapsedSeconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatFullDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'info' ? 'fa-circle-info' : 'fa-circle-check');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setupAppsScriptCodeDisplay() {
  const el = document.getElementById('scriptCodeDisplay');
  if (!el) return;
  el.textContent = `/**
 * RECOVERY TRACKER - Google Apps Script Backend (v2.5.0 - Drain Analytics & Multi-Device Tracker)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this exact file.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New deployment (or Manage Deployments > Edit > New Version).
 * 6. Set 'Execute as': Me
 * 7. Set 'Who has access': Anyone  <-- CRITICAL!
 * 8. Click Deploy, click "Authorize access", copy the Web App URL, and paste into Recovery Tracker Settings.
 */

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupSheets() {
  const ss = getSpreadsheet();
  if (!ss) return;

  let medSheet = ss.getSheetByName('Medications');
  if (!medSheet) {
    medSheet = ss.insertSheet('Medications');
    medSheet.appendRow(['id', 'name', 'type', 'quantity', 'unit', 'minIntervalHours', 'scheduledSlots', 'notes', 'updatedAt']);
    medSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4A5568').setFontColor('#FFFFFF');
  }

  let logSheet = ss.getSheetByName('DoseLogs');
  if (!logSheet) {
    logSheet = ss.insertSheet('DoseLogs');
    logSheet.appendRow(['id', 'medicationId', 'medicationName', 'type', 'quantity', 'unit', 'timestamp', 'timeSlot', 'notes']);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#2B6CB0').setFontColor('#FFFFFF');
  }

  let drainSheet = ss.getSheetByName('DrainLogs');
  if (!drainSheet) {
    drainSheet = ss.insertSheet('DrainLogs');
    drainSheet.appendRow(['id', 'drainId', 'drainName', 'volumeMl', 'fluidCharacter', 'timestamp', 'notes']);
    drainSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#9B2C2C').setFontColor('#FFFFFF');
  }
}

function doGet(e) {
  try {
    setupSheets();
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'get_all';
    const callback = params.callback;

    if (action === 'save_all' && params.data) {
      const dataObj = JSON.parse(decodeURIComponent(params.data));
      saveAllData(dataObj.medications || [], dataObj.logs || [], dataObj.drainLogs || []);
      return respond({ status: 'success', message: 'Data saved successfully' }, callback);
    }

    const ss = getSpreadsheet();
    if (!ss) return respond({ status: 'error', message: 'Spreadsheet not bound.' }, callback);

    const medSheet = ss.getSheetByName('Medications');
    const logSheet = ss.getSheetByName('DoseLogs');
    const drainSheet = ss.getSheetByName('DrainLogs');

    const medData = getSheetObjects(medSheet);
    const logData = getSheetObjects(logSheet);
    const drainData = getSheetObjects(drainSheet);

    const medications = medData.map(m => ({
      id: String(m.id || ''),
      name: String(m.name || ''),
      type: String(m.type || 'as-needed'),
      quantity: Number(m.quantity || 1),
      unit: String(m.unit || 'Tablet'),
      minIntervalHours: Number(m.minIntervalHours || 0),
      scheduledSlots: m.scheduledSlots ? String(m.scheduledSlots).split(',') : [],
      notes: String(m.notes || ''),
      updatedAt: String(m.updatedAt || '')
    })).filter(m => m.id);

    const logs = logData.map(l => ({
      id: String(l.id || ''),
      medicationId: String(l.medicationId || ''),
      medicationName: String(l.medicationName || ''),
      type: String(l.type || 'as-needed'),
      quantity: Number(l.quantity || 1),
      unit: String(l.unit || 'Tablet'),
      timestamp: String(l.timestamp || ''),
      timeSlot: String(l.timeSlot || ''),
      notes: String(l.notes || '')
    })).filter(l => l.id);

    const drainLogs = drainData.map(d => ({
      id: String(d.id || ''),
      drainId: String(d.drainId || ''),
      drainName: String(d.drainName || ''),
      volumeMl: Number(d.volumeMl || 0),
      fluidCharacter: String(d.fluidCharacter || ''),
      timestamp: String(d.timestamp || ''),
      notes: String(d.notes || '')
    })).filter(d => d.id);

    return respond({ status: 'success', data: { medications, logs, drainLogs } }, callback);
  } catch (err) {
    const callback = (e && e.parameter) ? e.parameter.callback : null;
    return respond({ status: 'error', message: err.toString() }, callback);
  }
}

function doPost(e) {
  try {
    setupSheets();
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    const action = postData.action || 'save_all';

    if (action === 'save_all') {
      saveAllData(postData.medications || [], postData.logs || [], postData.drainLogs || []);
      return respond({ status: 'success', message: 'All data synchronized successfully.' }, null);
    }

    return respond({ status: 'error', message: 'Unknown action parameter' }, null);
  } catch (err) {
    return respond({ status: 'error', message: err.toString() }, null);
  }
}

function saveAllData(medications, logs, drainLogs) {
  const ss = getSpreadsheet();
  if (!ss) return;

  const medSheet = ss.getSheetByName('Medications');
  medSheet.clearContents();
  medSheet.appendRow(['id', 'name', 'type', 'quantity', 'unit', 'minIntervalHours', 'scheduledSlots', 'notes', 'updatedAt']);
  medSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4A5568').setFontColor('#FFFFFF');

  medications.forEach(m => {
    medSheet.appendRow([
      m.id,
      m.name,
      m.type,
      m.quantity,
      m.unit,
      m.minIntervalHours || 0,
      Array.isArray(m.scheduledSlots) ? m.scheduledSlots.join(',') : '',
      m.notes || '',
      m.updatedAt || new Date().toISOString()
    ]);
  });

  const logSheet = ss.getSheetByName('DoseLogs');
  logSheet.clearContents();
  logSheet.appendRow(['id', 'medicationId', 'medicationName', 'type', 'quantity', 'unit', 'timestamp', 'timeSlot', 'notes']);
  logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#2B6CB0').setFontColor('#FFFFFF');

  logs.forEach(l => {
    logSheet.appendRow([
      l.id,
      l.medicationId,
      l.medicationName,
      l.type,
      l.quantity,
      l.unit,
      l.timestamp,
      l.timeSlot || '',
      l.notes || ''
    ]);
  });

  const drainSheet = ss.getSheetByName('DrainLogs');
  drainSheet.clearContents();
  drainSheet.appendRow(['id', 'drainId', 'drainName', 'volumeMl', 'fluidCharacter', 'timestamp', 'notes']);
  drainSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#9B2C2C').setFontColor('#FFFFFF');

  drainLogs.forEach(d => {
    drainSheet.appendRow([
      d.id,
      d.drainId,
      d.drainName,
      d.volumeMl || 0,
      d.fluidCharacter || '',
      d.timestamp || '',
      d.notes || ''
    ]);
  });
}

function getSheetObjects(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  const objects = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    objects.push(obj);
  }
  return objects;
}

function respond(payload, callback) {
  if (callback) {
    const jsonpOutput = callback + '(' + JSON.stringify(payload) + ')';
    return ContentService.createTextOutput(jsonpOutput)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}`;
}
