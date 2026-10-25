import test from 'node:test';
import assert from 'node:assert/strict';
import {isRosterTab,listEligibleSections,matchPrivateRoster,safeUserMessage} from '../server/cet154-roster-policy.mjs';

const headers=['Student ID Number','Verified Email','Family Name','Given Name','Middle Name','Section','Password'];
const tabs=[
  {title:'H1W23',rows:[headers,['','','Del Rosario','Mara','','',''],['','','Santos','Lei','','','']]},
  {title:'H1M23',rows:[headers,['','','Del Rosario','Mara','','','']]},
  {title:'ARCHIVE_AY2025_H1W23',rows:[headers,['','','Old','Student','','','']]},
  {title:'CQI Action Log',rows:[['Student ID Number','Other Header']]}
];
test('recognizes section tabs from sheet headers and ignores archived and unrelated tabs',()=>{
  assert.deepEqual(listEligibleSections(tabs),['H1W23','H1M23']);
  assert.equal(isRosterTab(tabs[0]),true);
  assert.equal(isRosterTab(tabs[3]),false);
});
test('requires exact normalized family+given name in selected section',()=>{
  const ok=matchPrivateRoster(tabs,{section:' h1w23 ',familyName:' DEL   ROSARIO ',givenName:'mara'});
  assert.equal(ok.status,'ELIGIBLE_PENDING_INSTRUCTOR_REVIEW');
  assert.equal(ok.section,'H1W23');
  assert.equal(ok.internalMatch.rowNumber,2);
  assert.equal(matchPrivateRoster(tabs,{section:'H1W23',familyName:'Del',givenName:'Mara'}).status,'REVIEW_REQUIRED');
});
test('cannot use a name on another section or an archived tab',()=>{
  assert.equal(matchPrivateRoster(tabs,{section:'H1M23',familyName:'Santos',givenName:'Lei'}).status,'REVIEW_REQUIRED');
  assert.equal(matchPrivateRoster(tabs,{section:'ARCHIVE_AY2025_H1W23',familyName:'Old',givenName:'Student'}).status,'REVIEW_REQUIRED');
});
test('duplicate full names in a section require instructor review',()=>{
 const duplicate=[{title:'H1W23',rows:[headers,['','','Smith','Alex'],['','','Smith','Alex']]}];
 assert.equal(matchPrivateRoster(duplicate,{section:'H1W23',familyName:'Smith',givenName:'Alex'}).reason,'AMBIGUOUS');
});
test('new cohort tabs automatically appear without a source-code change',()=>{
 const next=[...tabs,{title:'AY2027-28_H1W23',rows:[headers,['','','Dela Cruz','Jo']]}];
 assert.ok(listEligibleSections(next).includes('AY2027-28_H1W23'));
 assert.equal(matchPrivateRoster(next,{section:'AY2027-28_H1W23',familyName:'Dela Cruz',givenName:'Jo'}).status,'ELIGIBLE_PENDING_INSTRUCTOR_REVIEW');
});
test('public errors cannot reveal whether a student is on the private roster',()=>{
 assert.equal(safeUserMessage('NOT_FOUND'),safeUserMessage('AMBIGUOUS'));
 assert.equal(safeUserMessage('NOT_FOUND'),safeUserMessage('REJECTED'));
});

test('a roster match does not confer approved enrollment',()=>{
  const result=matchPrivateRoster(tabs,{section:'H1W23',familyName:'Santos',givenName:'Lei'});
  assert.equal(result.status,'ELIGIBLE_PENDING_INSTRUCTOR_REVIEW');
  assert.notEqual(result.status,'APPROVED');
  assert.match(safeUserMessage('PENDING_INSTRUCTOR_REVIEW'),/face-to-face verification/i);
});
