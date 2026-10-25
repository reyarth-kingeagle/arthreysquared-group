import {courses} from './course-catalog.mjs';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const select=$('signup-course');
const normalize=id=>id.replaceAll('.','-');
for(const course of courses){
  const option=document.createElement('option');
  option.value=course.id;
  option.textContent=`${course.institution} · ${course.name}`;
  select.append(option);
}
const requested=params.get('course');
const selected=courses.find(course=>course.id===requested||normalize(course.id)===requested);
if(selected)select.value=selected.id;
const guidance=$('course-guidance'),status=$('account-status');
function guide(){
  const course=courses.find(item=>item.id===select.value);
  guidance.textContent=course?.emailDomain
    ? `Use your ${course.institution} email ending in @${course.emailDomain}. Your school email ownership will still need verification.`
    : 'Use the email address approved by your institution. Your enrollment will need instructor verification.';
  document.querySelector('#signup-form [name=email]').placeholder=course?.emailDomain?`student@${course.emailDomain}`:'Your institutional email';
}
select.addEventListener('change',guide);
guide();
function notice(message,error=false){status.textContent=message;status.dataset.error=String(error);status.focus({preventScroll:true});}
$('signup-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const value=name=>form.elements.namedItem(name).value.trim();
  const course=courses.find(item=>item.id===value('course'));
  const email=value('email').toLowerCase();
  if(!course){notice('Select a valid subject.',true);return;}
  if(course.emailDomain&&(email.split('@').length!==2||email.includes(' ')||!email.endsWith(`@${course.emailDomain}`))){
    notice(`Use your ${course.institution} email ending in @${course.emailDomain}.`,true);
    form.elements.namedItem('email').focus();
    return;
  }
  const password=form.elements.namedItem('passcode');
  const confirmation=form.elements.namedItem('confirmation');
  if(password.value!==confirmation.value){
    notice('The passwords do not match. Retype both passwords.',true);
    confirmation.focus();
    return;
  }
  if(password.value.length<12){notice('Use a password with at least 12 characters.',true);password.focus();return;}
  // No student data or credentials are transmitted or stored until a secure backend is connected.
  password.value='';confirmation.value='';
  notice('The details passed the browser checks, but enrollment was not submitted: the secure registration and Google Sheets service is not connected. No information was saved.');
});
