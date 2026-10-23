import { ready, client, session, siteUrl, safeReturn, status, rpc, readableError } from './core.js';

export async function init() {
  const message = document.querySelector('[data-page-status]');
  await ready;
  if (!client) { status(message, 'Accounts are not configured yet. Public coursework remains available.', true); return; }
  const params = new URLSearchParams(location.search);
  const requestedMode = params.get('mode');
  const callback = requestedMode === 'callback' || (requestedMode !== 'reset' && location.hash.includes('access_token'));
  const destination = safeReturn(params.get('return'));
  const quizReturn = destination.includes('quiz.html?');
  if (params.get('reason') === 'quiz') status(message, 'Please sign in or create an account to take this quiz.');
  if (params.get('error_description')) status(message, 'The email link could not be verified. Request a new link and try again.', true);

  const panels = [...document.querySelectorAll('[data-auth-panel]')];
  const formsWrap = document.querySelector('[data-auth-forms]');
  const profile = document.querySelector('[data-profile]');
  const selectMode = (mode) => {
    for (const panel of panels) panel.hidden = panel.dataset.authPanel !== mode;
    const panel = document.querySelector('[data-auth-panel="' + mode + '"]');
    const input = [...panel.querySelectorAll('input')].find((item) => !item.closest('[hidden]'));
    input?.focus();
  };
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));

  const continueOrShow = async () => {
    if (!session) return false;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email_confirmed_at) {
      selectMode('verify');
      status(message, 'Please verify your email before continuing. Check your inbox for the confirmation link.');
      return true;
    }
    if (quizReturn || callback) { location.replace(destination); return true; }
    formsWrap.hidden = true;
    profile.hidden = false;
    document.querySelector('[data-profile-email]').textContent = data.user.email || '';
    const form = document.querySelector('[data-profile-form]');
    const { data: p } = await client.from('profiles').select('full_name,role').eq('id', data.user.id).maybeSingle();
    form.elements.full_name.value = p?.full_name || data.user.user_metadata?.full_name || '';
    if (['instructor', 'admin'].includes(p?.role)) {
      const link = document.createElement('a');
      link.href = siteUrl('instructor.html');
      link.className = 'btn btn-secondary';
      link.textContent = 'Instructor tools';
      document.querySelector('[data-profile] .action-row').prepend(link);
    }
    const enrollments = await client.from('enrollments').select('subject_id,status,subjects(code,title)').eq('user_id', data.user.id);
    const holder = document.querySelector('[data-enrollments]');
    holder.replaceChildren();
    if (enrollments.error) holder.textContent = 'Enrollment details are unavailable.';
    else if (!enrollments.data?.length) holder.textContent = 'No subject enrollment requests.';
    else for (const item of enrollments.data) {
      const row = document.createElement('p');
      row.textContent = (item.subjects?.code || item.subject_id) + ': ' + item.status;
      holder.append(row);
    }
    return true;
  };

  try {
    if (callback || quizReturn) { if (await continueOrShow()) return; }
    const { data } = await client.auth.getUser();
    if (requestedMode === 'reset' && session && data.user) {
      status(message, 'Enter a new password for your account.');
    } else if (session && data.user) { await continueOrShow(); return; }
    if (requestedMode === 'reset') {
      const hasRecoverySession = Boolean(session) || location.hash.includes('access_token') || new URLSearchParams(location.search).has('code');
      document.querySelector('[data-auth-form="reset-password"]').hidden = !hasRecoverySession;
      document.querySelector('[data-auth-form="reset-request"]').hidden = hasRecoverySession;
      selectMode('reset');
    } else selectMode(requestedMode === 'signup' ? 'signup' : 'signin');
  } catch (error) { status(message, readableError(error), true); }

  document.querySelectorAll('[data-auth-form]').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    status(message, 'Working…');
    try {
      const values = new FormData(form);
      const email = String(values.get('email') || '').trim();
      const password = String(values.get('password') || '');
      const emailRedirectTo = new URL('account.html', location.href);
      emailRedirectTo.searchParams.set('mode', 'callback');
      emailRedirectTo.searchParams.set('return', destination);
      if (form.dataset.authForm === 'signin') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!(await continueOrShow())) status(message, 'Please check your email and verify your account before using quizzes.');
      } else if (form.dataset.authForm === 'signup') {
        const { data, error } = await client.auth.signUp({
          email, password, options: { data: { full_name: String(values.get('full_name')).trim() }, emailRedirectTo: emailRedirectTo.href }
        });
        if (error) throw error;
        if (data.session) { if (!(await continueOrShow())) selectMode('verify'); }
        else { selectMode('verify'); status(message, 'Account created. Check your email to verify your address, then you will return to the selected quiz.'); }
      } else if (form.dataset.authForm === 'reset-request') {
        const redirectTo = siteUrl('account.html?mode=reset&return=' + encodeURIComponent(destination));
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        status(message, 'If that email has an account, a password reset link is on its way.');
      } else if (form.dataset.authForm === 'reset-password') {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        status(message, 'Password updated. You can now sign in.');
        selectMode('signin');
      }
    } catch (error) { status(message, readableError(error), true, true); }
    finally { button.disabled = false; }
  }));
  document.querySelector('[data-profile-form]').addEventListener('submit', async (event) => {
    event.preventDefault(); const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
    try { await rpc('update_my_name', { p_full_name: event.currentTarget.elements.full_name.value.trim() }); status(message, 'Profile saved.'); }
    catch (error) { status(message, readableError(error), true, true); }
    finally { button.disabled = false; }
  });
  document.querySelector('[data-signout]').addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) status(message, 'Sign-out failed. Please try again.', true);
    else location.replace(siteUrl('coursework.html'));
  });
}
