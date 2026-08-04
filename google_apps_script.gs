/**
 * RECOVERY TRACKER - Google Apps Script Backend (v1.1.1)
 * 
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any code in Code.gs and paste this entire code
 * 4. Click Save (disk icon)
 * 5. Click Deploy > New deployment (or Manage Deployments > Edit > New Version)
 * 6. Set 'Execute as': Me
 * 7. Set 'Who has access': Anyone  <-- CRITICAL: Must be "Anyone" for CORS to work!
 * 8. Click Deploy, authorize access, and copy the Web App URL!
 * 9. Paste the Web App URL into Recovery Tracker Settings.
 */

const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

// Ensure sheet tabs exist with correct column headers
function setupSheets() {
  let medSheet = SPREADSHEET.getSheetByName('Medications');
  if (!medSheet) {
    medSheet = SPREADSHEET.insertSheet('Medications');
    medSheet.appendRow(['id', 'name', 'type', 'quantity', 'unit', 'minIntervalHours', 'scheduledSlots', 'notes', 'updatedAt']);
    medSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#4A5568').setFontColor('#FFFFFF');
  }

  let logSheet = SPREADSHEET.getSheetByName('DoseLogs');
  if (!logSheet) {
    logSheet = SPREADSHEET.insertSheet('DoseLogs');
    logSheet.appendRow(['id', 'medicationId', 'medicationName', 'type', 'quantity', 'unit', 'timestamp', 'timeSlot', 'notes']);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#2B6CB0').setFontColor('#FFFFFF');
  }
}

// GET Endpoint - Fetch all medications and logs with CORS & JSONP support
function doGet(e) {
  setupSheets();
  try {
    const medSheet = SPREADSHEET.getSheetByName('Medications');
    const logSheet = SPREADSHEET.getSheetByName('DoseLogs');

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

    const payload = { status: 'success', data: { medications, logs } };
    
    // Support JSONP callback parameter if CORS is restricted
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return createJsonResponse(payload);
  } catch (err) {
    const errorPayload = { status: 'error', message: err.toString() };
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(errorPayload) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return createJsonResponse(errorPayload);
  }
}

// POST Endpoint - Save or Update Medications / Logs
function doPost(e) {
  setupSheets();
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    const action = postData.action || 'save_all';

    if (action === 'save_all') {
      const medications = postData.medications || [];
      const logs = postData.logs || [];

      // Update Medications sheet
      const medSheet = SPREADSHEET.getSheetByName('Medications');
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

      // Update DoseLogs sheet
      const logSheet = SPREADSHEET.getSheetByName('DoseLogs');
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

      return createJsonResponse({ status: 'success', message: 'All data synchronized successfully.' });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action parameter' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// Helper to convert sheet rows into JSON objects
function getSheetObjects(sheet) {
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

// Helper to construct HTTP JSON response
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
