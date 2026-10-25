import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';

const HEAD = ['Student ID Number','Verified Email','Family Name','Given Name','Middle Name','Section','Passcode'];
const empty = (family, given) => ['', '', family, given, '', '', ''];

function environment(extra = []) {
  const tabs = [
    {name:'H1W23',rows:[HEAD.slice(),empty('Dela Cruz','Ana'),empty('Santos','Luis')]},
    {name:'H1M23',rows:[HEAD.slice(),empty('Garcia','Mia')]},
    ...extra
  ];
  const props = new Map();
  const cache = new Map();
  const sheets = tabs.map((tab,index)=>({
    getName:()=>tab.name,
    getSheetId:()=>index,
    getLastColumn:()=>7,
    getLastRow:()=>tab.rows.length,
    getRange(row,col,nrows=1,ncols=1){
      return {
        getDisplayValues:()=>tab.rows.slice(row-1,row-1+nrows).map(r=>r.slice(col-1,col-1+ncols)),
        getValues:()=>tab.rows.slice(row-1,row-1+nrows).map(r=>r.slice(col-1,col-1+ncols)),
        getFormulas:()=>Array.from({length:nrows},()=>Array(ncols).fill('')),
        setNumberFormat:()=>{},
        setValues(values){for(let i=0;i<values.length;i++) for(let j=0;j<values[i].length;j++) tab.rows[row-1+i][col-1+j]=values[i][j];}
      };
    }
  }));
  const ss={getId:()=> 'test-spreadsheet-id',getSheets:()=>sheets};
  const context = {
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:(id)=>{assert.equal(id,'test-spreadsheet-id');return ss;},flush:()=>{}},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
    LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
    Utilities:{getUuid:randomUUID,computeHmacSha256Signature:(data,key)=>[...createHmac('sha256',key).update(data).digest()],base64EncodeWebSafe:(bytes)=>Buffer.from(bytes).toString('base64url')},
    HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;}})},
    Object, Array, String, Number, RegExp, Error, JSON, Date,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../apps-script/cet154-registration/Code.gs',import.meta.url),'utf8'),context);
  context.setupOnce();
  return { context,tabs };
}
const data={section:'H1W23',studentId:'2026-0011',familyName:'Dela Cruz',givenName:'Ana',middleName:'Marie',email:'ana@g.msuiit.edu.ph',passcode:'myUniqueCode!2026',confirmPasscode:'myUniqueCode!2026'};

test('enrolls an eligible, entirely blank row and hashes its passcode without appending',()=>{
 const {context,tabs}=environment();const before=tabs[0].rows.length;
 const ans=context.submitRegistration({...data});assert.equal(ans.status,'REGISTERED');assert.equal(ans.ok,true);
 const row=tabs[0].rows[1];assert.equal(row[0],data.studentId);assert.equal(row[1],data.email);assert.equal(row[2],'Dela Cruz');assert.equal(row[3],'Ana');assert.equal(row[4],'Marie');assert.equal(row[5],'H1W23');assert.match(row[6],/^hmac256\$v1\$/);
 assert.equal(row[6].includes(data.passcode),false);assert.equal(tabs[0].rows.length,before);assert.equal(context.verifyPasscode_(data.passcode,row[6]),true);
 assert.equal(context.verifyPasscode_('wrong passcode',row[6]),false);
});
test('repeat registration does not overwrite a completed row',()=>{
 const {context,tabs}=environment();context.submitRegistration({...data});const old=JSON.stringify(tabs[0].rows[1]);
 const repeat=context.submitRegistration({...data,studentId:'2026-0999'});assert.equal(repeat.status,'ALREADY_REGISTERED');assert.equal(JSON.stringify(tabs[0].rows[1]),old);
});
test('nonexistent and wrong-section names never create students',()=>{
 const {context,tabs}=environment();let total=tabs[0].rows.length+tabs[1].rows.length;
 assert.equal(context.submitRegistration({...data,familyName:'Missing'}).status,'CONTACT_INSTRUCTOR');
 assert.equal(context.submitRegistration({...data,section:'H1M23'}).status,'CONTACT_INSTRUCTOR');
 assert.equal(tabs[0].rows.length+tabs[1].rows.length,total);
});
test('partially entered records are not overwritten',()=>{
 const {context,tabs}=environment();tabs[0].rows[1][0]='2025-ORIGINAL';
 assert.equal(context.submitRegistration({...data}).status,'CONTACT_INSTRUCTOR');assert.equal(tabs[0].rows[1][0],'2025-ORIGINAL');
});
test('duplicate full names in a section require instructor attention',()=>{
 const {context,tabs}=environment();tabs[0].rows.push(empty('Dela Cruz','Ana'));
 assert.equal(context.submitRegistration({...data}).status,'CONTACT_INSTRUCTOR');
});
test('blocks repeated ID/email across active tabs',()=>{
 const {context,tabs}=environment();tabs[1].rows[1][0]='2026-0011';
 assert.equal(context.submitRegistration({...data}).status,'CONTACT_INSTRUCTOR');
 tabs[1].rows[1][0]='';tabs[1].rows[1][1]='ana@g.msuiit.edu.ph';
 assert.equal(context.submitRegistration({...data}).status,'CONTACT_INSTRUCTOR');
});
test('requires real institutional email, all fields and a matching 8+ passcode',()=>{
 const {context}=environment();assert.throws(()=>context.submitRegistration({...data,email:'ana@example.org'}));
 assert.throws(()=>context.submitRegistration({...data,passcode:'tiny',confirmPasscode:'tiny'}));
 assert.throws(()=>context.submitRegistration({...data,confirmPasscode:'different-passcode'}));
 assert.throws(()=>context.submitRegistration({...data,studentId:''}));
});
test('accepts exactly eight characters and rejects seven without modifying the roster',()=>{
 const validPasscode='MsuIit8!';
 const badPasscode='MsuIit8';
 assert.equal(validPasscode.length,8);assert.equal(badPasscode.length,7);
 const {context:invalidContext,tabs:invalidTabs}=environment();
 assert.throws(()=>invalidContext.submitRegistration({...data,passcode:badPasscode,confirmPasscode:badPasscode}),/at least 8 characters/);
 assert.equal(invalidTabs[0].rows[1][6],'');
 const {context,tabs}=environment();
 const result=context.submitRegistration({...data,passcode:validPasscode,confirmPasscode:validPasscode});
 assert.equal(result.status,'REGISTERED');
 assert.equal(context.verifyPasscode_(validPasscode,tabs[0].rows[1][6]),true);
 assert.equal(context.verifyPasscode_(badPasscode,tabs[0].rows[1][6]),false);
});

test('auto-discovers a new future section tab and ignores archived tabs',()=>{
 const next={name:'AY2027-28_H1W23',rows:[HEAD.slice(),empty('Test','Person')]};
 const old={name:'ARCHIVE_AY2025_H1W23',rows:[HEAD.slice(),empty('Old','Person')]};
 const {context}=environment([next,old]);
 const ss=context.getRegistrationSections();assert.ok(ss.includes('AY2027-28_H1W23'));assert.ok(!ss.includes('ARCHIVE_AY2025_H1W23'));
 const result=context.submitRegistration({...data,section:'AY2027-28_H1W23',familyName:'Test',givenName:'Person'});assert.equal(result.status,'REGISTERED');
});