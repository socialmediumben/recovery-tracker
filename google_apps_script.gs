/**
 * RECOVERY TRACKER - Google Apps Script Backend (v2.4.0 - Notifications & Multi-Device Tracker)
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

  // 1. Medications Sheet
  let medSheet = ss.getSheetByName('Medications');
  if (!medSheet) {
    medSheet = ss.insertSheet('Medications');
    medSheet.appendRow(['id', 'name', 'type', 'quantity', 'unit', 'minIntervalHours', 'scheduledSlots', 'notes', 'updatedAt']);
    medSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4A5568').setFontColor('#FFFFFF');
  }

  // 2. Medication Dose Logs Sheet
  let logSheet = ss.getSheetByName('DoseLogs');
  if (!logSheet) {
    logSheet = ss.insertSheet('DoseLogs');
    logSheet.appendRow(['id', 'medicationId', 'medicationName', 'type', 'quantity', 'unit', 'timestamp', 'timeSlot', 'notes']);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#2B6CB0').setFontColor('#FFFFFF');
  }

  // 3. Medical Drain Logs Sheet
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

    // Save action via GET/JSONP
    if (action === 'save_all' && params.data) {
      const dataObj = JSON.parse(decodeURIComponent(params.data));
      saveAllData(dataObj.medications || [], dataObj.logs || [], dataObj.drainLogs || []);
      return respond({ status: 'success', message: 'Data saved successfully' }, callback);
    }

    // Default Action: Fetch all data
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

  // Save Medications
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

  // Save Dose Logs
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

  // Save Drain Logs
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
}
