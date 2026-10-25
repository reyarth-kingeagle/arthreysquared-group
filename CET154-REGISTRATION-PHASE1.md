# CET154 enrollment — private Google Sheet + face-to-face instructor verification

**Status: UI review and pure matching policy only. NOT live account creation or registration.** No student roster rows, IDs, emails, grades, or passcodes are in this public repository.

## Live private data source

- Google Sheet: **CET154 — Student Registry** (in the restricted instructor-owned CET154 folder).
- Existing roster tabs: **H1W23** (26 names) and **H1M23** (22 names).
- Current headers A:G: `Student ID Number`, `Verified Email`, `Family Name`, `Given Name`, `Middle Name`, `Section`, `Password`.
- Only family and given names are currently populated. The existing `Password` column must **remain blank** until a secure backend is implemented. In a future explicit schema update it could become `Password Hash`, containing only a slow, per-user salted password hash produced by a trusted service—not a readable password. Alternatively, use a separate instructor-only credential tab within the Google ecosystem.
- The private Google Sheet was verified to have owner-only permissions. Never put its content into GitHub Pages, JavaScript bundles, or a public JSON response.

## Intended student sequence

1. Anyone globally can read all public course topics and handouts without signing up.
2. A student chooses CET154, then an **active roster tab/section**. The form gathers student ID number, full family and given names, middle **name** (not just an initial), institutional email, and password/confirmation.
3. A trusted **server-side** service reads the private registry and performs an exact normalized full-name match **inside the selected section tab**. It never changes the grade or class-record row order.
4. No match or ambiguous duplicate name: send the same generic notice: **“We could not complete your enrollment verification. Please contact your instructor.”** Log internally for instructor review. Do not publicly expose membership, row numbers, or lists of student names.
5. A unique name match means **eligible for instructor review**. It must NOT automatically activate an account or reserve that identity. Create an instructor-only pending request record; a claim made by someone else must never prevent the actual student from registering.
6. The instructor manually confirms the registrant's school ID, full name, section, submitted ID number and institutional email **face-to-face**. The student can show their authenticated school email account on their own device as evidence; the instructor must NEVER ask for their password. Face-to-face checks reduce—but cannot absolutely eliminate—email impersonation. No emailed verification code is required.
7. The authorized instructor marks the request APPROVED, REJECTED or REVIEW_REQUIRED, recording reviewer and timestamp. Only after approval may the secure backend atomically bind one permanent Student UID, verified email, submitted Student ID, middle name and section to the single matching roster record. Enforce unique Student ID/email, avoid duplicate claims and protect existing scores. Passwords require a slow salted hash from a trusted authentication service (Argon2id preferred; approved alternatives scrypt, bcrypt, PBKDF2), rate limits, secure sessions and safe reset. A private Sheet is **not** adequate protection for plaintext passwords. Never expose hashed credentials or secret keys in browser code.
8. Only **instructor-approved** enrollments may later take restricted quizzes/exams. Until then, the status remains PENDING_INSTRUCTOR_REVIEW and public learning materials remain open. Proposed private status sequence: ROSTER_AVAILABLE → PENDING_INSTRUCTOR_REVIEW → APPROVED; REVIEW_REQUIRED/REJECTED are exceptions. Those assessments are not in scope.

## Instructor review and credential safety

- Pending requests should record a unique request ID, section, matched Student UID (internal only), Student ID, submitted institutional email, full middle name, requested date, and status PENDING_INSTRUCTOR_REVIEW. Do not send a list of roster names to public browsers.
- During face-to-face review, compare against the university's class list, institutional ID and the student's authenticated school email. If they used a classmate's email, reject or correct the pending request; do not replace another student's approved identity.
- The existing private Google Sheet is the planned database. If password-derived authentication data are kept within it, they must be **slow salted password hashes**, not raw passwords, not reversible encryption and not fast SHA-256. Do not manually inspect or request real passwords.
- The Google Sheet header **Verified Email** should only be filled/confirmed after instructor approval. Before that, the submitted email is unverified; it belongs in the private pending-request ledger.
- Implementation choice for later: Google Apps Script can operate private Sheets, but an owner-executed web app runs with the owner's rights. Public student requests require strict server-side validation and authorization; GitHub Pages alone cannot directly perform safe private-sheet writes.
## Reuse next semester or next year without editing code

The backend should enumerate the **private Google Sheet's current tab names** and recognize roster tabs by the existing A:F header signature—not hardcode `H1W23` or `H1M23` in public JavaScript. Additional section tabs become eligible automatically if their headers match.

Name tabs with unique academic-year/term prefixes, e.g. `AY2027-28_H1W23`, to avoid Google Sheets' duplicate tab-name restriction. To close an older cohort without changing code, rename its tab to start with `ARCHIVE_`. The server must exclude archived tabs from new enrollment while retaining past records. Avoid reusing an old section tab for a new cohort.

This matches the user's preference to add section roster tabs rather than edit site source each academic year. The backend must still validate instructor-controlled `active` state in the private data source before activating accounts.

## Grading-row invariants

- The section roster contains one unique permanent Student UID per person (assign if absent when secure enrollment is implemented).
- Never use spreadsheet row position as a student identity; grades/assessment entries are linked to **Student UID + Assessment ID**.
- Store unapproved requests separately and never overwrite roster cells based only on a name match. Approved updates must re-read the target roster row and confirm UID, name, and section under a lock before any write.
- Sort the **entire** populated student record range together, never only the Family Name column.
- Never delete student assessments on password reset, repeat registration, or a new cohort.

## This phase's exact boundaries

Implemented:
- CET154-specific public enrollment explanation updated for **face-to-face instructor approval**, retaining the approved page styling.
- Middle **Name** field for CET154, matching the registry (other courses keep Middle Initial).
- `server/cet154-roster-policy.mjs`: testable private roster matching policy, with synthetic names only.
- `tests/cet154-roster-policy.test.mjs`: section matches, no-match, duplicate handling, automatic new cohort tab discovery, archive exclusion, pending-instructor status, generic public error message.

Not implemented: live registration, Google Sheets reads/writes from the website, private pending requests, face-to-face approval recording, credential hashing, login sessions, instructor dashboard or assessments. **Do not open an owner-privileged Google Apps Script endpoint to the public without secure authorization, duplicate-claim protection, abuse prevention and locked writes.** The public page remains a non-submitting design preview.

## VS Code review and synchronization

Before syncing, open VS Code > Terminal and run `git status`. Save/commit or back up local changes before switching. Then:

```powershell
git fetch origin
git switch feature/cet154-roster-verification-phase1
git pull --ff-only origin feature/cet154-roster-verification-phase1
git status
node --test tests/cet154-roster-policy.test.mjs
.\tests\check-site.ps1
```

For a first-time local branch: `git switch --track origin/feature/cet154-roster-verification-phase1` after fetch, then pull.

Open `enrollment.html?subject=msuiit-cet154` through VS Code Live Server and inspect the CET154-specific explanatory notice and Middle Name field. No genuine student details should be used for a design preview.
