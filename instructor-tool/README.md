# ARTHREYSQUARED · Private Instructor Tools

**Status: code prepared; NOT deployed or activated. Do not upload real student papers until authentication, institution authorization and API configuration are verified.**

The instructor application runs on a separate Cloudflare Worker, not GitHub Pages. A hidden GitHub Pages URL, client-only password or JavaScript login does **not** make a page private.

## Features

- One student per session; 1–5 JPEG/PNG/WebP photos, maximum 5 MB each / 20 MB combined.
- Detect the visible student name and transcribe selected handwritten essay answers.
- Ignore all multiple-choice responses.
- Use private item-specific marking rubrics, compute a provisional, criterion-by-criterion subtotal and flag uncertain answers.
- If a response is missing or unreadable, leave it **unscored**, not automatically zero.
- Display results temporarily in the browser only; no database, permanent photos, analytics, class record, or automatic grade submission.
- Expand later to other subjects by updating private rubric profiles.

**Never use suggested scores without reviewing the original paper.** Handwriting recognition and AI grading can be wrong.

## IMPORTANT privacy limitation

The app itself does not store student images, names or results. It sends the images to the configured AI provider for processing. The provider may retain some request data under its own terms. Setting `store: false` does **not** guarantee absolute zero retention; ordinary API abuse-monitoring logs may be retained for up to 30 days without an approved alternative retention arrangement. Obtain appropriate institutional approval and satisfy privacy/third-party processing requirements before processing identifiable student records.

Keep API keys, student data, private rubric JSON and answer keys outside this public GitHub repository.

## Setup with VS Code and Windows PowerShell

### 1. Pull the latest GitHub source

Open your website repository locally in VS Code, then:

```powershell
git status
git pull origin main
cd instructor-tool
```

Commit/stash local changes before pulling if necessary.

### 2. Configure Cloudflare

Obtain Cloudflare Workers and Zero Trust access. Sign in through Wrangler:

```powershell
npx wrangler login
npx wrangler deploy
```

The first deployment is **fail-closed** and returns HTTP 403 until proper Access authentication and secrets are present.

Cloudflare displays the Worker URL (typically `https://arthreysquared-instructor.YOUR-SUBDOMAIN.workers.dev`).

In Cloudflare, enable **Cloudflare Access protection for the Worker**, including `workers.dev` and any other routes; do not protect just a single hostname if alternative routes remain open. In Zero Trust → Access → Applications, set an Allow policy for only **your authorized institutional email**. Do not allow Everyone or a whole email domain.

An unsigned visitor and any other account must be denied. The Worker also checks the authenticated `ctx.access` identity against an instructor email secret.

### 3. Set three private secrets

In the same VS Code terminal:

```powershell
npx wrangler secret put AUTHORIZED_EMAIL
npx wrangler secret put OPENAI_API_KEY
```

Enter your own authorized instructor email (matching the Cloudflare Access policy) and OpenAI API key. **A ChatGPT subscription is not an OpenAI API billing plan.**

Download the separately supplied private `BET117_PRIVATE_ESSAY_RUBRICS.json` file to a folder **outside the public website repository** (example `C:\Private-Teaching\`). Then run:

```powershell
Get-Content -Raw "C:\Private-Teaching\BET117_PRIVATE_ESSAY_RUBRICS.json" | npx wrangler secret put RUBRICS_JSON
npx wrangler deploy
```

Do not commit the JSON file or any secrets. To change the analysis model, optionally set `OPENAI_MODEL` with `npx wrangler secret put OPENAI_MODEL`. The default is `gpt-6.1-terra`.

### 4. Verify protected access before real data

- Signed out/private browsing: Cloudflare Access login or denial.
- Signed in with an unapproved account: denial.
- Signed in as the one authorized instructor: page and private rubric profiles available.
- No exam photo is uploaded without your explicit click.
- Blank/unclear essay content must be unscored, not invented.
- Name is marked uncertain unless clearly read.
- Only selected essay item numbers are evaluated.
- Refresh or Clear removes the temporary results from the browser view.

Use **synthetic sample papers with invented names** first. Compare provisional scores with your independently assigned marks on a sample before regular use.

### 5. Activate an Instructor Tools link on Coursework only after the Worker is secured

The public Coursework instructor tab has a setup-pending notice and **no unconfigured live link**. After the Worker URL is active, replace that notice with a button similar to:

```html
<a class="btn btn-primary"
   href="https://arthreysquared-instructor.YOUR-SUBDOMAIN.workers.dev"
   target="_blank" rel="noopener noreferrer">Open Private Instructor Tools</a>
```

Then commit only `coursework.html`:

```powershell
git add coursework.html
git commit -m "Activate secured Instructor Tools link"
git push origin main
```

**A visible public link is not a security problem only if Cloudflare Access actually denies all unauthorized users and all Worker entrypoints.** Never rely on hiding the link.

## BET 117 profile and scoring

The instructor marking guide specifies these essay/written-response points:

- Preliminary Items 21–24: 4 × 9 = **36** points (CO1).
- Preliminary Items 25–27: 3 × 8 = **24** points (CO2).
- **Preliminary written-response portion: 60/100**, excluding multiple-choice items.
- Midterm Item 11: **5** points (CO2).
- Midterm Items 12–14: 3 × 25 = **75** points (CO3).
- **Midterm written-response portion: 80/100**, excluding multiple-choice items.

The **confidential detailed criteria** live only in the private `RUBRICS_JSON` Worker secret. Exact exam questions, reference answers and student papers are not committed to GitHub.

## Reuse with other subjects

Add additional assessment profiles to the private rubric file using the existing JSON structure: assessment key → item list → item number, maximum marks, instructions, and criteria (each criterion has a label, an integer maximum, and a scoring guide). Re-upload the private `RUBRICS_JSON` secret. The tool does not require student registration.

## Privacy and operational checklist

- Verify institutional permission, privacy notice/lawful basis and third-party processing terms.
- Protect entire Worker through Cloudflare Access; authorize only one account.
- Store `AUTHORIZED_EMAIL`, `OPENAI_API_KEY` and `RUBRICS_JSON` as Worker secrets.
- Do not add analytics, persistent database, request-body logging or cloud file storage.
- Understand AI provider's retention; do not promise that no system ever retains inputs.
- Always review uncertain names, handwriting and scores.
- Never auto-publish grades or put students' personal records in public repositories.

Official references:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/wrangler/
- https://developers.openai.com/api/docs/guides/your-data
- https://privacy.gov.ph/online-learning-guidelines-issued-to-help-protect-student-privacy-and-reduce-data-breaches-in-schools/
