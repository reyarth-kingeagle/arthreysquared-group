// CET154 student-record invariant — platform-neutral pure functions.
// NEVER depend on student physical spreadsheet row numbers for score ownership.
const norm=v=>String(v??'').trim();
export function alphabeticalStudents(students) {
  const seen=new Set();
  const result=students.map(student=>{
    if(!student||!norm(student.studentUid)||!norm(student.studentId))throw new Error('Every student needs a permanent UID and student ID.');
    if(seen.has(norm(student.studentUid)))throw new Error('Duplicate Student UID');
    seen.add(norm(student.studentUid));
    return {...student};
  });
  const cmp=(a,b)=>norm(a).localeCompare(norm(b),undefined,{sensitivity:'base',numeric:true});
  return result.sort((a,b)=>cmp(a.familyName,b.familyName)||cmp(a.givenName,b.givenName)||cmp(a.studentId,b.studentId));
}
export function gradingIdentityView(students,ledger) {
  const sorted=alphabeticalStudents(students);
  const map=new Map(sorted.map(s=>[norm(s.studentUid),new Map()]));
  for(const score of ledger){
    const uid=norm(score.studentUid),id=norm(score.assessmentId);
    if(!map.has(uid))throw new Error('Score references unknown Student UID');
    if(!id||map.get(uid).has(id))throw new Error('Missing/duplicate assessment for Student UID');
    if(!Number.isFinite(score.earned)||!Number.isFinite(score.max)||score.max<=0||score.earned<0||score.earned>score.max)
      throw new Error('Invalid assessment score');
    map.get(uid).set(id,{...score});
  }
  return sorted.map(s=>{
    const own=[...map.get(norm(s.studentUid)).values()];
    return {...s,assessmentCount:own.length,provisionalPoints:own.length?own.reduce((n,v)=>n+v.earned,0):null,
      courseGrade:null,co1:null,co2:null,co3:null};
  });
}
