# CET154 roster-verified enrollment — Phase 1 (private architecture)

**Status: UI review and pure matching policy only. NOT live account creation or registration.** No student roster rows, IDs, emails, grades, or passcodes are in this public repository.

## Live private data source

- Google Sheet: **CET154 — Student Registry** (in the restricted instructor-owned CET154 folder).
- Existing roster tabs: **H1W23** (26 names) and **H1M23** (22 names).
- Current headers A:G: `Student ID Number`, `Verified Email`, `Family Name`, `Given Name`, `Middle Name`, `Section`, `Password`.
- Only family and given names are currently populated. The existing `Password` column must **never** hold plaintext passwords; future authenticated credentials belong in a separate secured authentication store. Consider replacing its label with `Enrollment Status` in a future explicitly approved migration.
- The private Google Sheet was verified to have owner-only permissions. Never put its content into GitHub Pages, JavaScript bundles, or a public JSON response.

## Intended student sequence

1. Anyone globally can read all public course topics and handouts without signing up.
2. A student chooses CET154, then an **active roster tab/section**. The form gathers student ID number, full family and given names, middle **name** (not just an initial), institutional email, and password/confirmation.
3. A trusted **server-side** service reads the private registry and performs an exact normalized full-name match **inside the selected section tab**. It never changes the grade or class-record row order.
4. No match or ambiguous duplicate name: send the same generic notice: **“We could not complete your enrollment verification. Please contact your instructor.”** Log internally for instructor review. Do not publicly expose membership, row numbers, or lists of student names.
5. A unique roster match means **eligible for identity verification**, not yet registered. The backend must verify ownership of the school email (e.g. a single-use short-lived verification code, or suitable institution-controlled identity verification). Just typing `@g.msuiit.edu.ph` is insufficient.
6. After the verified email, a secure backend may atomically bind that roster row to one permanent Student UID, verified email, ID number, middle name, and registration timestamp, ensuring no other account can claim that name or ID. Future retries/late enrollees must never overwrite another person's score.
7. Passwords are processed by a trusted authentication service with a modern salted password hash, rate limits, secure sessions, recovery, and no plaintext Sheets cell. Never put hashes, passwords, OTP secrets, or server credentials into public HTML, GitHub, or grading Sheets.
8. Only **verified and instructor-eligible** student enrollments may later take restricted quizzes/exams. Those assessments are not in scope.

## Reuse next semester or next year without editing code

The backend should enumerate the **private Google Sheet's current tab names** and recognize roster tabs by the existing A:F header signature—not hardcode `H1W23` or `H1M23` in public JavaScript. Additional section tabs become eligible automatically if their headers match.

Name tabs with unique academic-year/term prefixes, e.g. `AY2027-28_H1W23`, to avoid Google Sheets' duplicate tab-name restriction. To close an older cohort without changing code, rename its tab to start with `ARCHIVE_`. The server must exclude archived tabs from new enrollment while retaining past records. Avoid reusing an old section tab for a new cohort.

This matches the user's preference to add section roster tabs rather than edit site source each academic year. The backend must still validate instructor-controlled `active` state in the private data source before activating accounts.

## Grading-row invariants

- The section roster contains one unique permanent Student UID per person (assign if absent when secure enrollment is implemented).
- Never use spreadsheet row position as a student identity; grades/assessment entries are linked to **Student UID + Assessment ID**.
- Updates must re-read the target roster row and confirm UID, name, and section under a lock before writing any registration data.
- Sort the **entire** populated student record range together, never only the Family Name column.
- Never delete student assessments on password reset, repeat registration, or a new cohort.

## This phase's exact boundaries

Implemented:
- CET154-specific public enrollment explanation, which retains the approved page styling.
- Middle **Name** field for CET154, matching the registry (other courses keep Middle Initial).
- `server/cet154-roster-policy.mjs`: testable private roster matching policy, with synthetic names only.
- `tests/cet154-roster-policy.test.mjs`: section matches, no-match, duplicate handling, automatic new cohort tab discovery, archive exclusion, generic public error message.

Not implemented: credential processing, Google Sheets writes, OTP delivery, email verification, session cookies, instructor dashboard, exams/quizzes, and actual student account activation. **Do not allow a public page to send registration details to an unauthenticated Apps Script endpoint.**

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
