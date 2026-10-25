// UI DESIGN ONLY. No network requests, form submissions, browser storage, or authentication.
// Later phases must verify institutional email/section, store credentials securely on the
// server, and keep student academic data in instructor-only private Google Sheets.
export const SUBJECTS = Object.freeze([
  {id:'msuiit-cet111',code:'CET 111',title:'Architectural Drafting',institution:'MSU-IIT',domain:'g.msuiit.edu.ph',page:'Coursework/MSU-IIT/cet111.html'},
  {id:'msuiit-cet134',code:'CET 134',title:'Formworks and Scaffoldings',institution:'MSU-IIT',domain:'g.msuiit.edu.ph',page:'Coursework/MSU-IIT/cet134.html'},
  {id:'msuiit-cet154',code:'CET 154',title:'Reinforced Concrete Works',institution:'MSU-IIT',domain:'g.msuiit.edu.ph',page:'Coursework/MSU-IIT/cet154.html'},
  {id:'msuiit-bet117',code:'BET 117',title:'Technology Awareness',institution:'MSU-IIT',domain:'g.msuiit.edu.ph',page:'Coursework/MSU-IIT/bet117.html'},
  {id:'msuiit-ens150-2',code:'ENS 150.2',title:'Engineering Graphics',institution:'MSU-IIT',domain:'g.msuiit.edu.ph',page:'Coursework/MSU-IIT/ens150.2.html'},
  {id:'spc-bes1-2',code:'BES 1.2',title:'Engineering Drawing and Plans',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/bes1.2.html'},
  {id:'spc-bes3',code:'BES 3',title:'Statics of Rigid Bodies',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/bes3.html'},
  {id:'spc-em1',code:'EM 1',title:'Calculus 1',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/em1.html'},
  {id:'spc-em2',code:'EM 2',title:'Calculus 2',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/em2.html'},
  {id:'spc-em3',code:'EM 3',title:'Engineering Data Analysis',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/em3.html'},
  {id:'spc-em4',code:'EM 4',title:'Differential Equations',institution:"St. Peter's College",domain:null,page:'Coursework/SPC/em4.html'}
]);
const get=id=>document.getElementById(id);
const dropdown=get('enroll-subject'),help=get('subject-help');
const courseName=get('selected-subject-name'),schoolName=get('selected-institution-name');
const back=get('back-to-course'),message=get('enrollment-message');
const controls=['enroll-subject','enroll-section','enroll-id','enroll-family','enroll-given','enroll-middle','enroll-email','enroll-password','enroll-confirm'].map(get);
for(const course of SUBJECTS){
  const option=document.createElement('option');
  option.value=course.id;option.textContent=course.code+' — '+course.title+' ('+course.institution+')';
  dropdown.append(option);
}
const params=new URLSearchParams(location.search);
const selected=params.get('subject');
if(SUBJECTS.some(course=>course.id===selected))dropdown.value=selected;
function updateSelectedCourse(){
  const course=SUBJECTS.find(item=>item.id===dropdown.value);
  courseName.textContent=course?course.code+' · '+course.title:'Choose your subject';
  schoolName.textContent=course?course.institution:'MSU-IIT or St. Peter’s College';
  back.textContent=course?'← Back to '+course.code:'← Back to courses';
  back.href=course?course.page:'coursework.html';
  help.textContent=course?.domain?'Use your '+course.institution+' institutional email ending in @'+course.domain+'. Section must match your official class assignment.':'Use the institution-approved email address. Your section will be checked by the instructor in a later phase.';
  get('enroll-email').placeholder=course?.domain?'student@'+course.domain:'Institutional email address';
  const cet154 = course?.id === 'msuiit-cet154';
  const emailLabel = get('enroll-email-label');
  if (emailLabel) emailLabel.firstChild.nodeValue = cet154 ? 'Institutional Email (verification pending) ' : 'Verified Email ';
  const middleLabel = get('enroll-middle-label');
  const middleInput = get('enroll-middle');
  if (middleLabel) middleLabel.firstChild.nodeValue = cet154 ? 'Middle Name ' : 'Middle Initial ';
  middleInput.maxLength = cet154 ? 80 : 2;
  middleInput.placeholder = cet154 ? 'Your full middle name' : 'e.g., M.';
  const rosterNotice = get('cet154-roster-notice');
  if (rosterNotice) rosterNotice.hidden = !cet154;

}
dropdown.addEventListener('change',()=>{updateSelectedCourse();message.textContent='';});
updateSelectedCourse();
for(const button of document.querySelectorAll('[data-toggle-password]')){
  button.addEventListener('click',()=>{
    const input=get(button.dataset.togglePassword);
    const show=input.type==='password';input.type=show?'text':'password';
    button.textContent=show?'Hide':'Show';
    button.setAttribute('aria-pressed',String(show));
    button.setAttribute('aria-label',(show?'Hide ':'Show ')+(input.id==='enroll-confirm'?'retyped password':'password'));
  });
}
function showMessage(text,kind='error'){
  message.textContent=text;message.dataset.kind=kind;
}
get('enroll-clear').addEventListener('click',()=>{
  for(const control of controls)if(control!==dropdown)control.value='';
  for(const button of document.querySelectorAll('[data-toggle-password]')){
    const field=get(button.dataset.togglePassword);field.type='password';button.textContent='Show';button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label','Show '+(field.id==='enroll-confirm'?'retyped password':'password'));
  }
  showMessage('Fields cleared. No information was stored.','info');
});
get('enroll-preview').addEventListener('click',()=>{
  // Check the interface without creating or persisting a student record.
  for(const control of controls){
    if(!control.checkValidity()){
      control.reportValidity();
      showMessage('Please complete the highlighted field to preview the form.');
      return;
    }
  }
  const email=get('enroll-email').value.trim().toLowerCase();
  const course=SUBJECTS.find(item=>item.id===dropdown.value);
  if(course?.domain&&!email.endsWith('@'+course.domain)){
    get('enroll-email').focus();
    showMessage('Use an institutional email address ending in @'+course.domain+'.');
    return;
  }
  if(get('enroll-password').value!==get('enroll-confirm').value){
    get('enroll-confirm').focus();
    showMessage('The passwords do not match.');
    return;
  }
  // Clear all typed information, particularly sensitive passwords, before status feedback.
  for(const control of controls)if(control!==dropdown)control.value='';
  showMessage('Preview checks passed. No enrollment, email verification, account, or Google Sheet record was created. All entered fields were cleared.','info');
});
