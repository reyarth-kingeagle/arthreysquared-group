/**
 * CET154 private roster eligibility POLICY (pure logic, testable in Node).
 *
 * This file contains NO real student names and performs NO spreadsheet writes.
 * It belongs behind a trusted server, never imported by the public enrollment page.
 * A successful roster match is NOT identity proof or permission to log in.
 * Only a trusted instructor review may approve the applicant.
 * Never return the roster details to a public browser.
 */
const normal = (value) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleUpperCase('en');
export const REQUIRED_ROSTER_HEADERS = Object.freeze([
  'Student ID Number', 'Verified Email', 'Family Name', 'Given Name', 'Middle Name', 'Section'
]);

export function isRosterTab(tab) {
  if (!tab || typeof tab.title !== 'string' || !Array.isArray(tab.rows) ||
      !tab.rows.length || tab.title.toUpperCase().startsWith('ARCHIVE_')) return false;
  const head = tab.rows[0];
  return REQUIRED_ROSTER_HEADERS.every((column, i) => normal(head[i]) === normal(column));
}

export function listEligibleSections(tabs) {
  const sections = [];
  const found = new Set();
  for (const tab of tabs) {
    if (!isRosterTab(tab)) continue;
    const name = tab.title.trim();
    if (found.has(normal(name))) throw new Error('Ambiguous section tabs; instructor must resolve');
    found.add(normal(name));
    sections.push(name);
  }
  return sections;
}

/**
 * Returns only internal references to be used server-side.
 * IMPORTANT: Never return the matched row or existence status via a public
 * unauthenticated endpoint, because doing so enables roster enumeration.
 *
 * tab.rows[0] = header. rowNumber is ephemeral and MUST be revalidated
 * against same name/section + immutable Student UID immediately before write.
 */
export function matchPrivateRoster(tabs, { section, familyName, givenName }) {
  const sections = listEligibleSections(tabs);
  const selected = sections.find(item => normal(item) === normal(section));
  if (!selected || !normal(familyName) || !normal(givenName))
    return {status:'REVIEW_REQUIRED',reason:'UNKNOWN_OR_INVALID'};
  const tab = tabs.find(item => item.title === selected);
  const matches = [];
  tab.rows.slice(1).forEach((row, rowOffset) => {
    if (normal(row[2]) === normal(familyName) && normal(row[3]) === normal(givenName))
      matches.push({rowNumber:rowOffset + 2, studentId:row[0], email:row[1], familyName:row[2], givenName:row[3]});
  });
  if (matches.length !== 1) return {status:'REVIEW_REQUIRED',reason:matches.length?'AMBIGUOUS':'NOT_FOUND'};
  return {status:'ELIGIBLE_PENDING_INSTRUCTOR_REVIEW',section:selected,internalMatch:matches[0]};
}

/** Public-facing wording must be generic for all identity/roster failures. */
export function safeUserMessage(status) {
  if(status === 'APPROVED') return 'Your enrollment is approved. Student sign-in will be available once account access is enabled.';
  if(status === 'PENDING_INSTRUCTOR_REVIEW') return 'Your enrollment request is pending face-to-face verification by your instructor.';
  return 'We could not complete your enrollment verification. Please contact your instructor.';
}
