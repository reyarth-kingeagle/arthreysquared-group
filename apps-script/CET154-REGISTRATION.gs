/**
 * CET154 student enrollment pilot — install in a STANDALONE Google Apps Script project.
 * Google Forms handles verified school-account registration (NO passwords/passcodes).
 * The connected PRIVATE Sheets/Drive files must never be shared with students.
 *
 * Installation instructions: ../STUDENT-REGISTRATION-SETUP.md
 *
 * Script Properties required:
 *   COURSE_FOLDER_ID, MASTER_SPREADSHEET_ID,
 *   SECTIONS_JSON (e.g. ["ACTUAL SECTION NAME 1","ACTUAL SECTION NAME 2"])
 *
 * DO NOT use ScriptApp web-app doPost() accepting unauthenticated names/email.
 * onCET154Registration must only run as an installable Google Form submit trigger.
 */
const CET154 = Object.freeze({
  code:'CET154',
  domain:'g.msuiit.edu.ph',
  registryName:'CET154 — Student Registry (PRIVATE)',
  formTitle:'CET154 — Student Registration',
  dataset:'Student Dataset',
  grading:'Grading System',
  scoreLedger:'Score Ledger',
  audit:'Registration Audit',
  masterRequired:['Student Dataset','Grading System','Score Ledger','CO Evidence','CO Attainment','Assessment Blueprint','Settings','Registration Audit']
});
const REGISTRY_HEADERS=['Student UID','Student ID Number','Verified Email','Family Name','Given Name','Middle Initial','Section','Section Sheet ID','Enrollment Status','Registered At'];

function configuration_() {
  const p=PropertiesService.getScriptProperties();
  const folder=p.getProperty('COURSE_FOLDER_ID');
  const master=p.getProperty('MASTER_SPREADSHEET_ID');
  let sections;
  try { sections=JSON.parse(p.getProperty('SECTIONS_JSON')||'[]'); }
  catch(e){throw new Error('SECTIONS_JSON must be a JSON list of section names.');}
  if(!folder||!master||!Array.isArray(sections)||!sections.length||
    sections.some(s=>typeof s!=='string'||!s.trim()||s.length>80)||
    new Set(sections.map(s=>s.trim().toLowerCase())).size!==sections.length) {
    throw new Error('Configure COURSE_FOLDER_ID, MASTER_SPREADSHEET_ID and unique SECTIONS_JSON first.');
  }
  if(sections.length>10)throw new Error('Pilot supports at most 10 sections; review scale and trigger quotas before expanding.');
  return {p,folder,master,sections:sections.map(s=>s.trim())};
}
function assertMaster_(id) {
  const ss=SpreadsheetApp.openById(id);
  for(const name of CET154.masterRequired)if(!ss.getSheetByName(name))throw new Error('Master missing tab: '+name);
  return ss;
}
function registry_(config) {
  const id=config.p.getProperty('REGISTRY_SPREADSHEET_ID');
  if(id){const ss=SpreadsheetApp.openById(id);if(!ss.getSheetByName('Students'))throw new Error('Registry structure missing');return ss;}
  const folder=DriveApp.getFolderById(config.folder);
  const ss=SpreadsheetApp.create(CET154.registryName);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  const sh=ss.getSheets()[0];sh.setName('Students');
  sh.getRange(1,1,1,REGISTRY_HEADERS.length).setValues([REGISTRY_HEADERS]);
  sh.setFrozenRows(1);sh.getRange(1,1,1,REGISTRY_HEADERS.length).setFontWeight('bold');
  config.p.setProperty('REGISTRY_SPREADSHEET_ID',ss.getId());
  return ss;
}
function sectionSheets_(config) {
  let ids={};
  try {ids=JSON.parse(config.p.getProperty('SECTION_SHEET_IDS')||'{}');}catch(e){throw new Error('Invalid SECTION_SHEET_IDS property.');}
  const folder=DriveApp.getFolderById(config.folder);
  for(const section of config.sections) {
    if(ids[section]){assertMaster_(ids[section]);continue;}
    const name=CET154.code+' — '+section+' — Class Record (PILOT)';
    const copied=DriveApp.getFileById(config.master).makeCopy(name,folder);
    const ss=assertMaster_(copied.getId());
    const settings=ss.getSheetByName('Settings');
    settings.getRange('B10').setValue(section); // "Section" row
    settings.getRange('B11').setValue('REGISTRATION PILOT — NOT FINAL GRADING');
    ids[section]=ss.getId();
    config.p.setProperty('SECTION_SHEET_IDS',JSON.stringify(ids)); // incremental crash recovery
    // Instructor-owned installable edit trigger recalculates read-only grade identity view.
    ScriptApp.newTrigger('onCET154SheetEdit').forSpreadsheet(ss).onEdit().create();
  }
  return ids;
}

/**
 * Run ONCE as owner after entering Script Properties and verifying the master.
 * Idempotent on subsequent runs: does not create duplicate forms, files, triggers.
 */
function setupCET154() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const c=configuration_();assertMaster_(c.master);
    registry_(c);
    const ids=sectionSheets_(c);
    let form;
    const formId=c.p.getProperty('REGISTRATION_FORM_ID');
    if(formId)form=FormApp.openById(formId);
    else {
      form=FormApp.create(CET154.formTitle);
      form.setCollectEmail(true);
      form.setLimitOneResponsePerUser(true);
      form.setDescription('Register only with your institutional Google account. Enrollment will remain PENDING until the instructor verifies your details. Do not enter passwords or passcodes.');
      form.addTextItem().setTitle('Family Name').setRequired(true);
      form.addTextItem().setTitle('Given Name').setRequired(true);
      form.addTextItem().setTitle('Middle Initial (optional)').setRequired(false);
      form.addTextItem().setTitle('Student ID Number').setRequired(true);
      form.addListItem().setTitle('Section').setChoiceValues(c.sections).setRequired(true);
      form.setAcceptingResponses(false); // Instructor MUST configure "Verified" email collection before opening.
      c.p.setProperty('REGISTRATION_FORM_ID',form.getId());
    }
    const triggers=ScriptApp.getProjectTriggers();
    if(!triggers.some(t=>t.getHandlerFunction()==='onCET154Registration'&&t.getTriggerSourceId()===form.getId())) {
      ScriptApp.newTrigger('onCET154Registration').forForm(form).onFormSubmit().create();
    }
    Logger.log('Registration form edit URL (owner only): '+form.getEditUrl());
    Logger.log('Registration responder URL (publish only after Verified email setting): '+form.getPublishedUrl());
    for(const key in ids)Logger.log(key+': https://docs.google.com/spreadsheets/d/'+ids[key]+'/edit');
    return {formEditUrl:form.getEditUrl(),formResponderUrl:form.getPublishedUrl(),sections:Object.keys(ids)};
  }finally{SpreadsheetApp.flush();lock.releaseLock();}
}
function normalize_(v) {return String(v===null||v===undefined?'':v).trim().replace(/\s+/g,' ');}
function assertText_(value,label,max) {
  const v=normalize_(value);
  if(!v||v.length>max||!(/^[\p{L}\p{M} .'\u2019-]+$/u).test(v)||/^[=+@]/.test(v))
    throw new Error(label+' contains invalid characters or is empty.');
  return v;
}
function itemValues_(response) {
  const result={};
  for(const ir of response.getItemResponses()) result[ir.getItem().getTitle()]=ir.getResponse();
  return result;
}
function parseRegistration_(response,config) {
  const answers=itemValues_(response);
  const email=normalize_(response.getRespondentEmail()).toLowerCase();
  // This is trustworthy ONLY when the form's UI is set to "Collect email: Verified".
  if(!email.endsWith('@'+CET154.domain)||email.split('@').length!==2||
    !/^[a-z0-9._%+-]+@g\.msuiit\.edu\.ph$/.test(email))throw new Error('Only verified institutional Google accounts are eligible.');
  const family=assertText_(answers['Family Name'],'Family Name',90);
  const given=assertText_(answers['Given Name'],'Given Name',90);
  const middle=normalize_(answers['Middle Initial (optional)']);
  if(middle && !/^[\p{L}]\.?$/u.test(middle))throw new Error('Middle initial must be one letter.');
  const studentId=normalize_(answers['Student ID Number']);
  if(!/^[A-Za-z0-9][A-Za-z0-9-]{3,31}$/.test(studentId))throw new Error('Student ID number has an invalid format.');
  const section=normalize_(answers['Section']);
  if(!config.sections.includes(section))throw new Error('The selected section is not configured.');
  return {email,family,given,middle,studentId,section};
}
function rows_(sheet,cols) {
  const n=sheet.getLastRow()-1;
  return n>0?sheet.getRange(2,1,n,cols).getValues().filter(r=>normalize_(r[0])):[];
}
function audit_(config,result,email,id,section,reason) {
  const ss=registry_(config);
  let sh=ss.getSheetByName('Audit');
  if(!sh){sh=ss.insertSheet('Audit');sh.appendRow(['Timestamp','Status','Email','Student ID','Requested Section','Reason']);}
  sh.appendRow([new Date(),result,email||'',id||'',section||'',reason||'']);
}
function sortEntireRoster_(sheet) {
  const n=sheet.getLastRow()-1;
  // Sort 9 columns together, never the name column alone.
  if(n>1)sheet.getRange(2,1,n,9).sort([{column:3,ascending:true},{column:4,ascending:true},{column:2,ascending:true}]);
}
function refreshGradingIdentity_(ss) {
  const roster=rows_(ss.getSheetByName(CET154.dataset),9);
  const ledgerSheet=ss.getSheetByName(CET154.scoreLedger);
  const ledgerSize=ledgerSheet.getLastRow()-1;
  // Do not silently discard malformed evidence rows with blank UIDs.
  const ledger=ledgerSize>0?ledgerSheet.getRange(2,1,ledgerSize,7).getValues()
    .filter(row=>row.some(value=>value!==''&&value!==null)):[];

  const uidSet=new Set(roster.map(r=>String(r[0])));
  const count=new Map(),earned=new Map(),pairs=new Set();
  for(const row of ledger) {
    const uid=String(row[0]),assessment=normalize_(row[1]);
    if(!uidSet.has(uid))throw new Error('Score Ledger contains unknown Student UID: '+uid);
    if(!assessment)throw new Error('Score Ledger has missing Assessment ID.');
    const key=uid+'\u0000'+assessment;
    if(pairs.has(key))throw new Error('Duplicate score entry for one Student UID + Assessment ID: '+assessment);
    pairs.add(key);
    const score=Number(row[3]),max=Number(row[4]);
    if(row[3]===''||row[4]===''||!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max)
      throw new Error('Invalid earned/max score for '+assessment+'; leave no partial score rows.');
    count.set(uid,(count.get(uid)||0)+1);
    earned.set(uid,(earned.get(uid)||0)+score);
  }
  const grade=ss.getSheetByName(CET154.grading);
  // The visible grading sheet is a DERIVED VIEW: do not manually type scores here.
  // All evidence is attached to immutable Student UID in Score Ledger.
  const data=roster.sort((a,b)=>String(a[2]).localeCompare(String(b[2]))||
    String(a[3]).localeCompare(String(b[3]))||String(a[1]).localeCompare(String(b[1])));
  const headings=['Student UID','Student ID Number','Family Name','Given Name','Middle Initial','Section','Recorded Assessments','Earned Points (provisional)','Grade Status','Overall Grade %','CO1 Attainment %','CO2 Attainment %','CO3 Attainment %'];
  const last=Math.max(grade.getLastRow(),2);
  grade.getRange(1,1,1,headings.length).setValues([headings]);
  if(last>1)grade.getRange(2,1,last-1,headings.length).clearContent();
  if(data.length)grade.getRange(2,1,data.length,headings.length).setValues(data.map(r=>{
    const uid=String(r[0]);
    return [uid,r[1],r[2],r[3],r[4],r[6],count.get(uid)||0,earned.get(uid)||0,
      'PENDING — assessment/CO engine not approved','','','',''];
  }));
}
function onCET154Registration(e) {
  if(!e||!e.response||!e.source)throw new Error('Registration must come from a Google Form submit trigger.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const config=configuration_();
    const authorizedForm=config.p.getProperty('REGISTRATION_FORM_ID');
    if(!authorizedForm||e.source.getId()!==authorizedForm)throw new Error('Unrecognized form source.');
    let record;
    try {record=parseRegistration_(e.response,config);}
    catch(err){audit_(config,'REJECTED','','','','Check original Form response: '+err.message);return;}
    const registry=registry_(config).getSheetByName('Students');
    const existing=rows_(registry,REGISTRY_HEADERS.length);
    const byEmail=existing.find(r=>String(r[2]).toLowerCase()===record.email);
    const byID=existing.find(r=>String(r[1]).toLowerCase()===record.studentId.toLowerCase());
    if(byEmail||byID) {
      const same=byEmail&&byID&&byEmail[0]===byID[0]&&String(byEmail[6])===record.section;
      audit_(config,same?'DUPLICATE (NO ACTION)':'REVIEW REQUIRED',record.email,record.studentId,record.section,
        'Existing email or student ID. Instructor must review transfers/corrections; no automatic overwrite.');
      return;
    }
    const map=JSON.parse(config.p.getProperty('SECTION_SHEET_IDS')||'{}');
    const sheetId=map[record.section];
    if(!sheetId)throw new Error('Section sheet was not generated.');
    const ss=assertMaster_(sheetId);
    const uid=Utilities.getUuid();
    const timestamp=e.response.getTimestamp()||new Date();
    const data=[uid,record.studentId,record.family,record.given,record.middle,record.email,record.section,'PENDING INSTRUCTOR APPROVAL',timestamp];
    // Do the section write before adding to registry. A rerun can recover a partial write.
    ss.getSheetByName(CET154.dataset).appendRow(data);
    sortEntireRoster_(ss.getSheetByName(CET154.dataset));
    refreshGradingIdentity_(ss);
    registry.appendRow([uid,record.studentId,record.email,record.family,record.given,record.middle,record.section,sheetId,'PENDING INSTRUCTOR APPROVAL',timestamp]);
    audit_(config,'PENDING APPROVAL',record.email,record.studentId,record.section,'Received verified-email form submission.');
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}
function onCET154SheetEdit(e) {
  if(!e||!e.range||!e.source||e.range.getSheet().getName()!==CET154.scoreLedger)return;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const c=configuration_();
    const map=JSON.parse(c.p.getProperty('SECTION_SHEET_IDS')||'{}');
    if(!Object.values(map).includes(e.source.getId()))throw new Error('Unknown section sheet.');
    refreshGradingIdentity_(e.source);
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}
function refreshAllCET154Views() {
  const c=configuration_(),map=JSON.parse(c.p.getProperty('SECTION_SHEET_IDS')||'{}');
  for(const section of c.sections)if(map[section]) {
    const ss=assertMaster_(map[section]);
    sortEntireRoster_(ss.getSheetByName(CET154.dataset));
    refreshGradingIdentity_(ss);
  }
}
/** For instructor diagnostics only: shows links, never reveals student data. */
function showCET154Links() {
  const c=configuration_(),ids=JSON.parse(c.p.getProperty('SECTION_SHEET_IDS')||'{}');
  const f=c.p.getProperty('REGISTRATION_FORM_ID');
  Logger.log('Registration form: '+(f?FormApp.openById(f).getEditUrl():'Not set'));
  for(const [section,id] of Object.entries(ids))Logger.log(section+': https://docs.google.com/spreadsheets/d/'+id+'/edit');
}


/**
 * Owner-only repair for a Form trigger interrupted between a section write and
 * the central registry write. It will NOT merge conflicting student identities.
 * Run after inspecting Apps Script execution errors; keep student data private.
 */
function reconcileCET154Registrations() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const c=configuration_(),map=JSON.parse(c.p.getProperty('SECTION_SHEET_IDS')||'{}');
    const registry=registry_(c).getSheetByName('Students');
    const known=rows_(registry,REGISTRY_HEADERS.length);
    const byUid=new Map(known.map(r=>[String(r[0]),r]));
    const byEmail=new Map(known.map(r=>[String(r[2]).toLowerCase(),r]));
    const byId=new Map(known.map(r=>[String(r[1]).toLowerCase(),r]));
    for(const section of c.sections){
      const sheetId=map[section];if(!sheetId)continue;
      const ss=assertMaster_(sheetId);
      const roster=rows_(ss.getSheetByName(CET154.dataset),9);
      for(const row of roster){
        const uid=String(row[0]),email=String(row[5]).toLowerCase(),id=String(row[1]).toLowerCase();
        const registryRecord=byUid.get(uid);
        if(registryRecord){
          if(String(registryRecord[7])!==sheetId||String(registryRecord[1]).toLowerCase()!==id||
            String(registryRecord[2]).toLowerCase()!==email){
            throw new Error('Registry conflict for UID: '+uid+' — requires instructor review.');
          }
          continue;
        }
        if(byEmail.has(email)||byId.has(id))throw new Error('Cannot reconcile conflicting student ID/email: '+id);
        const regRow=[uid,row[1],row[5],row[2],row[3],row[4],section,sheetId,row[7],row[8]];
        registry.appendRow(regRow);
        byUid.set(uid,regRow);byEmail.set(email,regRow);byId.set(id,regRow);
        audit_(c,'RECOVERED REGISTRY ROW',email,id,section,'Copied immutable UID from original section roster.');
      }
      // Do not insert a registry student into the wrong section or overwrite grades.
      const uidInRoster=new Set(roster.map(row=>String(row[0])));
      for(const regRow of known){
        if(regRow[7]!==sheetId||uidInRoster.has(String(regRow[0])))continue;
        const row=[regRow[0],regRow[1],regRow[3],regRow[4],regRow[5],
          regRow[2],regRow[6],regRow[8],regRow[9]];
        ss.getSheetByName(CET154.dataset).appendRow(row);
        uidInRoster.add(String(regRow[0]));
        audit_(c,'RECOVERED SECTION ROW',regRow[2],regRow[1],section,'Copied existing UID from registry into its verified section.');
      }
      sortEntireRoster_(ss.getSheetByName(CET154.dataset));
      refreshGradingIdentity_(ss);
    }
    SpreadsheetApp.flush();
  }finally{lock.releaseLock();}
}
