# ARTHREYSQUARED · Instructor Tools

**Current status:** Source implemented in GitHub. The separate private Worker still needs to be deployed/configured in your Cloudflare account. Never submit actual student exam papers until it is deployed, verified and institutionally authorized.

This is a server-verified **username + access code** sign-in. No Cloudflare Access identity provider, Google sign-in, email one-time PIN or student registration is necessary. A GitHub Pages page cannot securely verify a password, so access verification runs in a separate Cloudflare Worker. Credentials are never included in the public website source.

## Public Coursework appearance

The public Coursework instructor section shows only **Instructor Tools** and **Tools for comprehensive classwork**. No tool capabilities, student papers, private rubric details, scores, passwords or account information are displayed there.

Once the Worker has been deployed securely, its actual URL can be linked from that section. Do not guess or publish a fake/undeployed URL.

## What the private app does (instructor-only)

- Select BET 117 Preliminary or Midterm writing sections and item numbers.
- Upload/capture up to five clear photographs of **one student's** written responses.
- Read a visible student name and transcribe only selected essay/written responses.
- Apply private item rubrics; return criterion-level provisional scores and readable explanations.
- Mark missing/unclear answers as unscored and flag names or handwriting requiring confirmation.
- Discard temporary results on reset or after leaving the page.
- No exam photos, results or credentials are stored in GitHub, an app database, or the browser's localStorage.

**Limitations:** The AI provider receives images for processing and may retain data under its own policies; therefore this cannot promise zero retention by all providers. AI may misread handwriting or grade incorrectly. An instructor must check originals and approve actual scores. Do not upload identifiable student papers until institutional privacy approval and the relevant third-party processing arrangements are confirmed.

## Deploy using VS Code on Windows

### 1. Pull the latest website source

```powershell
git status
git pull origin main
cd instructor-tool
```

If the repository has uncommitted local edits, commit or safely stash them first.

### 2. Log in to your Cloudflare account

```powershell
npx wrangler login
```

Cloudflare Worker deployment is separate from GitHub Pages. No Cloudflare Access identity-provider application is required.

### 3. Configure the username and access code as *private Worker secrets*

```powershell
npx wrangler secret put INSTRUCTOR_USERNAME
npx wrangler secret put INSTRUCTOR_ACCESS_CODE
```

At the terminal prompts, enter the exact username and code previously selected. **Do not paste either value into GitHub HTML, JavaScript, this README, VS Code source files, or an .env file committed to GitHub.** The terminal securely sends each value to Cloudflare's secret store.

Generate a strong separate key for signed temporary sessions:

```powershell
$sessionSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
$sessionSecret | npx wrangler secret put SESSION_SECRET
Remove-Variable sessionSecret
```

Sign-in sessions expire after approximately 45 minutes. Logout clears the browser cookie. Sessions are not stored in a database.

### 4. Configure the essay scoring API

```powershell
npx wrangler secret put OPENAI_API_KEY
```

Enter a valid OpenAI API key from your own API project. API billing is separate from a ChatGPT subscription.

For the BET 117 confidential rubrics, first keep the instructor JSON in a directory OUTSIDE the public repository, then run:

```powershell
Get-Content -Raw "C:\Private-Teaching\BET117_PRIVATE_ESSAY_RUBRICS.json" | npx wrangler secret put RUBRICS_JSON
```

The private rubric file must not be pushed to GitHub. Add future course profiles to this private secret, not to a publicly accessible HTML file.

The application defaults to the vision-capable `gpt-6.1-terra` model. If necessary, use `npx wrangler secret put OPENAI_MODEL` to select a different model available to your account.

### 5. Deploy the private Worker

```powershell
npx wrangler deploy
```

Wrangler prints the **real** URL, typically resembling `https://arthreysquared-instructor.YOUR-SUBDOMAIN.workers.dev`. Copy the exact URL it provides.

When you open the URL, you should see a **minimal Instructor Tools login**. Enter your configured username and access code to open the grading workspace.

An incorrect username/code must return a generic access-denied message. No code or confidential rubric should appear in public page source.

### 6. Test protection before student papers

Use a private browser window without a signed session:

- The Worker must show only the two-field login screen.
- Private API routes `GET /api/config` and `POST /api/grade` must deny access before login.
- An incorrect username or code must be rejected.
- Login requests are approximately limited to five per minute per network origin at each Cloudflare location.
- Correct credentials should open the private workspace.
- The Sign out button and the 45-minute session expiry must prevent further grading access.
- Try sample handwritten answers with **invented student names only** until institutional approval and grading validation are complete.

### 7. Connect the secured Worker to the Coursework section

After successful deployment, edit `coursework.html` in VS Code. Beneath the short instructor card text, add a link using the **real URL shown by Wrangler**:

```html
<a class="btn btn-primary"
   href="https://YOUR-REAL-WORKER-URL"
   rel="noopener noreferrer">
  Open Instructor Tools
</a>
```

The public card must stay generic. The credential check takes place on the Worker server even though the login link is visible publicly.

Commit the resulting public card update:

```powershell
git add coursework.html
git commit -m "Link Instructor Tools to private login"
git push origin main
```

## Deployment details

The Cloudflare Worker configuration includes:
- Rate limiting on sign-in attempts and essay analysis requests.
- Secure, HttpOnly, SameSite=Strict, short-lived signed session cookies.
- Exact same-origin checks on login, logout and essay-submission requests.
- No persistent student image store, results database or browser localStorage.
- Disabled Worker observability for request/body logging.
- Fail-closed behavior if the credential/session secrets or protection bindings are not configured.

Rate limiting is approximate and not an absolute brute-force defense. Use sufficiently strong unique credentials; because the requested code has appeared in a conversation, consider rotating it before deploying to production.

## BET 117 essay portion

- Prelim written Items 21–24: 36 points; Items 25–27: 24 points. Essay subtotal: 60 points.
- Midterm written Item 11: 5 points; Items 12–14: 75 points. Written-response subtotal: 80 points.
- Multiple-choice components are excluded.
- Do not publish the private marking rubric or individual scores.

## Future subjects

The same instructor workspace can support CET 111, CET 134, CET 154, ENS 150.2, and others through privately configured rubric profiles. This does not require separate student accounts.

References:
- https://developers.cloudflare.com/workers/wrangler/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- https://developers.openai.com/api/docs/guides/your-data
