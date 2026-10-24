# ARTHREYSQUARED Student Account — Website UI Pilot

## Why the old Supabase sign-in is still on the public website

The public site is built from GitHub branch `main`, while the cleanup and new account design live on `feature/obe-cqi-blueprint-builder` in an **unmerged draft pull request**. Once the PR is reviewed and merged, the old Supabase pages and scripts disappear from the deployed site.

## What is available on the feature branch

- New native website page: `account.html`. Registration and sign-in views use the existing navy/teal/gold brand and mobile-responsive layout.
- All 11 actual subject pages now link to the same account page with their own subject ID.
- Students can select a subject and enter family name, given name, middle initial, ID number, email, section, and a passcode with confirmation.
- CET154 uses the institutional email format `@g.msuiit.edu.ph` for client-side guidance. School email ownership cannot be verified just by matching the suffix.
- Sign-in view shows email + passcode fields. Forgotten passcodes require a credential-only reset, never deletion of student records or marks.
- Form UI validates fields and **does not send, store or log passcodes or personal information**. Until a vetted authentication backend is live, both submit buttons clearly indicate preview mode.
- The public course catalog lists all 11 existing subject IDs.
- Pure future grading utilities in `js/student-record-model.mjs` demonstrate surname/given name sorting of complete records and matching scores by permanent `studentUid` rather than by row number.
- The existing private CET154 master spreadsheet remains in the instructor-only LMS Drive folder. No real registration rows or scores have been written.

## Important: what is NOT implemented yet

The website frontend **cannot safely verify passcodes by reading Google Sheets directly**. GitHub Pages is static and cannot keep private credentials. This means the current registration UI is intentionally inactive.

The next technical milestone is an **authenticated server-side account service** with:

1. Course/section whitelist and institutional email verification or instructor confirmation before account activation;
2. Strong passcode storage (per-account salt, established password hashing such as Argon2id/scrypt/bcrypt or equivalent), never plaintext in Google Sheets;
3. Rate limiting, safe login/session management, recovery, audit, duplicate-email/ID checks and anti-abuse controls;
4. Instructor-controlled read/write access to the owner-only private Google Sheets files (no publicly editable student roster);
5. Permanent student UID joining Section Student Dataset, Score Ledger and Grading System, so late alphabetical insertions do not move scores to another student.

Google Apps Script can automate the Sheets/Drive operations. Its HTML Service is **not** a secure direct browser-to-Sheets password database. An Apps Script web app with a controlled authentication implementation, or another appropriately authenticated server, must be designed and live-tested. The previous Google Forms pilot has been retired; no Google Form is needed for the website registration UX.

## Synchronize changes from GitHub to VS Code

Open VS Code in your `arthreysquared-group` folder. Open Terminal > New Terminal. Before any fetch, run:

    git status

If you have local uncommitted work, commit or back it up before switching branches. Then:

    git fetch origin
    git switch feature/obe-cqi-blueprint-builder
    git pull --ff-only origin feature/obe-cqi-blueprint-builder
    git status

For a first-time branch checkout, if needed:

    git switch --track origin/feature/obe-cqi-blueprint-builder

## Preview and test

Open `account.html` with VS Code Live Server. Toggle Create account / Sign in and select CET154; enter **fictitious data only**. The confirmation says no account was created. Test any other subject's course page buttons; they should open the matching subject preselected in `account.html`.

For local tests with Node.js and PowerShell:

    node --test tests/student-record-model.test.mjs
    node --test tests/blueprint.test.mjs
    .\tests\check-site.ps1

No form should claim success or accept real student information until the secured backend is implemented. Use no real student passcodes or personal information in preview tests.

## Publishing the new design

The project remains on a draft feature branch. After reviewing and testing Pull Request #1, it must be marked ready and merged to `main` to change the public website. Once merged, update your local production branch:

    git switch main
    git pull --ff-only origin main

A successful pull updates local VS Code files, while GitHub Pages publishes from its configured branch. Changes committed by the assistant directly to GitHub are already remote and do not need `git add`, `git commit`, or `git push` from your PC.
