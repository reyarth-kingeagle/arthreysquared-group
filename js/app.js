import { ready, client, session, initError, siteUrl, authUrl, el, status, rpc, requireUser, readableError, dateText } from './core.js';

function renderControls() {
  document.querySelectorAll('[data-account-controls]').forEach((bar) => {
    const focused = bar.contains(document.activeElement);
    bar.replaceChildren();
    const links = session ? [['My account', siteUrl('account.html')], ['My results', siteUrl('results.html')]] : [['Sign in', authUrl('signin')], ['Create account', authUrl('signup')]];
    for (const [label, href] of links) { const a = el('a', label, 'btn btn-secondary'); a.href = href; bar.append(a); }
    if (session) {
      const button = el('button', 'Sign out', 'btn btn-secondary'); button.type = 'button';
      button.addEventListener('click', async () => {
        button.disabled = true;
        const { error } = await client.auth.signOut();
        if (error) { status(document.querySelector('[data-account-status]'), 'Sign-out failed. Please try again.', true); button.disabled = false; }
      });
      bar.append(button);
    }
    if (focused) bar.querySelector('a')?.focus();
  });
  status(document.querySelector('[data-account-status]'), initError || (session ? 'You are signed in.' : 'Accounts are optional. Public learning materials are open to everyone.'));
}

async function loadSubject() {
  const list = document.querySelector('[data-assessment-list]');
  if (!list || !client) return;
  const subject = document.body.dataset.subject;
  try {
    const { data, error } = await client.from('assessments').select('id,title,instructions,access_type,opens_at,closes_at,max_attempts,time_limit_minutes').eq('subject_id', subject).eq('published', true).order('title');
    if (error) throw error;
    list.replaceChildren();
    if (!data.length) list.append(el('p', 'No quizzes or class tests have been published for this subject yet.'));
    for (const assessment of data) {
      const card = el('article', undefined, 'assessment-card');
      card.append(el('h3', assessment.title), el('p', assessment.instructions || 'Instructions will appear before you begin.'), el('p', assessment.access_type === 'class' ? 'Class test · approved enrollment required' : 'Practice quiz · sign-in required'));
      card.append(el('p', `Opens: ${dateText(assessment.opens_at)} · Closes: ${dateText(assessment.closes_at)}`));
      const link = el('a', assessment.access_type === 'class' ? 'Start Test' : 'Start Quiz', 'btn btn-primary');
      link.href = siteUrl(`quiz.html?id=${assessment.id}`); card.append(link); list.append(card);
    }
    const enroll = document.querySelector('[data-enroll]');
    enroll.hidden = false;
    enroll.onclick = async () => {
      enroll.disabled = true;
      try {
        if (!await requireUser(siteUrl('coursework.html'))) return;
        await rpc('request_enrollment', { p_subject_id: subject });
        status(document.querySelector('[data-enrollment-status]'), 'Your enrollment request is recorded. Class tests require instructor approval; check My account for your status.');
      } catch (error) { status(document.querySelector('[data-enrollment-status]'), readableError(error), true); }
      finally { enroll.disabled = false; }
    };
  } catch { status(list, 'Assessments could not be loaded. Public learning materials are still available.', true); }
}

await ready;
renderControls();
document.addEventListener('account-change', renderControls);
await loadSubject();
const page = document.body.dataset.page;
if (['account', 'quiz', 'results', 'instructor'].includes(page)) {
  try { await (await import(`./${page}.js`)).init(); }
  catch (error) { status(document.querySelector('[data-page-status]'), readableError(error), true); }
}
