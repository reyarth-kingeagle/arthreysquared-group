import { ready, client, session, siteUrl, authUrl, status, rpc, readableError } from './core.js';

function table(target, captionText, columns, rows, action) {
  target.tabIndex = 0;
  target.setAttribute('aria-label', captionText + ' table');
  const table = document.createElement('table');
  const caption = document.createElement('caption'); caption.textContent = captionText; table.append(caption);
  const head = document.createElement('thead'); const tr = document.createElement('tr');
  for (const column of columns) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = column.label; tr.append(th); }
  if (action) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = 'Actions'; tr.append(th); }
  head.append(tr); table.append(head);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const line = document.createElement('tr');
    for (const column of columns) { const td = document.createElement('td'); td.textContent = column.value(row) ?? ''; line.append(td); }
    if (action) {
      const td = document.createElement('td');
      for (const [label, value] of action.values(row)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.className = 'btn btn-secondary';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try { await action.run(row, value); await load(); }
          catch (error) { status(document.querySelector('[data-page-status]'), readableError(error), true); button.disabled = false; }
        });
        td.append(button);
      }
      line.append(td);
    }
    body.append(line);
  }
  table.append(body); target.replaceChildren(table);
}

async function load() {
  const data = await rpc('instructor_overview');
  const enrollments = data.enrollments || [];
  table(document.querySelector('[data-enrollment-table]'), 'Enrollment requests',
    [{label:'Student',value:r=>r.full_name||r.email},{label:'Email',value:r=>r.email},{label:'Subject',value:r=>r.subject_code},{label:'Status',value:r=>r.status}],
    enrollments.filter(r=>r.status==='pending'),
    {values:()=>[['Approve','approved'],['Deny','denied']],run:(r,s)=>rpc('set_enrollment',{p_user_id:r.user_id,p_subject_id:r.subject_id,p_status:s})});
  const submissions = data.submissions || [];
  table(document.querySelector('[data-submissions]'), 'Student submissions',
    [{label:'Student',value:r=>r.full_name||r.email},{label:'Email',value:r=>r.email},{label:'Subject',value:r=>r.subject_code},{label:'Assessment',value:r=>r.title},{label:'Status',value:r=>r.status},{label:'Result',value:r=>r.released?(r.score+' / '+r.max_score):'Withheld'}],
    submissions, {values:r=>[['View submission',r.id]],run:(r,id)=>location.assign(siteUrl('results.html?attempt='+encodeURIComponent(id)))});
  if (!enrollments.filter(r=>r.status==='pending').length) document.querySelector('[data-enrollment-table]').textContent='No pending enrollment requests.';
  if (!submissions.length) document.querySelector('[data-submissions]').textContent='No submissions yet.';
}

export async function init() {
  const message = document.querySelector('[data-page-status]');
  await ready;
  if (!client) { status(message,'Instructor tools require a configured assessment service.',true); return; }
  if (!session) { location.replace(authUrl('signin',location.href)); return; }
  try { await client.auth.getUser(); await load(); status(message,'Instructor access confirmed.'); }
  catch (error) { status(message,readableError(error),true); return; }
  document.querySelector('[data-create-assessment]').addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget; const button=form.querySelector('[type="submit"]'); button.disabled=true;
    try {
      const f=form.elements;
      const date=(value)=>value?new Date(value).toISOString():null;
      const questions=JSON.parse(f.questions.value);
      if(!Array.isArray(questions)||!questions.length) throw new Error('Enter at least one question in the JSON array.');
      const assessment={subject_id:f.subject_id.value,title:f.title.value.trim(),instructions:f.instructions.value.trim(),access_type:f.access_type.value,opens_at:date(f.opens_at.value),closes_at:date(f.closes_at.value),max_attempts:f.max_attempts.value?Number(f.max_attempts.value):null,time_limit_minutes:f.time_limit_minutes.value?Number(f.time_limit_minutes.value):null,results_release_at:date(f.results_release_at.value),published:f.published.checked};
      const id=await rpc('save_assessment',{p_assessment:assessment,p_questions:questions});
      status(message,'Assessment saved with ID '+id+'.'+(assessment.published?' It is published.':' It is a draft.'),false,true);
      form.reset(); await load();
    } catch(error) { status(message,readableError(error),true,true); }
    finally { button.disabled=false; }
  });
}
