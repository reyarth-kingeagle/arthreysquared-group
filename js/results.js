import { ready, client, session, siteUrl, authUrl, uuid, status, rpc, readableError } from './core.js';

export async function init() {
  const message = document.querySelector('[data-page-status]');
  await ready;
  if (!client) { status(message, 'Results are unavailable until accounts are configured.', true); return; }
  const attempt = new URLSearchParams(location.search).get('attempt');
  const destination = location.href;
  if (!session) { location.replace(authUrl('signin', destination)); return; }
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email_confirmed_at) { location.replace(authUrl('signin', destination)); return; }
    const rows = attempt && uuid.test(attempt)
      ? [await rpc('get_result', { p_attempt_id: attempt })]
      : await rpc('my_results');
    const holder = document.querySelector('[data-results]');
    holder.replaceChildren();
    if (!rows?.length) { status(message, 'No submissions are available for this account yet.'); return; }
    for (const result of rows) {
      const card = document.createElement('article'); card.className = 'result-card';
      const heading = document.createElement('h2'); heading.textContent = result.title;
      const subject = document.createElement('p'); subject.textContent = result.subject_code + ' · ' + result.status;
      const submitted = document.createElement('p'); submitted.textContent = 'Submitted: ' + (result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'Not submitted');
      card.append(heading, subject, submitted);
      if (result.status === 'in_progress') {
        const resume = document.createElement('a'); resume.className = 'btn btn-secondary'; resume.href = siteUrl('quiz.html?attempt=' + result.id); resume.textContent = 'Resume assessment'; card.append(resume);
      } else if (result.released) {
        const score = document.createElement('p'); score.textContent = 'Score: ' + result.score + ' / ' + result.max_score; card.append(score);
        for (const answer of result.answers || []) {
          const detail = document.createElement('section'); detail.className = 'assessment-card';
          const q = document.createElement('h3'); q.textContent = answer.prompt; detail.append(q);
          const chosen = answer.options?.find((o) => o.id === answer.selected_option_id);
          const correct = answer.options?.find((o) => o.id === answer.correct_option_id);
          detail.append(document.createElement('p'));
          detail.lastChild.textContent = 'Your answer: ' + (chosen?.text || 'No answer') + '. Correct answer: ' + (correct?.text || 'Not available') + '.';
          if (answer.explanation) { const exp = document.createElement('p'); exp.textContent = answer.explanation; detail.append(exp); }
          card.append(detail);
        }
      } else {
        const withheld = document.createElement('p'); withheld.textContent = 'Your submission is recorded. Results and explanations have not been released.'; card.append(withheld);
      }
      holder.append(card);
    }
  } catch (error) { status(message, readableError(error), true); }
}
