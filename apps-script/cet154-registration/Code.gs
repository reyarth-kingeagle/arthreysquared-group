/**
 * ARTHREYSQUARED CET154 Student Registry registration backend.
 * Google Apps Script, bound to the instructor-owned CET154 Student Registry.
 * The script runs as its owner, but exposes ONLY the narrow functions below.
 * IMPORTANT: Roster name matching is eligibility, not proof of email ownership.
 */
var CET154 = Object.freeze({
  HEADER: ['Student ID Number','Verified Email','Family Name','Given Name','Middle Name','Section','Passcode'],
  DOMAIN: 'g.msuiit.edu.ph',
  MAX_ROWS: 400,
  MIN_PASSCODE_LENGTH: 8,
  RATE_WINDOW_SECONDS: 600,
  MAX_ATTEMPTS: 8
});

/** Run this once, from the bound Apps Script editor, as the Sheet owner. */
function setupOnce() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Open Apps Script from the CET154 registry (Extensions > Apps Script).');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('CET154_REGISTRY_ID', active.getId());
  if (!props.getProperty('CET154_PEPPER')) {
    props.setProperty('CET154_PEPPER', Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid());
  }
  var eligible = activeTabs_(active);
  if (!eligible.length) throw new Error('No valid active roster tabs found. Check header row A:G.');
  return 'Private registry configured; eligible sections: ' + eligible.map(function(s){return s.getName();}).join(', ');
}

/** Page runs on Google's Apps Script host; private spreadsheet never leaves server. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('CET154 Student Enrollment | ARTHREYSQUARED');
}

/** Exposes ONLY active section labels, never the administration roster names. */
function getRegistrationSections() {
  var ss = openRegistry_();
  return activeTabs_(ss).map(function(sheet) { return sheet.getName(); });
}

/**
 * Registration policy explicitly requested by instructor:
 *  - exact full-name match in chosen section and otherwise empty data -> fill row;
 *  - complete row -> already registered;
 *  - missing/ambiguous/partially filled -> contact instructor;
 *  - never append a new student or overwrite existing registration values.
 */
function submitRegistration(form) {
  var student = validateInput_(form);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('CET154_PEPPER');
    if (!secret || secret.length < 60) throw new Error('The instructor must run setupOnce before registration opens.');
    rateLimit_(student, secret);

    var ss = openRegistry_();
    var sheets = activeTabs_(ss);
    var sectionSheet = sheets.filter(function(s){ return normalized_(s.getName()) === normalized_(student.section); })[0];
    if (!sectionSheet) return failure_('CONTACT_INSTRUCTOR');
    var section = sectionSheet.getName();
    var lastRow = sectionSheet.getLastRow();
    if (lastRow < 2 || lastRow - 1 > CET154.MAX_ROWS) return failure_('CONTACT_INSTRUCTOR');

    var values = sectionSheet.getRange(2, 1, lastRow - 1, 7).getDisplayValues();
    var matches = [];
    for (var i = 0; i < values.length; i++) {
      if (normalized_(values[i][2]) === normalized_(student.familyName) &&
          normalized_(values[i][3]) === normalized_(student.givenName)) matches.push(i);
    }
    if (matches.length !== 1) return failure_('CONTACT_INSTRUCTOR');

    var existing = values[matches[0]];
    var registrationCells = [existing[0], existing[1], existing[4], existing[5], existing[6]];
    var allFilled = registrationCells.every(function(cell){ return String(cell).trim() !== ''; });
    if (allFilled) return {ok:false, status:'ALREADY_REGISTERED', message:'This name is already registered in the selected section. Please contact your instructor if you believe this is an error.'};
    if (registrationCells.some(function(cell){return String(cell).trim() !== '';})) return failure_('CONTACT_INSTRUCTOR');

    // Prevent two different names from claiming the same ID or email within active sections.
    for (var s = 0; s < sheets.length; s++) {
      var current = sheets[s];
      var last = current.getLastRow();
      if (last <= 1 || last - 1 > CET154.MAX_ROWS) return failure_('CONTACT_INSTRUCTOR');
      var identities = current.getRange(2, 1, last - 1, 2).getDisplayValues();
      for (var j = 0; j < identities.length; j++) {
        if (current.getSheetId() === sectionSheet.getSheetId() && j === matches[0]) continue;
        if (normalized_(identities[j][0]) === normalized_(student.studentId) ||
            normalized_(identities[j][1]) === normalized_(student.email)) return failure_('CONTACT_INSTRUCTOR');
      }
    }

    var row = matches[0] + 2;
    var range = sectionSheet.getRange(row, 1, 1, 7);
    var original = range.getValues()[0];
    var formulas = range.getFormulas()[0];
    var passcodeRepresentation = passcodeHash_(student.passcode, secret);
    // One row write: preserve instructor-supplied names and existing name formulas.
    original[0] = student.studentId;
    original[1] = student.email;
    original[2] = formulas[2] || original[2];
    original[3] = formulas[3] || original[3];
    original[4] = student.middleName;
    original[5] = section;
    original[6] = passcodeRepresentation;
    sectionSheet.getRange(row, 1).setNumberFormat('@');
    sectionSheet.getRange(row, 2).setNumberFormat('@');
    sectionSheet.getRange(row, 7).setNumberFormat('@');
    range.setValues([original]);
    SpreadsheetApp.flush();
    return {ok:true, status:'REGISTERED', message:'CET154 registration successful. Your information was saved to your existing section roster record.'};
  } finally { lock.releaseLock(); }
}

function validateInput_(x) {
  if (!x || typeof x !== 'object') throw new Error('Complete all required fields.');
  var result = {};
  ['studentId','familyName','givenName','middleName','section','email','passcode','confirmPasscode'].forEach(function(k){
    if (typeof x[k] !== 'string') throw new Error('Complete all required fields.');
    result[k] = x[k].trim();
  });
  ['studentId','familyName','givenName','middleName','section','email'].forEach(function(k){
    var value=result[k];
    if (!value || value.length > 120 || /^[=+@]/.test(value)) throw new Error('Complete all required fields using ordinary text.');
  });
  if (!/^[\p{L}\p{N} -]{3,40}$/u.test(result.studentId)) throw new Error('Enter a valid Student ID Number.');
  ['familyName','givenName','middleName'].forEach(function(k){
    if (!/^[\p{L}\p{M}0-9 .,'’\-]+$/u.test(result[k])) throw new Error('Enter a valid full name.');
  });
  if (!/^[\w.+-]+@g\.msuiit\.edu\.ph$/i.test(result.email)) throw new Error('Use your MSU-IIT institutional email.');
  result.email = result.email.toLowerCase();
  if (result.passcode.length < CET154.MIN_PASSCODE_LENGTH || result.passcode.length > 128) throw new Error('Use a passcode of at least 8 characters.');
  if (result.passcode !== result.confirmPasscode) throw new Error('Passcodes do not match.');
  delete result.confirmPasscode;
  return result;
}

function normalized_(value) { return String(value === null || value === undefined ? '' : value).normalize('NFKC').replace(/\s+/g,' ').trim().toUpperCase(); }
function failure_(status) { return {ok:false,status:status,message:'We could not verify this student in the selected section. Please contact your instructor for re-verification.'}; }
function validHeader_(sheet) {
  if (/^ARCHIVE_/i.test(sheet.getName())) return false;
  if (sheet.getLastColumn() < 7 || sheet.getLastRow() < 2) return false;
  var header = sheet.getRange(1,1,1,7).getDisplayValues()[0];
  return CET154.HEADER.every(function(name,i){return normalized_(header[i]) === normalized_(name);});
}
function activeTabs_(ss) { return ss.getSheets().filter(validHeader_); }
function openRegistry_() {
  var id = PropertiesService.getScriptProperties().getProperty('CET154_REGISTRY_ID');
  if (!id) throw new Error('Registry setup is incomplete; ask your instructor.');
  return SpreadsheetApp.openById(id);
}
function rateLimit_(student, secret) {
  var key = 'r:' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(normalized_(student.section) + ':' + normalized_(student.familyName) + ':' + normalized_(student.givenName),secret)).slice(0,32);
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || '0') + 1;
  cache.put(key, String(count), CET154.RATE_WINDOW_SECONDS);
  if (count > CET154.MAX_ATTEMPTS) throw new Error('Too many registration attempts. Contact your instructor.');
}
/** Server-peppered, salted HMAC for an access passcode, NOT a general-purpose password KDF.
 * Students must use a NEW 8+ character passcode never reused for an actual account.\n * Longer, randomly generated passcodes are preferable; 8 is only the minimum.
 * If password-based login is added, migrate to Argon2id/scrypt on a trusted backend. */
function passcodeHash_(passcode, secret) {
  var salt = Utilities.getUuid();
  var digest = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(salt + ':' + passcode, secret)).replace(/=+$/,'');
  return 'hmac256$v1$' + salt + '$' + digest;
}
/** Used only by future server-side access checks; never expose passcode digest to students. */
function verifyPasscode_(passcode, stored) {
  if (typeof passcode !== 'string' || typeof stored !== 'string') return false;
  var pieces=stored.split('$');
  if (pieces.length!==4 || pieces[0]!=='hmac256' || pieces[1]!=='v1') return false;
  var pepper=PropertiesService.getScriptProperties().getProperty('CET154_PEPPER');
  if (!pepper) return false;
  var check=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(pieces[2] + ':' + passcode,pepper)).replace(/=+$/,'');
  // Constant-size HMAC strings; mismatch comparison. Authentication should add rate limits.
  var difference=check.length ^ pieces[3].length;
  for(var i=0;i<Math.max(check.length,pieces[3].length);i++) difference |= (check.charCodeAt(i)||0) ^ (pieces[3].charCodeAt(i)||0);
  return difference===0;
}