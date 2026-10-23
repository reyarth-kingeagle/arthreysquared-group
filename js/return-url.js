export const assessmentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Permit only explicit site destinations, with UUID assessment/attempt IDs.
// This is a UI redirect guard; server RPCs independently enforce access.
export function safeReturn(value, siteBase) {
  const fallback = new URL('coursework.html', siteBase).href;
  if (typeof value !== 'string' || !value || /[\\\s\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, siteBase);
    if (url.origin !== siteBase.origin || url.username || url.password || url.hash) return fallback;
    if (!url.pathname.startsWith(siteBase.pathname)) return fallback;
    const path = url.pathname.slice(siteBase.pathname.length);
    if (['coursework.html', 'results.html'].includes(path) && !url.search) return url.href;
    if (path !== 'quiz.html') return fallback;
    const entries = [...url.searchParams];
    if (entries.length !== 1 || !['id', 'attempt'].includes(entries[0][0]) || !assessmentIdPattern.test(entries[0][1])) return fallback;
    return url.href;
  } catch { return fallback; }
}
