// Public CET154 Google Forms responder link only. This file must NEVER contain Drive file IDs,
// student data, OAuth secrets, instructor credentials, answer keys, or private Sheet URLs.
// Copy the verified Google Form RESPONDER URL here only AFTER enabling verified email collection.
const CET154_REGISTRATION_FORM_URL = '';
const notice=document.getElementById('cet154-registration-status');
const link=document.getElementById('cet154-registration-link');
if(notice&&link&&CET154_REGISTRATION_FORM_URL.trim()){
  try{
    const url=new URL(CET154_REGISTRATION_FORM_URL);
    const trusted=url.protocol==='https:'&&(
      (url.hostname==='docs.google.com'&&/^\/forms\/d\//.test(url.pathname))||
      url.hostname==='forms.gle'
    );
    if(trusted){
      link.href=url.href;
      link.hidden=false;
      notice.textContent='Registration is available through a Google Form. Sign in with your institutional Google account; enrollment requires instructor verification.';
    }
  }catch{/* Leave registration closed until the URL is valid. */}
}
