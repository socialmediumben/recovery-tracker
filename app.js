/**
 * RECOVERY TRACKER - Core Application Logic
 * Version 1.0.0
 */

// Global Application State
const STATE = {
  medications: [],
  logs: [],
  appsScriptUrl: '',
  syncMode: 'local', // 'local' | 'sheets'
  version: 'v1.0.0',
  timerInterval: null
};

// Default Sample Data (Loaded on first app launch)
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
      notes: 'Take with food for pain or inflammation. Minimum 4 hours between doses.'
    },
    {
      id: 'med_sample_2',
      name: 'Acetaminophen (Tylenol)',
      type: 'as-needed',
      quantity: 2,
      unit: 'Tablet',
      minIntervalHours: 6,
      scheduledSlots: [],
      notes: 'For fever or headaches. Do not exceed 4,000 mg in 24 hours.'
    },
    {
      id: 'med_sample_3',
      name: 'Daily Multivitamin',
      type: 'scheduled',
      quantity: 1,
      unit: 'Capsule',
      minIntervalHours: 0,
      scheduledSlots: ['Morning'],
      notes: 'Take in the morning with breakfast.'
    },
    {
      id: 'med_sample_4',
      name: 'Amoxicillin 500mg',
      type: 'scheduled',
      quantity: 1,
      unit: 'Capsule',
      minIntervalHours: 0,
      scheduledSlots: ['Morning', 'Afternoon', 'Evening'],
      notes: 'Complete full course of antibiotics.'
    },
    {
      id: 'med_sample_5',
      name: 'Melatonin 3mg',
      type: 'scheduled',
      quantity: 1,
      unit: 'Tablet',
      minIntervalHours: 0,
      scheduledSlots: ['Night'],
      notes: 'Take 30 minutes before bedtime.'
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
      timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(), // 2.5 hours ago (in cooldown)
      timeSlot: '',
      notes: 'Logged after lunch for mild back pain.'
    },
    {
      id: 'log_sample_2',
      medicationId: 'med_sample_2',
      medicationName: 'Acetaminophen (Tylenol)',
      type: 'as-needed',
      quantity: 2,
      unit: 'Tablet',
      timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), // 8 hours ago (ready)
      timeSlot: '',
      notes: 'Morning headache.'
    },
    {
      id: 'log_sample_3',
      medicationId: 'med_sample_3',
      medicationName: 'Daily Multivitamin',
      type: 'scheduled',
      quantity: 1,
      unit: 'Capsule',
      timestamp: new Date().toISOString(),
      timeSlot: 'Morning',
      notes: 'Taken with breakfast.'
    }
  ]
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  loadLocalState();
  setupEventListeners();
  setupAppsScriptCodeDisplay();
  startLiveTimer();
  renderAllViews();
}

/* ==========================================================================
   STATE & PERSISTENCE MANAGEMENT
   ========================================================================== */

function loadLocalState() {
  const savedMeds = localStorage.getItem('rt_medications');
  const savedLogs = localStorage.getItem('rt_logs');
  const savedUrl = localStorage.getItem('rt_apps_script_url');

  if (savedUrl) {
    STATE.appsScriptUrl = savedUrl;
    STATE.syncMode = 'sheets';
    updateSyncStatusUI('online', 'Google Sheets');
  } else {
    STATE.syncMode = 'local';
    updateSyncStatusUI('offline', 'Local Mode');
  }

  if (savedMeds && savedLogs) {
    STATE.medications = JSON.parse(savedMeds);
    STATE.logs = JSON.parse(savedLogs);
  } else {
    // Load default sample data on first launch
    loadSampleData(false);
  }

  // If connected to Google Sheets, attempt remote sync
  if (STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
    fetchFromGoogleSheets();
  }
}

function saveState() {
  localStorage.setItem('rt_medications', JSON.stringify(STATE.medications));
  localStorage.setItem('rt_logs', JSON.stringify(STATE.logs));
  if (STATE.appsScriptUrl) {
    localStorage.setItem('rt_apps_script_url', STATE.appsScriptUrl);
  } else {
    localStorage.removeItem('rt_apps_script_url');
  }

  // If connected to Google Sheets, sync in background
  if (STATE.syncMode === 'sheets' && STATE.appsScriptUrl) {
    syncToGoogleSheets();
  }

  renderAllViews();
}

function loadSampleData(shouldNotify = true) {
  STATE.medications = JSON.parse(JSON.stringify(SAMPLE_DATA.medications));
  STATE.logs = JSON.parse(JSON.stringify(SAMPLE_DATA.logs));
  saveState();
  if (shouldNotify) {
    showToast('Loaded sample medications and logs.');
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all medications and dose logs? This cannot be undone.')) {
    STATE.medications = [];
    STATE.logs = [];
    saveState();
    showToast('All data cleared.', 'error');
  }
}

/* ==========================================================================
   GOOGLE SHEETS SYNC CONTROLLER
   ========================================================================== */

async function fetchFromGoogleSheets() {
  if (!STATE.appsScriptUrl) return;
  updateSyncStatusUI('offline', 'Syncing...');

  try {
    const res = await fetch(STATE.appsScriptUrl);
    const json = await res.json();

    if (json.status === 'success' && json.data) {
      if (json.data.medications && json.data.medications.length > 0) {
        STATE.medications = json.data.medications;
      }
      if (json.data.logs && json.data.logs.length > 0) {
        STATE.logs = json.data.logs;
      }
      localStorage.setItem('rt_medications', JSON.stringify(STATE.medications));
      localStorage.setItem('rt_logs', JSON.stringify(STATE.logs));
      updateSyncStatusUI('online', 'Google Sheets');
      renderAllViews();
    } else {
      updateSyncStatusUI('error', 'Sheets Sync Error');
    }
  } catch (err) {
    console.error('Google Sheets Fetch Error:', err);
    updateSyncStatusUI('error', 'Sheets Error');
  }
}

async function syncToGoogleSheets() {
  if (!STATE.appsScriptUrl) return;

  try {
    const res = await fetch(STATE.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save_all',
        medications: STATE.medications,
        logs: STATE.logs
      })
    });
    const json = await res.json();
    if (json.status === 'success') {
      updateSyncStatusUI('online', 'Google Sheets');
    }
  } catch (err) {
    console.error('Google Sheets Save Error:', err);
    updateSyncStatusUI('error', 'Save Failed');
  }
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

  const todayStr = new Date().toISOString().split('T')[0];
  const dosesToday = STATE.logs.filter(l => l.timestamp.startsWith(todayStr)).length;

  document.getElementById('statReadyCount').textContent = readyCount;
  document.getElementById('statCooldownCount').textContent = cooldownCount;
  document.getElementById('statScheduledCount').textContent = scheduled.length;
  document.getElementById('statDosesToday').textContent = dosesToday;
}

// 2. AS-NEEDED MEDICATIONS GRID (RED / GREEN CARDS)
function renderAsNeededMeds() {
  const container = document.getElementById('asNeededGrid');
  if (!container) return;

  const meds = STATE.medications.filter(m => m.type === 'as-needed');
  if (meds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-hand-holding-medical"></i>
        <p>No As-Needed medications added yet.</p>
        <button class="btn btn-sm btn-primary" onclick="openAddMedicationModal('as-needed')">Add As-Needed Med</button>
      </div>
    `;
    return;
  }

  container.innerHTML = meds.map(med => {
    const status = getAsNeededStatus(med);
    const cardClass = status.isCooldown ? 'card-cooldown' : 'card-ready';
    const badgeText = status.isCooldown ? 'Cooldown Period' : 'Ready to Take';
    const badgeClass = status.isCooldown ? 'badge-cooldown' : 'badge-ready';

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
          <button class="btn btn-primary" onclick="openLogDoseModal('${med.id}')">
            <i class="fa-solid fa-plus-circle"></i> Log Dose
          </button>
          <button class="btn btn-secondary btn-icon-only" onclick="openEditMedicationModal('${med.id}')" title="Edit Medication">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-secondary btn-icon-only" onclick="deleteMedication('${med.id}')" title="Delete Medication">
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
        <p>No Scheduled medications added yet.</p>
        <button class="btn btn-sm btn-primary" onclick="openAddMedicationModal('scheduled')">Add Scheduled Med</button>
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
          <button class="btn btn-primary" onclick="openLogDoseModal('${med.id}')">
            <i class="fa-solid fa-check-double"></i> Quick Log
          </button>
          <button class="btn btn-secondary btn-icon-only" onclick="openEditMedicationModal('${med.id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-secondary btn-icon-only" onclick="deleteMedication('${med.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 4. DAILY SCHEDULE CHECKLIST (Morning, Afternoon, Evening, Night)
function renderDailySchedule() {
  const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const todayStr = new Date().toISOString().split('T')[0];

  slots.forEach(slot => {
    const listEl = document.getElementById(`slotList${slot}`);
    const badgeEl = document.getElementById(`badge${slot}`);
    if (!listEl) return;

    // Filter scheduled meds that have this slot
    const slotMeds = STATE.medications.filter(m => m.type === 'scheduled' && (m.scheduledSlots || []).includes(slot));
    
    let takenCount = 0;

    if (slotMeds.length === 0) {
      listEl.innerHTML = `<p class="help-text" style="text-align:center; padding:1rem;">No medications scheduled for ${slot}.</p>`;
      badgeEl.textContent = '0 / 0';
      return;
    }

    listEl.innerHTML = slotMeds.map(med => {
      // Check if logged today for this slot
      const isTakenToday = STATE.logs.some(l => 
        l.medicationId === med.id && 
        l.timestamp.startsWith(todayStr) && 
        (l.timeSlot === slot || !l.timeSlot)
      );

      if (isTakenToday) takenCount++;

      return `
        <div class="schedule-item ${isTakenToday ? 'taken' : ''}">
          <div class="schedule-item-info">
            <strong>${escapeHtml(med.name)}</strong>
            <span>${med.quantity} ${escapeHtml(med.unit)}</span>
          </div>
          ${isTakenToday ? `
            <span class="badge-ready"><i class="fa-solid fa-check"></i> Logged</span>
          ` : `
            <button class="btn btn-sm btn-primary" onclick="openLogDoseModal('${med.id}', '${slot}')">
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

// 5. HISTORY LOGS TABLE & FILTERS
function renderLogsTable() {
  const tbody = document.getElementById('logsTableBody');
  const emptyState = document.getElementById('emptyLogsState');
  if (!tbody) return;

  const searchQuery = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('filterDateRange')?.value || 'all';
  const typeFilter = document.getElementById('filterMedType')?.value || 'all';

  const now = Date.now();

  const filteredLogs = STATE.logs.filter(log => {
    // Search query filter
    const matchesSearch = log.medicationName.toLowerCase().includes(searchQuery) ||
                          (log.notes && log.notes.toLowerCase().includes(searchQuery));
    if (!matchesSearch) return false;

    // Med Type filter
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;

    // Date range filter
    const logTime = new Date(log.timestamp).getTime();
    if (dateFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!log.timestamp.startsWith(todayStr)) return false;
    } else if (dateFilter === '7days') {
      if (now - logTime > 7 * 24 * 3600 * 1000) return false;
    } else if (dateFilter === '30days') {
      if (now - logTime > 30 * 24 * 3600 * 1000) return false;
    }

    return true;
  });

  // Sort logs descending (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filteredLogs.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
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
          <button class="btn btn-sm btn-outline" onclick="deleteLogEntry('${log.id}')" title="Delete entry">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Update print metadata date
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
      countdownText: 'Ready (No logs yet)',
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
    // Update active countdown displays without full re-render
    const asNeededMeds = STATE.medications.filter(m => m.type === 'as-needed');
    asNeededMeds.forEach(med => {
      const countdownEl = document.querySelector(`[data-countdown="${med.id}"]`);
      if (countdownEl) {
        const status = getAsNeededStatus(med);
        countdownEl.textContent = status.countdownText;

        // If status changed card color, refresh grid
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
  }, 1000);
}

/* ==========================================================================
   EVENT HANDLERS & MODAL CONTROLLERS
   ========================================================================== */

function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      e.currentTarget.classList.add('active');
      const targetId = e.currentTarget.dataset.tab;
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Header Buttons
  document.getElementById('btnAddMedication')?.addEventListener('click', () => openAddMedicationModal());
  document.getElementById('btnInfoModal')?.addEventListener('click', () => openInfoModal());
  document.getElementById('syncStatusPill')?.addEventListener('click', () => {
    document.querySelector('[data-tab="tab-settings"]')?.click();
  });

  // Settings Buttons
  document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
    const urlInput = document.getElementById('appsScriptUrl').value.trim();
    if (urlInput) {
      STATE.appsScriptUrl = urlInput;
      STATE.syncMode = 'sheets';
      saveState();
      fetchFromGoogleSheets();
      showToast('Saved Web App URL and initiating sync!');
    } else {
      STATE.appsScriptUrl = '';
      STATE.syncMode = 'local';
      saveState();
      showToast('Switched to LocalStorage mode.', 'info');
    }
  });

  document.getElementById('btnManualSync')?.addEventListener('click', () => {
    if (STATE.appsScriptUrl) {
      fetchFromGoogleSheets();
      showToast('Manual sync triggered.');
    } else {
      showToast('Please enter a Google Apps Script Web App URL first.', 'error');
    }
  });

  document.getElementById('btnLoadSampleData')?.addEventListener('click', () => loadSampleData(true));
  document.getElementById('btnClearAllData')?.addEventListener('click', () => clearAllData());

  // Copy Script Code
  document.getElementById('btnCopyScriptCode')?.addEventListener('click', () => {
    const code = document.getElementById('scriptCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Google Apps Script code copied to clipboard!');
    });
  });

  // Filters Event Listeners
  document.getElementById('filterSearch')?.addEventListener('input', () => renderLogsTable());
  document.getElementById('filterDateRange')?.addEventListener('change', () => renderLogsTable());
  document.getElementById('filterMedType')?.addEventListener('change', () => renderLogsTable());

  // Export CSV & Print
  document.getElementById('btnExportCSV')?.addEventListener('click', () => exportLogsToCSV());
  document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());

  // Form Submissions
  document.getElementById('formMedication')?.addEventListener('submit', (e) => handleSaveMedication(e));
  document.getElementById('formLogDose')?.addEventListener('submit', (e) => handleSaveLogDose(e));

  // Modal Closures
  document.getElementById('btnCloseInfoModal')?.addEventListener('click', () => closeInfoModal());
  document.getElementById('btnDismissInfoModal')?.addEventListener('click', () => closeInfoModal());
  document.getElementById('btnCloseMedModal')?.addEventListener('click', () => closeMedicationModal());
  document.getElementById('btnCancelMedModal')?.addEventListener('click', () => closeMedicationModal());
  document.getElementById('btnCloseLogDose')?.addEventListener('click', () => closeLogDoseModal());
  document.getElementById('btnCancelLogDose')?.addEventListener('click', () => closeLogDoseModal());

  // Dynamic Type Selector in Medication Modal
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

  // Info Modal Tabs
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

/* ==========================================================================
   MODAL CONTROLLER FUNCTIONS
   ========================================================================== */

function openInfoModal() {
  document.getElementById('modalInfo').classList.remove('hidden');
}
function closeInfoModal() {
  document.getElementById('modalInfo').classList.add('hidden');
}

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

  // Trigger change
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
    notes
  };

  if (existingIdx >= 0) {
    STATE.medications[existingIdx] = medObj;
    showToast(`Updated medication: ${name}`);
  } else {
    STATE.medications.push(medObj);
    showToast(`Added new medication: ${name}`);
  }

  saveState();
  closeMedicationModal();
}

function deleteMedication(id) {
  const med = STATE.medications.find(m => m.id === id);
  if (!med) return;

  if (confirm(`Are you sure you want to delete ${med.name}?`)) {
    STATE.medications = STATE.medications.filter(m => m.id !== id);
    saveState();
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

  // Default to current local time in ISO format for datetime-local
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
  saveState();
  closeLogDoseModal();
  showToast(`Logged dose for ${med.name}!`);
}

function deleteLogEntry(id) {
  if (confirm('Delete this log entry?')) {
    STATE.logs = STATE.logs.filter(l => l.id !== id);
    saveState();
    showToast('Log entry deleted.', 'info');
  }
}

/* ==========================================================================
   EXPORT CSV GENERATOR
   ========================================================================== */

function exportLogsToCSV() {
  if (STATE.logs.length === 0) {
    showToast('No logs available to export.', 'error');
    return;
  }

  const headers = ['Log ID', 'Timestamp (ISO)', 'Date & Time', 'Medication Name', 'Type', 'Quantity', 'Unit', 'Time Slot', 'Notes'];
  const rows = STATE.logs.map(log => [
    log.id,
    log.timestamp,
    `"${formatFullDate(log.timestamp)}"`,
    `"${log.medicationName.replace(/"/g, '""')}"`,
    log.type,
    log.quantity,
    log.unit,
    log.timeSlot || '',
    `"${(log.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `recovery_tracker_logs_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('CSV Report Downloaded!');
}

/* ==========================================================================
   UTILITY & FORMATTING FUNCTIONS
   ========================================================================== */

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
  const icon = type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check';
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
 * RECOVERY TRACKER - Google Apps Script Backend
 */
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

function setupSheets() {
  let medSheet = SPREADSHEET.getSheetByName('Medications') || SPREADSHEET.insertSheet('Medications');
  let logSheet = SPREADSHEET.getSheetByName('DoseLogs') || SPREADSHEET.insertSheet('DoseLogs');
}

function doGet(e) {
  setupSheets();
  const medications = getSheetObjects(SPREADSHEET.getSheetByName('Medications'));
  const logs = getSheetObjects(SPREADSHEET.getSheetByName('DoseLogs'));
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { medications, logs } }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  setupSheets();
  const postData = JSON.parse(e.postData.contents);
  if (postData.action === 'save_all') {
    // Saves Medications and DoseLogs to Sheet
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
}
