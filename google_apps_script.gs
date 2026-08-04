/**
 * RECOVERY TRACKER - Google Apps Script Backend (v1.1.5 - Minimal OAuth Permissions & Pure JSONP)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete all code in Code.gs and paste this exact file.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New deployment.
 * 6. Set 'Execute as': Me
 * 7. Set 'Who has access': Anyone  <-- CRITICAL!
 * 8. Click Deploy, click "Authorize access" (Advanced > Go to script > Allow), and copy the Web App URL!
 * 9. Paste the Web App URL into Recovery Tracker Settings.
 */

// Active Sheet Binding
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Ensure sheet tabs exist with correct headers
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
}

// GET Endpoint - Handles FETCH & JSONP for GET and SAVE actions
function doGet(e) {
  try {
    setupSheets();
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'get_all';
    const callback = params.callback;

    // Handle Save action via GET/JSONP if requested
    if (action === 'save_all' && params.data) {
      const dataObj = JSON.parse(decodeURIComponent(params.data));
      saveAllData(dataObj.medications || [], dataObj.logs || []);
      return respond({ status: 'success', message: 'Data saved successfully' }, callback);
    }

    // Default Action: Fetch all data
    const ss = getSpreadsheet();
    if (!ss) {
      return respond({ status: 'error', message: 'Spreadsheet not bound. Please run script from Extensions > Apps Script inside Google Sheets.' }, callback);
    }

    const medSheet = ss.getSheetByName('Medications');
    const logSheet = ss.getSheetByName('DoseLogs');

    const medData = getSheetObjects(medSheet);
    const logData = getSheetObjects(logSheet);

    const medications = medData.map(m => ({
      id: String(m.id || ''),
      name: String(m.name || ''),
      type: String(m.type || 'as-needed'),
      quantity: Number(m.quantity || 1),
      unit: String(m.unit || 'Tablet'),
      minIntervalHours: Number(m.minIntervalHours || 0),
      scheduledSlots: m.scheduledSlots ? String(m.scheduledSlots).split(',') : [],
      notes: String(m.notes || '')
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

    return respond({ status: 'success', data: { medications, logs } }, callback);
  } catch (err) {
    const callback = (e && e.parameter) ? e.parameter.callback : null;
    return respond({ status: 'error', message: err.toString() }, callback);
  }
}

// POST Endpoint - Handles standard POST requests
function doPost(e) {
  try {
    setupSheets();
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    const action = postData.action || 'save_all';

    if (action === 'save_all') {
      saveAllData(postData.medications || [], postData.logs || []);
      return respond({ status: 'success', message: 'All data synchronized successfully.' }, null);
    }

    return respond({ status: 'error', message: 'Unknown action parameter' }, null);
  } catch (err) {
    return respond({ status: 'error', message: err.toString() }, null);
  }
}

// Helper to save all data to sheets
function saveAllData(medications, logs) {
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
      new Date().toISOString()
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
}

// Helper to convert sheet rows into JSON objects
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

// Response Formatter
function respond(payload, callback) {
  if (callback) {
    const jsonpOutput = callback + '(' + JSON.stringify(payload) + ')';
    return ContentService.createTextOutput(jsonpOutput)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
