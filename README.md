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
