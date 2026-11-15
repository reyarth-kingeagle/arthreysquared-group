# ARTHREYSQUARED Group Website

A public, privacy-first educational website with coursework, instructional resources, tutorials, and publishing information.

- Website: https://www.arthreysquared.com/
- Hosting: GitHub Pages; default branch: `main`
- Custom domain: `CNAME` points to `www.arthreysquared.com`

## What is public

- `index.html`: homepage, services, educational publishing, and contact links
- `coursework.html`: public Learning Hub, course listings, and instructor contact details
- `Coursework/MSU-IIT/`: five public subject pages
- `Coursework/SPC/`: six public subject pages
- `privacy.html`: privacy notice
- `enrollment.html`: static notice for visitors using old enrollment bookmarks; **no form, script, or personal-data collection**
- `styles.css`, `script.js`, `assets/`: styles, navigation, and public artwork
- `tests/check-site.ps1`: checks file links, subject pages, and absence of registration interfaces

## Student data policy

**No student registration, login, passwords, or academic record collection is offered on this public website.** Educational pages can be browsed without an account. Do not publish student names or rosters, ID numbers, emails, grades, or private Google Sheets here.

Official class records and graded assessments must remain in institution-approved services with restricted access. Public learning materials can be shared without requiring student enrollment.

On November 15, 2026 the public enrollment interfaces, CET154 Google Apps Script link/configuration, and retired registration source were removed from the current branch. The old `enrollment.html` URL now shows a non-collecting retirement notice.

**Important:** Removing GitHub files or links does **not** disable an already deployed Google Apps Script web app or revoke its spreadsheet permissions. The owner must separately disable/archive the old CET154 deployment in Google Apps Script and review access to the private student roster. Git history may still contain earlier source code; deleting files from the current branch is not history erasure.

### Retire the old CET154 deployment (owner action required)

1. Open the private CET154 Student Registry Google Sheet while signed in as its owner.
2. Select **Extensions → Apps Script**.
3. Open **Deploy → Manage deployments**. Find the deployed registration web app and select **Archive** (or disable/remove it if shown).
4. Verify that its old `/exec` link no longer accepts registration. Do **not** submit genuine student details to test it.
5. In the Google Sheet, review **Share** permissions and restrict access to authorized staff. Review any previously submitted records under your institution's data-retention requirements.
6. If the Apps Script is used for other workflows, do not delete the entire script project; retire only its student-registration deployment.

## Sync with VS Code (Windows PowerShell)

Open the `arthreysquared-group` folder in VS Code. Save or commit your local edits before syncing.

```powershell
git status
git fetch origin
git switch main
git pull --ff-only origin main
.\tests\check-site.ps1
```

If execution policy blocks the test, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\check-site.ps1` after reviewing the script.

To preview locally, open `index.html` or `coursework.html` using the VS Code Live Server extension. Check the 11 subject links, `privacy.html`, and the old `enrollment.html` notice. For production, verify the live GitHub Pages deployment and check it on desktop and mobile.

## Development safeguards

Use a feature branch and a pull request for significant changes. Keep `main` deployable. Never add private data, access tokens, or Google Sheet contents to this public repository. Static source and GitHub Pages cannot securely host private student academic records.
