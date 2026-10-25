# ARTHREYSQUARED Group Website

Public educational website for the ARTHREYSQUARED Learning Hub, tutorials, publishing, and coursework.

- Public site: https://www.arthreysquared.com
- Hosting: GitHub Pages, published from the **main** branch
- Custom domain: configured with `CNAME`

## Production files

- `index.html`: company homepage, services, publishing and profile
- `coursework.html`: Student Portal for browsing courses and instructor contact
- `Coursework/MSU-IIT/`: five subject pages and public learning resources
- `Coursework/SPC/`: six subject pages and public learning resources
- `styles.css`: responsive brand styles and subject-page layout
- `script.js`: accessible mobile navigation, subject filters and portal tabs
- `assets/`: official logo and instructor profile picture
- `tests/check-site.ps1`: static reference, subject and legacy-account cleanup checks

## New optional enrollment design — development preview

The branch `feature/course-enrollment-ui-preview` adds `enrollment.html` and an **Enroll Now** link for each of the 11 existing subjects. Students can still open any course and read public lessons and handouts without signing up.

When a student selects Enroll Now, the subject is preselected, and the interface displays Student ID Number, Verified Email (not verified yet), Family Name, Given Name, Middle Initial, Section, Password, and Retype Password.

**Design only.** No form submission, account creation, Google Sheets write, credential storage, or email verification is implemented. Use fictitious data for previews. The preview uses a non-submitting field group and JavaScript field checks, clearing entries immediately after a successful check.

### Update VS Code for this preview

```powershell
git status
git fetch origin
git switch feature/course-enrollment-ui-preview
git pull --ff-only origin feature/course-enrollment-ui-preview
git status
.\tests\check-site.ps1
```

Save or commit unrelated local changes before switching branches. If the new branch is not yet known locally, use `git switch --track origin/feature/course-enrollment-ui-preview` after `git fetch origin`.

Open `coursework.html` with Live Server and click **Enroll Now** on a course card. Then inspect `enrollment.html` on both phone-sized and desktop screens.

## Current student access

Lessons and handouts are public and do not require an account. No active student sign-in, registration, protected quiz, results dashboard, or Supabase database integration is present in the **published main branch**. Those obsolete files and links have been removed to prevent misleading sign-in buttons.

The **CET154 OBE-CQI prototype** and future registration UI are developed separately on `feature/obe-cqi-blueprint-builder`. They are **not yet approved/merged** and should not be interpreted as operational student accounts, grading, or Google Sheets synchronization. Any eventual account system must use secure authentication, verify students and map scores through immutable student identifiers.

## Update your local VS Code production files

1. Open your existing `arthreysquared-group` folder in VS Code.
2. In Terminal, run `git status` and save/commit or otherwise back up any unrelated local changes first.
3. Fetch and update the published branch:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git status
```

4. Preview `index.html`, `coursework.html`, and any subject page via VS Code Live Server.
5. Run `./tests/check-site.ps1` in PowerShell to check relative links and ensure retired sign-in components did not return.

## Important

Merging the unfinished development branch as-is is **not** recommended; review its content and resolve merge conflicts before publishing any student-registration functionality. The branch should remain available for CET154 development independently of this public-site cleanup.
