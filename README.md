# ARTHREYSQUARED Group Website

Public educational website for the ARTHREYSQUARED Learning Hub, tutorials, publishing, and coursework.

- Public site: https://www.arthreysquared.com
- Hosting: GitHub Pages, published from the **main** branch
- Custom domain: configured with `CNAME`

## Production files

- `index.html`: company homepage, services, publishing and profile
- `coursework.html`: Student Portal for browsing courses and instructor contact
- `enrollment.html`, `enrollment.css`, `js/enrollment-preview.js`: public optional-enrollment form design (no backend)
- `Coursework/MSU-IIT/`: five subject pages and public learning resources
- `Coursework/SPC/`: six subject pages and public learning resources
- `styles.css`: responsive brand styles and subject-page layout
- `script.js`: accessible mobile navigation, subject filters and portal tabs
- `assets/`: official logo and instructor profile picture
- `tests/check-site.ps1`: static reference, subject and legacy-account cleanup checks

## Public optional enrollment design — UI accessible, registration not yet active

The website contains `enrollment.html` and an **Enroll Now** link for each of the 11 existing subjects. Students can still open any course and read public lessons and handouts without signing up.

When a student selects Enroll Now, the subject is preselected, and the interface displays Student ID Number, Verified Email (not verified yet), Family Name, Given Name, Middle Initial, Section, Password, and Retype Password.

**Design only.** No form submission, account creation, Google Sheets write, credential storage, or email verification is implemented. Use fictitious data for previews. The preview uses a non-submitting field group and JavaScript field checks, clearing entries immediately after a successful check.

### Update VS Code after the public site is published

Open the `arthreysquared-group` folder in VS Code and inspect `git status`.
Commit or back up any local changes before updating. Then run:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git status
.\tests\check-site.ps1
```

Open `coursework.html` with Live Server or visit https://www.arthreysquared.com/coursework.html and select **Enroll Now** on a subject. Review `enrollment.html` on desktop and mobile. For a direct CET154 design preview visit https://www.arthreysquared.com/enrollment.html?subject=msuiit-cet154.

### Future security requirements

Making student registration functional will require an authenticated server-side service, verified email ownership, secure password storage, session and rate-limit controls, instructor-managed sections, and a private class-record database/Sheets integration. **Do not enter or solicit genuine student IDs, institutional emails, or passwords on the current design-preview form.**

## CET154 private roster registration — prepared but not deployed

The repository now includes a Google Apps Script student registration service in `apps-script/cet154-registration/`. It checks Family Name + Given Name in the selected private roster tab, requires all other registration fields initially blank, and updates the existing student row only once. Repeated complete records are rejected as already registered; missing and partial cases refer to the instructor. The existing Section tabs are recognized dynamically from the private Sheet.

**Important:** This is **not live** yet. The Sheet owner must create/deploy the bound Apps Script web app, test it, and add the actual deployment URL to `js/cet154-registration-config.js` before the CET154 enrollment button launches the Google-hosted form. Do not enter student information into the current preview until live activation. See `apps-script/cet154-registration/SETUP.md`.

No real student names, credentials, HMAC secret, or private spreadsheet ID are stored in public GitHub source. The Google Sheet is unchanged. Students remain able to access public coursework without enrollment.

A roster-name match is **not proof of identity or verified email ownership**. Student emails are format-checked; instructor confirmation or school sign-in is recommended before releasing restricted assessments. No quizzes or assessments are included here.

## Current student access

Lessons and handouts are public and do not require an account. No active student account creation, secure sign-in, registration storage, protected quiz, results dashboard, or Supabase database integration is present in the **published main branch**. Those obsolete files and links have been removed to prevent misleading sign-in buttons.

The separate **CET154 OBE-CQI prototype** is still under development on `feature/obe-cqi-blueprint-builder`. It is not yet approved/merged and should not be interpreted as operational grading or Google Sheets synchronization. Any eventual account system must use secure authentication, verify students and map scores through immutable student identifiers.

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

Merging the unfinished OBE-CQI blueprint branch as-is is **not** recommended; review its content and resolve merge conflicts before implementing secure student-registration functionality. The branch should remain available for CET154 development independently of this public-site cleanup.
