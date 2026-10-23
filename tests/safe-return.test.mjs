import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturn } from '../js/return-url.js';

const origin = new URL('https://www.arthreysquared.com/');
const id = '123e4567-e89b-42d3-a456-426614174000';
const fallback = 'https://www.arthreysquared.com/coursework.html';

test('returns to an explicitly selected quiz or attempt', () => {
  assert.equal(safeReturn('quiz.html?id=' + id, origin), 'https://www.arthreysquared.com/quiz.html?id=' + id);
  assert.equal(safeReturn('quiz.html?attempt=' + id, origin), 'https://www.arthreysquared.com/quiz.html?attempt=' + id);
});

test('allows only the portal and results page as non-assessment destinations', () => {
  assert.equal(safeReturn('coursework.html', origin), fallback);
  assert.equal(safeReturn('/results.html', origin), 'https://www.arthreysquared.com/results.html');
});

test('rejects open redirects and unexpected internal paths', () => {
  for (const target of [
    'https://evil.example/quiz.html?id=' + id,
    '//evil.example/quiz.html?id=' + id,
    'javascript:alert(1)',
    'account.html?mode=callback',
    'quiz.html?id=' + id + '&next=https://evil.example',
    'quiz.html?id=not-a-uuid',
    'quiz.html?id=' + id + '&attempt=' + id,
    'https://user@www.arthreysquared.com/quiz.html?id=' + id,
    'https://www.arthreysquared.com/quiz.html?id=' + id + '#fragment',
    '/project/quiz.html?id=' + id
  ]) assert.equal(safeReturn(target, origin), fallback, target);
});

test('keeps GitHub Pages project-subpath returns inside their base path', () => {
  const project = new URL('https://example.github.io/arthreysquared/');
  assert.equal(safeReturn('quiz.html?id=' + id, project), 'https://example.github.io/arthreysquared/quiz.html?id=' + id);
  assert.equal(safeReturn('../quiz.html?id=' + id, project), 'https://example.github.io/arthreysquared/coursework.html');
});
