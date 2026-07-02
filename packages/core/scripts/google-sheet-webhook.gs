/**
 * Google Apps Script — paste into Extensions → Apps Script on your Sheet.
 *
 * 1. Set BPASS_SECRET below (same value as BPass Settings → Webhook secret).
 * 2. Optional: set BPASS_REGULAR_TAB and BPASS_BACKUP_TAB (defaults: Regular, Backup).
 * 3. Deploy → Manage deployments → Edit → New version → Deploy
 *
 * Actions:
 *   add           → regular tab (append row when a new account is added in BPass)
 *   delete        → optional manual API (BPass does not call this on delete)
 *   backup / pull → backup tab (full backup and restore)
 * Only the target sheet TAB is modified — other tabs are untouched.
 */
const BPASS_SECRET = "paste-your-secret-here-min-16-chars";
const BPASS_REGULAR_TAB = "Regular";
const BPASS_BACKUP_TAB = "Backup";

var HEADER = [
  "issuer",
  "label",
  "secret",
  "algorithm",
  "digits",
  "period",
  "createdAt",
];

function normalizeSecret(secret) {
  return String(secret || "")
    .replace(/\s+/g, "")
    .replace(/=+$/, "")
    .toUpperCase();
}

function unauthorized() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, error: "Unauthorized" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function jsonOk(payload) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(message) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, error: message }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function parsePayload(e) {
  var data = {};
  if (e && e.parameter) {
    data = Object.assign({}, e.parameter);
  }
  if (e && e.postData && e.postData.contents) {
    var type = String(e.postData.type || "").toLowerCase();
    if (
      type.indexOf("application/json") !== -1 ||
      type.indexOf("text/plain") !== -1
    ) {
      try {
        data = Object.assign(data, JSON.parse(e.postData.contents));
      } catch (err) {
        // ignore invalid JSON
      }
    }
  }
  if (typeof data.accounts === "string") {
    try {
      data.accounts = JSON.parse(data.accounts);
    } catch (err) {
      data.accounts = [];
    }
  }
  return data;
}

function resolveAction(data) {
  return String(data.action || "").trim().toLowerCase();
}

function resolveSheetTab(data, action) {
  var fromRequest = String(data.sheetTab || "").trim();
  if (fromRequest) return fromRequest;
  if (action === "backup" || action === "pull") {
    return String(BPASS_BACKUP_TAB || "").trim();
  }
  return String(BPASS_REGULAR_TAB || "").trim();
}

function getTargetSheet(spreadsheet, sheetTab) {
  var name = String(sheetTab || "").trim();
  if (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      throw new Error('Sheet tab "' + name + '" was not found in this spreadsheet.');
    }
    return sheet;
  }
  return spreadsheet.getActiveSheet();
}

function isHeaderRow(row) {
  var first = String(row[0] || "").trim().toLowerCase();
  var third = String(row[2] || "").trim().toLowerCase();
  return first === "issuer" || third === "secret";
}

function findSecretColumnIndex(headers) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || "").trim().toLowerCase() === "secret") {
      return i;
    }
  }
  return 2;
}

function writeHeader(sheet) {
  sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
}

function clearSheetTab(sheet) {
  sheet.clear();
  writeHeader(sheet);
}

function deleteRowBySecret(sheet, secret) {
  var target = normalizeSecret(secret);
  if (!target) return 0;

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return 0;

  var secretCol = 2;
  var startRow = 0;

  if (isHeaderRow(values[0])) {
    secretCol = findSecretColumnIndex(values[0]);
    startRow = 1;
  }

  var removed = 0;
  for (var i = values.length - 1; i >= startRow; i--) {
    var rowSecret = normalizeSecret(values[i][secretCol]);
    if (rowSecret && rowSecret === target) {
      sheet.deleteRow(i + 1);
      removed++;
    }
  }

  return removed;
}

function backupAllAccounts(sheet, accounts) {
  clearSheetTab(sheet);

  if (!accounts || !accounts.length) {
    return 0;
  }

  var rows = accounts.map(function (a) {
    return [
      a.issuer || "",
      a.label || "",
      normalizeSecret(a.secret),
      a.algorithm || "SHA1",
      Number(a.digits) || 6,
      Number(a.period) || 30,
      a.createdAt || new Date().toISOString(),
    ];
  });

  sheet.getRange(2, 1, rows.length, HEADER.length).setValues(rows);
  return rows.length;
}

function pullAllAccounts(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return [];
  }

  var startRow = 0;
  var issuerCol = 0;
  var labelCol = 1;
  var secretCol = 2;
  var algorithmCol = 3;
  var digitsCol = 4;
  var periodCol = 5;

  if (isHeaderRow(values[0])) {
    startRow = 1;
    var headers = values[0];
    for (var h = 0; h < headers.length; h++) {
      var key = String(headers[h] || "").trim().toLowerCase();
      if (key === "issuer") issuerCol = h;
      if (key === "label") labelCol = h;
      if (key === "secret") secretCol = h;
      if (key === "algorithm") algorithmCol = h;
      if (key === "digits") digitsCol = h;
      if (key === "period") periodCol = h;
    }
  }

  var accounts = [];
  for (var i = startRow; i < values.length; i++) {
    var row = values[i];
    var secret = normalizeSecret(row[secretCol]);
    if (!secret) continue;

    accounts.push({
      issuer: String(row[issuerCol] || "Unknown"),
      label: String(row[labelCol] || ""),
      secret: secret,
      algorithm: String(row[algorithmCol] || "SHA1"),
      digits: Number(row[digitsCol]) || 6,
      period: Number(row[periodCol]) || 30,
    });
  }

  return accounts;
}

function handleRequest(e) {
  var data = parsePayload(e);
  var token = String(data.token || "");

  if (!BPASS_SECRET || BPASS_SECRET.length < 16 || token !== BPASS_SECRET) {
    return unauthorized();
  }

  var action = resolveAction(data);
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTab = resolveSheetTab(data, action);

  try {
    var sheet = getTargetSheet(spreadsheet, sheetTab);
  } catch (err) {
    return jsonError(err.message || String(err));
  }

  if (action === "delete") {
    var removed = deleteRowBySecret(sheet, data.secret);
    return jsonOk({ removed: removed });
  }

  if (action === "backup") {
    try {
      var accounts = data.accounts || [];
      var written = backupAllAccounts(sheet, accounts);
      return jsonOk({ written: written, sheetTab: sheet.getName() });
    } catch (err) {
      return jsonError(err.message || String(err));
    }
  }

  if (action === "pull") {
    var pulled = pullAllAccounts(sheet);
    return jsonOk({ accounts: pulled, sheetTab: sheet.getName() });
  }

  if (action === "add") {
    sheet.appendRow([
      data.issuer || "",
      data.label || "",
      normalizeSecret(data.secret),
      data.algorithm || "SHA1",
      Number(data.digits) || 6,
      Number(data.period) || 30,
      data.createdAt || new Date().toISOString(),
    ]);
    return jsonOk({});
  }

  return jsonError("Unknown action. Use add, delete, backup, or pull.");
}

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}
