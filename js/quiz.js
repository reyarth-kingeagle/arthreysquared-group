import { ready, client, session, siteUrl, authUrl, uuid, status, rpc, readableError, dateText } from './core.js';

export async function init() {
  const message = document.querySelector('[data-page-status]');
  const form = document.querySelector('[data-quiz-form]');
  await ready;
  if (!client) { status(message, 'Quizzes are unavailable until the assessment service is configured. Public coursework remains available.', true); return; }
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
    const attemptId = params.get('attempt');
  if ((id && !uuid.test(id)) || (attemptId && !uuid.test(attemptId)) || (!id && !attemptId) || (id && attemptId) || [...params.keys()].some(key => !['id', 'attempt'].includes(key))) {
    status(message, 'This assessment link is not valid.', true); return;
  }
  if (!session) {
    status(message, 'Please sign in or create an account to take this quiz.');
    location.replace(authUrl('signin', location.href, true)); return;
  }
  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user?.email_confirmed_at) {
      status(message, 'Please sign in and verify your email to take this quiz.');
      location.replace(authUrl('signin', location.href, true)); return;
    }
    let attempt;
    if (attemptId) attempt = await rpc('get_attempt', { p_attempt_id: attemptId });
    else attempt = await rpc('start_attempt', { p_assessment_id: id });
    if (attempt.status === 'submitted') { location.replace(siteUrl('results.html?attempt=' + attempt.id)); return; }
    if (attempt.status === 'expired') { status(message, 'This attempt has expired. No unsaved answers were submitted. You can check My results or ask your instructor for help.', true); return; }
    document.querySelector('[data-quiz-title]').textContent = attempt.title;
    document.querySelector('[data-quiz-subject]').textContent = attempt.subject_code + ' · ' + attempt.subject_title;
    document.querySelector('[data-quiz-instructions]').textContent = attempt.instructions || 'Select one answer for each question. Unanswered questions are marked below.';
    document.querySelector('[data-quiz-deadline]').textContent = attempt.expires_at
      ? 'This attempt ends at ' + dateText(attempt.expires_at) + '. Answers are saved only when you submit.'
      : 'Answers are saved only when you submit.';
    if (!attempt.questions?.length) { status(message, 'This attempt has no questions. Contact your instructor.', true); return; }
    const answers = new Map();
    const questionStates = [];
    for (const [index, question] of attempt.questions.entries()) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'quiz-question';
      const legend = document.createElement('legend');
      legend.textContent = 'Question ' + (index + 1) + ' of ' + attempt.questions.length + ': ' + question.prompt;
      fieldset.append(legend);
      const state = document.createElement('p');
      state.className = 'question-status';
      state.setAttribute('aria-live', 'polite');
      state.textContent = 'Unanswered';
      fieldset.append(state);
      questionStates.push({ state, question });
      for (const option of question.options) {
        const label = document.createElement('label');
        label.className = 'choice';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'question-' + question.id; input.value = option.id; input.required = true;
        input.addEventListener('change', () => { answers.set(question.id, option.id); state.textContent = 'Answered'; });
        label.append(input, document.createTextNode(option.text));
        fieldset.append(label);
      }
      form.append(fieldset);
    }
    const submit = document.createElement('button');
    submit.type = 'submit'; submit.className = 'btn btn-primary'; submit.textContent = 'Submit answers';
    form.append(submit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const missing = questionStates.filter(({ question }) => !answers.has(question.id));
      for (const { state } of missing) state.textContent = 'Unanswered — choose an answer before submitting.';
      if (missing.length) {
        status(message, 'Please answer all ' + missing.length + ' unanswered question(s) before submitting.', true, true);
        missing[0].state.scrollIntoView({ block: 'center' }); return;
      }
      if (!window.confirm('Submit your answers now? You cannot change them after submission.')) return;
      submit.disabled = true;
      status(message, 'Submitting your answers…');
      try {
        const result = await rpc('submit_attempt', { p_attempt_id: attempt.id, p_answers: Object.fromEntries(answers) });
        status(message, 'Your submission was received. Check My results for the status and any released results.');
        form.replaceChildren();
        const resultLink = document.createElement('a');
        resultLink.href = siteUrl('results.html?attempt=' + result.id);
        resultLink.className = 'btn btn-primary'; resultLink.textContent = 'View submission status';
        form.append(resultLink);
      } catch (error) { status(message, readableError(error), true, true); submit.disabled = false; }
    });
  } catch (error) { status(message, readableError(error), true, true); }
}
