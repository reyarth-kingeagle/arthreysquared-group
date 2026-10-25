import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('CET154 registration uses a real configured Google Apps Script web-app URL', () => {
  const config = read('js/cet154-registration-config.js');
  const match = config.match(/^export const CET154_REGISTRATION_WEB_APP_URL = '(https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec)';$/m);
  assert.ok(match, 'Deployment URL must be assigned, not merely placed inside a comment');
});

test('live CET154 hides the design preview and displays the official link', () => {
  const script = read('js/enrollment-preview.js');
  const page = read('enrollment.html');
  assert.match(script, /launch\.hidden = !active/);
  assert.match(script, /preview\.hidden = active/);
  assert.match(script, /previewNotice\.hidden = active/);
  assert.match(page, /id="cet154-live-link"/);
  assert.match(page, /id="cet154-live-registration"/);
});

test('the public CET154 page no longer says its registration is only a design preview', () => {
  const html = read('Coursework/MSU-IIT/cet154.html');
  assert.doesNotMatch(html, /Design preview only/i);
  assert.match(html, /enrollment\.html\?subject=msuiit-cet154/);
});
