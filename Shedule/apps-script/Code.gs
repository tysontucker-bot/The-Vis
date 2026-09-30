/**
 * Sched bathroom timers — Google Apps Script backend.
 * Paste this whole file into Extensions → Apps Script on a new Google Sheet.
 * Then replace PASTE_SECRET_CODE_HERE with the secret code shown in
 * Sched → Settings → Set up bathroom timers.
 */
const SECRET_CODE = "PASTE_SECRET_CODE_HERE";

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!SECRET_CODE || SECRET_CODE === "PASTE_SECRET_CODE_HERE" || p.key !== SECRET_CODE) {
    return json({ ok: false, error: "wrong-code" });
  }

  const props = PropertiesService.getScriptProperties();

  if (p.action === "reset" && p.student) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const now = new Date();
      const id = String(p.student).slice(0, 40);
      props.setProperty("last_" + id, now.toISOString());
      logSheet().appendRow([now, String(p.label || id).slice(0, 10), String(p.source || "qr").slice(0, 10)]);
    } finally {
      lock.releaseLock();
    }
  }

  const all = props.getProperties();
  const last = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf("last_") === 0) last[k.slice(5)] = all[k];
  });
  return json({ ok: true, last: last, now: new Date().toISOString() });
}

function logSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Bathroom Log");
  if (!sheet) {
    sheet = ss.insertSheet("Bathroom Log");
    sheet.appendRow(["Time", "Student", "Logged from"]);
    sheet.getRange("A:A").setNumberFormat("m/d/yyyy h:mm am/pm");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
