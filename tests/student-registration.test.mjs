import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Unit tests for the actual Apps Script roster and grade-identity functions.
// Google authorization and Form trigger installation still require live testing.
const source=fs.readFileSync(new URL('../apps-script/CET154-REGISTRATION.gs',import.meta.url),'utf8');
const ctx=vm.createContext({console});vm.runInContext(source,ctx);
const call=(expr)=>vm.runInContext(expr,ctx);
class Sheet {
  constructor(rows){this.rows=rows.map(r=>[...r]);}
  getLastRow(){return this.rows.length;}
  getRange(row,col,height,width){
    const sheet=this;
    return {
      getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>sheet.rows[row-1+i]?.[col-1+j]??''));},
      setValues(values){values.forEach((r,i)=>{while(sheet.rows.length<row+i)sheet.rows.push([]);r.forEach((v,j)=>sheet.rows[row-1+i][col-1+j]=v)});return this},
      clearContent(){for(let i=0;i<height;i++)for(let j=0;j<width;j++)if(sheet.rows[row-1+i])sheet.rows[row-1+i][col-1+j]='';return this},
      sort(rules){
        const begin=sheet.rows.slice(0,row-1);
        const target=sheet.rows.slice(row-1,row-1+height);
        target.sort((a,b)=>{for(const rule of rules){const left=String(a[rule.column-1]||''),right=String(b[rule.column-1]||'');const diff=left.localeCompare(right);if(diff)return rule.ascending?diff:-diff}return 0;});
        sheet.rows=[...begin,...target,...sheet.rows.slice(row-1+height)];
        return this;
      }
    };
  }
}
const student=(uid,id,family,given,section)=>[uid,id,family,given,'',id+'@g.msuiit.edu.ph',section,'PENDING','2026-10-24'];
const ss=(roster,ledger)=>{
  const a=new Map([
    ['Student Dataset',new Sheet([['headers'],...roster])],
    ['Score Ledger',new Sheet([['headers'],...ledger])],
    ['Grading System',new Sheet([['headers']])]
  ]);
  return {getSheetByName:k=>a.get(k),sheets:a};
};
test('late student alphabetically moves entire identity row and score remains keyed by UID',()=>{
  const first=student('u1','2024-003','Zulu','Ann','Section A');
  const second=student('u2','2024-010','Bravo','Bob','Section A');
  const ledger=[['u1','QILO1','Quizzes',8,10,'',''],['u2','QILO1','Quizzes',9,10,'','']];
  const x=ss([first,second],ledger);
  ctx.testSheet=x.getSheetByName('Student Dataset');
  call('sortEntireRoster_(testSheet)');
  assert.deepEqual(x.getSheetByName('Student Dataset').rows.slice(1).map(r=>r[0]),['u2','u1']);
  ctx.testSs=x;call('refreshGradingIdentity_(testSs)');
  let rows=x.getSheetByName('Grading System').rows.slice(1);
  assert.deepEqual(rows.map(r=>[r[0],r[7]]),[['u2',9],['u1',8]]);
  x.getSheetByName('Student Dataset').rows.push(student('u3','2024-002','Parker','Pat','Section A'));
  call('sortEntireRoster_(testSheet)');call('refreshGradingIdentity_(testSs)');
  rows=x.getSheetByName('Grading System').rows.slice(1);
  assert.deepEqual(rows.map(r=>[r[0],r[7]]),[['u2',9],['u3',0],['u1',8]]);
  assert.deepEqual(rows.map(r=>[r[0],r[1],r[2],r[3]]),[
    ['u2','2024-010','Bravo','Bob'],['u3','2024-002','Parker','Pat'],['u1','2024-003','Zulu','Ann']
  ]);
});
test('students in separate sections stay isolated',()=>{
  const a=ss([student('a','2024-100','Alfa','Alice','Section A')],[['a','L1','Laboratory',19,20,'','']]);
  const b=ss([student('b','2024-200','Zulu','Zoe','Section B')],[['b','L1','Laboratory',15,20,'','']]);
  ctx.sectionA=a;ctx.sectionB=b;call('refreshGradingIdentity_(sectionA)');call('refreshGradingIdentity_(sectionB)');
  assert.equal(a.getSheetByName('Grading System').rows[1][0],'a');
  assert.equal(b.getSheetByName('Grading System').rows[1][0],'b');
  assert.equal(b.getSheetByName('Grading System').rows[1][7],15);
});
test('unknown student UID or duplicate assessment score is rejected',()=>{
  const x=ss([student('a','2024-100','Alfa','Alice','Section A')],[['UNKNOWN','L1','Laboratory',10,20,'','']]);
  ctx.testSs=x;
  assert.throws(()=>call('refreshGradingIdentity_(testSs)'),/unknown Student UID/);
  x.getSheetByName('Score Ledger').rows=[['headers'],['a','L1','Laboratory',10,20,'',''],['a','L1','Laboratory',15,20,'','']];
  assert.throws(()=>call('refreshGradingIdentity_(testSs)'),/Duplicate score entry/);
});
test('institutional Google email and configured section are required',()=>{
  const cfg={sections:['Section A','Section B']};
  const responses=(email,section)=>({
    getRespondentEmail:()=>email,
    getItemResponses:()=>Object.entries({'Family Name':'Ocampo','Given Name':'Rosa','Middle Initial (optional)':'M.','Student ID Number':'2024-202','Section':section})
      .map(([title,value])=>({getItem:()=>({getTitle:()=>title}),getResponse:()=>value}))
  });
  ctx.testConfig=cfg;
  ctx.formResp=responses('student@g.msuiit.edu.ph','Section A');
  assert.equal(call('parseRegistration_(formResp,testConfig)').section,'Section A');
  ctx.formResp=responses('student@gmail.com','Section A');
  assert.throws(()=>call('parseRegistration_(formResp,testConfig)'),/institutional/);
  ctx.formResp=responses('student@g.msuiit.edu.ph','Section C');
  assert.throws(()=>call('parseRegistration_(formResp,testConfig)'),/not configured/);
});
