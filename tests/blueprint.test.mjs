import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBlueprint,emptyBlueprint,validateBlueprint,blueprintRows,mappingRows,csvOf,verifyShape} from '../js/blueprint-model.mjs';
test('CET154 has exact approved category distribution and mapped Module 1 example',()=>{
  const s=sampleBlueprint();
  assert.equal(Object.values(s.categoryWeights).reduce((a,b)=>a+b,0),100);
  assert.equal(s.course.passingScore,65);
  assert.equal(s.course.coThreshold,65);
  assert.ok(!validateBlueprint(s).some(i=>i.message.includes('threshold has not')));
  assert.ok(!validateBlueprint(s).some(i=>i.message.includes('passing threshold requires')));
  assert.deepEqual(s.modules[0].ilos.map(i=>i.id),['ILO1','ILO2','ILO3']);
  assert.equal(mappingRows(s).length,17);
  assert.equal(s.modules.length,5);
  assert.equal(s.assessments.length,25);
  assert.equal(blueprintRows(s).length,39);
  assert.ok(!validateBlueprint(s).some(i=>i.severity==='error'));
  assert.ok(validateBlueprint(s).some(i=>i.message.includes('maximum possible score')));
});
test('Missing CO links, repeated IDs and invalid weights block readiness',()=>{
  const s=sampleBlueprint();s.categoryWeights.quizzes=6;
  s.modules[0].ilos[0].coIds=['NOCO'];
  s.assessments[1].id='QILO1';
  const messages=validateBlueprint(s).filter(i=>i.severity==='error').map(i=>i.message);
  assert.ok(messages.some(x=>x.includes('exactly 100%')));
  assert.ok(messages.some(x=>x.includes('nonexistent CO')));
  assert.ok(messages.some(x=>x.includes('Duplicate assessment')));
});
test('Split assessment is not double counted and allocations must sum to maximum',()=>{
  const s=sampleBlueprint();
  s.assessments[0].maxPoints=20;
  s.assessments[0].allocations=[{iloId:'ILO1',points:8},{iloId:'ILO2',points:12}];
  assert.equal(blueprintRows(s).filter(x=>x.assessment_id==='QILO1').length,2);
  assert.ok(!validateBlueprint(s).some(x=>x.message.includes('ILO allocation points')));
  s.assessments[0].allocations[0].points=10;
  assert.ok(validateBlueprint(s).some(x=>x.message.includes('ILO allocation points')));
});
test('Blank blueprint is editable but fails readiness',()=>{
  const s=emptyBlueprint();assert.equal(s.assessments.length,0);assert.ok(validateBlueprint(s).some(i=>i.severity==='error'));
});
test('Imported blueprint rejects malformed field types',()=>{
  assert.throws(()=>verifyShape({schemaVersion:1,course:{},categoryWeights:{},outcomes:[],modules:[],assessments:[]}));
});
test('CSV escapes quotes and protects spreadsheet formulas',()=>{
  const csv=csvOf([{a:'=1+1',b:'"value"',c:'-2'}]);
  assert.ok(csv.includes("\"'=1+1\""));
  assert.ok(csv.includes('"""value"""'));
  assert.ok(csv.includes("\"'-2\""));
});
