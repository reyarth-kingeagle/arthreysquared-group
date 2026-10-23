import { config } from './config.js';
import { safeReturn as validateReturn, assessmentIdPattern } from './return-url.js';

export const base = new URL('../', import.meta.url);
export const uuid = assessmentIdPattern;
export const siteUrl = (path) => new URL(path, base).href;

// A small destination allowlist, not a generic same-origin redirect.
export function safeReturn(value) {
  return validateReturn(value, base);
}

export function authUrl(mode = 'signin', destination = location.href, quiz = false) {
  const url = new URL('account.html', base);
  url.searchParams.set('mode', mode);
  url.searchParams.set('return', safeReturn(destination));
  if (quiz) url.searchParams.set('reason', 'quiz');
  return url.href;
}

export const unavailable = 'Accounts and quizzes are currently unavailable. Public coursework remains available. Please try again later or contact your instructor.';
export let client = null;
export let session = null;
export let initError = '';

function validConfig() {
  try {
    const url = new URL(config.supabaseUrl);
    const hostAllowed = url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
    if (!hostAllowed || url.username || url.password || !config.publishableKey) return false;
    if (config.publishableKey.startsWith('sb_secret_')) return false;
    if (config.publishableKey.startsWith('sb_publishable_')) return true;
    const payload = JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}

export const ready = (async () => {
  if (!validConfig() || !['http:', 'https:'].includes(location.protocol)) {
    initError = unavailable;
    return;
  }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
    client = createClient(config.supabaseUrl, config.publishableKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, autoRefreshToken: true, persistSession: true }
    });
    client.auth.onAuthStateChange((event, next) => {
      session = next;
      // Never call Supabase methods synchronously inside its auth lock.
      setTimeout(() => document.dispatchEvent(new CustomEvent('account-change', { detail: { event, session: next } })), 0);
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data.session;
  } catch {
    initError = unavailable;
    client = null;
  }
})();

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function status(target, message, error = false, focus = false) {
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('error-message', error);
  if (focus) { target.tabIndex = -1; target.focus(); }
}
export function readableError(error) {
  if (/jwt|session|refresh.token|not authenticated|sign in|authentication/i.test(error?.message || '')) {
    return 'Your session has expired. Your answers have not been confirmed as saved. Sign in again, then check My results before retrying.';
  }
  return error?.message || 'The request could not be completed. Nothing has been confirmed as saved. Please try again.';
}
export async function rpc(name, args = {}) {
  await ready;
  if (!client) throw new Error(unavailable);
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function requireUser(destination = location.href, quiz = false) {
  await ready;
  if (!client) throw new Error(unavailable);
  if (!session) { location.assign(authUrl('signin', destination, quiz)); return null; }
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    location.assign(authUrl('signin', destination, quiz));
    return null;
  }
  return data.user;
}
export function dateText(value) { return value ? new Date(value).toLocaleString() : 'Not set'; }
