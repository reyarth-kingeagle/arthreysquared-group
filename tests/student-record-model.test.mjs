import test from 'node:test';
import assert from 'node:assert/strict';
import {alphabeticalStudents,gradingIdentityView} from '../js/student-record-model.mjs';
const p=(uid,id,family,given,section)=>({studentUid:uid,studentId:id,familyName:family,givenName:given,section});
test('late enrollee sorts complete objects without shifting any student score',()=>{
  const students=[p('u1','3','Zulu','Ann','A'),p('u2','2','Bravo','Ben','A')];
  const scores=[{studentUid:'u1',assessmentId:'QILO1',earned:8,max:10},{studentUid:'u2',assessmentId:'QILO1',earned:9,max:10}];
  assert.deepEqual(gradingIdentityView(students,scores).map(x=>[x.studentUid,x.provisionalPoints]),[['u2',9],['u1',8]]);
  const later=gradingIdentityView([...students,p('u3','1','Parker','Pat','A')],scores);
  assert.deepEqual(later.map(x=>[x.studentUid,x.provisionalPoints]),[['u2',9],['u3',null],['u1',8]]);
});
test('alphabetization keeps name/student ID/section together',()=>{
  const rows=alphabeticalStudents([p('x','30','Zulu','April','A'),p('y','20','Beta','Bob','B')]);
  assert.deepEqual(rows.map(x=>[x.studentUid,x.studentId,x.familyName,x.section]),[['y','20','Beta','B'],['x','30','Zulu','A']]);
});
test('unknown UID, duplicate assessment and bad score are rejected',()=>{
  const students=[p('u1','1','Lee','Jan','A')];
  const q={studentUid:'u1',assessmentId:'QILO1',earned:9,max:10};
  assert.throws(()=>gradingIdentityView(students,[{...q,studentUid:'u404'}]),/unknown Student UID/);
  assert.throws(()=>gradingIdentityView(students,[q,q]),/duplicate assessment/);
  assert.throws(()=>gradingIdentityView(students,[{...q,earned:11}]),/Invalid assessment/);
});
