# ARTHREYSQUARED Group Website

A static GitHub Pages educational website for the ARTHREYSQUARED Learning Hub, tutorials, publishing, and course materials.

**Website:** https://www.arthreysquared.com

## Current site structure

- `index.html` — public ARTHREYSQUARED homepage.
- `coursework.html` — subject listing and instructor profile.
- `Coursework/MSU-IIT/` and `Coursework/SPC/` — existing subject pages, lessons, handouts, and activities.
- `styles.css` and `script.js` — shared responsive design, accessible navigation, subject filters.
- `assets/` — logo and instructor profile image.
- `course-builder.html`, `course-builder.css` — OBE-CQI course blueprint draft editor.
- `js/course-builder.js`, `js/blueprint-model.mjs` — editable modules, ILO/CO mapping, assessment allocation, and validation.
- `BLUEPRINT-SETUP.md` — blueprint editor usage, current limits, and future integration notes.
- `tests/` — static link checks, blueprint model tests, and student UID/grade alignment tests.
- `account.html`, `account.css`, and `js/student-account.js` — native website account design (preview, not active registration).
- `STUDENT-REGISTRATION-SETUP.md` — on-site account preview, Git synchronization and security/backend rollout requirements.

## Start in VS Code

1. Open this repository folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**, or run `python -m http.server 8765 --bind 127.0.0.1`.
3. Open `coursework.html` for your subjects or `course-builder.html` to edit course blueprints.
4. Export your course blueprint JSON draft for backups and future import.

## Current capabilities and limitations

Public coursework remains available with no sign-in. The OBE-CQI blueprint editor runs entirely in your browser, saves local drafts, and exports JSON and CSV blueprints. It is **not an authenticated instructor portal**. Do not put private syllabi, student identities, grades, passwords, or answer keys in the editor.

An ARTHREYSQUARED-branded account registration/sign-in **website UI** is implemented in preview mode; it never saves or transmits credentials or creates accounts yet. Registration will eventually write to private subject/section Google Sheets through a secure instructor-controlled backend with password hashing, email/identity verification, rate limits and audit. Real registration, protected quizzes, official grading/CO attainment, and PDF reports are not yet active. No Supabase integration or SMTP setup is needed for the current static site.

## Development checks

- Static links and existing subject pages: `./tests/check-site.ps1` in Windows PowerShell.
- Blueprint model tests (requires Node.js): `node --test tests/blueprint.test.mjs`.
- Student roster/UID integrity tests: `node --test tests/student-record-model.test.mjs`.

## Publishing

The existing `CNAME` and GitHub Pages workflow publish the site under `www.arthreysquared.com`. Preserve existing subject page paths when updating lessons. Review feature branches and tests before merging into `main`.
