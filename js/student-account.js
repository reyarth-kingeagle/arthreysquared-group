import {courses} from './course-catalog.mjs';
import {accountConfig} from './account-config.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const select=$('signup-course');
for(const course of courses){const option=document.createElement('option');option.value=course.id;option.textContent=course.institution+' · '+course.name;select.append(option);}
const requested=params.get('course');
if(courses.some(c=>c.id===requested))select.value=requested;
const guidance=$('course-guidance'),status=$('account-status');
function guide(){
  const chosen=courses.find(c=>c.id===select.value);
  guidance.textContent=chosen?.emailDomain?'For '+chosen.institution+', use your @'+chosen.emailDomain+' institutional email address. Enter the section exactly as listed on your official class schedule.':'Use the email address approved by your institution. Enter your official section; the instructor must verify it.';
  document.querySelector('#signup-form [name=email]').placeholder=chosen?.emailDomain?'student@'+chosen.emailDomain:'Your institutional email';
}
select.addEventListener('change',guide);guide();
function notice(message,error=false){status.textContent=message;status.dataset.error=String(error);status.focus({preventScroll:true});}
function mode(next){
  const isSignup=next==='signup';
  $('signup-form').hidden=!isSignup;$('signin-form').hidden=isSignup;
  $('mode-signup').setAttribute('aria-pressed',String(isSignup));
  $('mode-signin').setAttribute('aria-pressed',String(!isSignup));
  $('account-title').textContent=isSignup?'Create a student account':'Sign in to your student account';
  status.textContent='';status.removeAttribute('data-error');
  params.set('mode',isSignup?'signup':'signin');history.replaceState(null,'',location.pathname+'?'+params.toString());
}
$('mode-signup').addEventListener('click',()=>mode('signup'));
$('mode-signin').addEventListener('click',()=>mode('signin'));
mode(params.get('mode')==='signin'?'signin':'signup');
$('signup-form').addEventListener('submit',event=>{
  event.preventDefault();
  const f=event.currentTarget;
  if(!f.reportValidity())return;
  const get=name=>f.elements.namedItem(name).value.trim();
  const course=courses.find(c=>c.id===get('course'));
  const email=get('email').toLowerCase();
  if(!course){notice('Select a valid course.',true);return;}
  if(course.emailDomain&&!email.endsWith('@'+course.emailDomain)){
    notice('Use your '+course.institution+' institutional email address ending in @'+course.emailDomain+'.',true);return;
  }
  const pass=f.elements.namedItem('passcode');
  const confirm=f.elements.namedItem('confirmation');
  if(pass.value!==confirm.value){notice('The passcodes do not match. Re-enter them.',true);confirm.focus();return;}
  if(pass.value.length<12){notice('Choose a passcode with at least 12 characters.',true);pass.focus();return;}
  // DO NOT transmit, save, or log credentials until a verified backend exists.
  if(!accountConfig.enabled){
    pass.value='';confirm.value='';
    notice('The form layout passed basic checks. Preview only — no account, passcode, or student record was created. Registration will open after the secure backend is installed.');
    return;
  }
  notice('Registration is unavailable: a verified authentication backend is required before accepting credentials.',true);
});
$('signin-form').addEventListener('submit',event=>{
  event.preventDefault();const f=event.currentTarget;
  if(!f.reportValidity())return;
  f.elements.namedItem('passcode').value='';
  notice('Sign-in preview only — the secure student authentication backend is not connected. No passcode was transmitted or saved.');
});
