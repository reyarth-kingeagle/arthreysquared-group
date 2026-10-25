# CET154 — Connect Student Enrollment to the Private Google Sheet

This directory contains the complete **Google Apps Script backend and hosted student registration form** for **CET154 — Student Registry**. No Supabase or outside authentication provider is required for basic roster-based registration.

## Current deployment status

The Google Sheet has been inspected and **not modified**. The website integration includes a **disabled** link until the instructor completes the required owner-side Google Apps Script web-app deployment and supplies its actual `/exec` URL. GitHub Pages cannot securely write to a private Google Sheet by itself.

You must deploy this as the **Sheet owner**, because the connection requires granting Google's spreadsheet-edit authorization. ChatGPT cannot impersonate you or grant that permission.

## Prerequisites

- Open your existing private Google Sheet named `CET154 — Student Registry`.
- The section tabs have **exact** columns A:G in this order:
  `Student ID Number | Verified Email | Family Name | Given Name | Middle Name | Section | Passcode`.
- The last five fields A, B, E, F, G are initially blank for each student authorized to register; C and D contain instructor-provided Family Name and Given Name.
- The sheet remains **owner-only**; do **not** add students as spreadsheet editors.
- These are the current tabs: `H1W23` and `H1M23`. New future-year tabs with the same headers will be discovered automatically, except names prefixed with `ARCHIVE_`.

## Instructor setup in Google (one-time)

1. Open the private **CET154 — Student Registry** directly in Google Sheets, signed in as its owner.
2. Use **Extensions → Apps Script**; this makes a script bound to *this* spreadsheet.
3. In the Apps Script editor, replace the default `Code.gs` with the entire contents of `apps-script/cet154-registration/Code.gs` from this repository.
4. On the left, click **+ → HTML**, name the file exactly **Index**, and paste the contents of `apps-script/cet154-registration/Index.html`.
5. Save both files and run **setupOnce** *from the Apps Script editor* as the owner. Review the authorization prompt and grant spreadsheet access **only if the selected Google account and script are yours**.
6. Confirm the editor execution log displays the section names; it should not include student names. The setup stores the *current bound sheet's ID* and an independent HMAC secret in private Script Properties.
7. Click **Deploy → New deployment → Web app**. Choose **Execute as: Me** and an appropriate **Who has access** setting that allows the students who must register. If set to **Anyone**, remember that anyone can *try* names; name-based eligibility does not prove identity.
8. Copy the **Web app URL ending in `/exec`** from the deployment dialog.
9. In your VS Code project, open `js/cet154-registration-config.js`, insert **only that actual web-app URL**, e.g. `export const CET154_REGISTRATION_WEB_APP_URL = 'https://script.google.com/macros/s/DEPLOYMENT-ID/exec';` (replace DEPLOYMENT-ID with Google's actual URL).
10. Test first using an instructor-authorized, eligible **test row** in a designated active private roster tab, then review the A:G values. Never perform the first end-to-end test by taking over a real student's unused name.
11. After tests, merge the GitHub PR/commit your configuration to `main`; GitHub Pages will publish the change. For later Apps Script edits, select a new deployment version as Google requires.

**Keep the deployment script editable only by the instructor.** Do not put the HMAC secret, private roster contents, full student list, or account credentials in GitHub files.

## Registration behavior

| Live Sheet state in chosen section | Result |
| --- | --- |
| Exactly one matching Family Name + Given Name; columns A, B, E, F, G are **all blank** | Saves Student ID to A, institutional email to B, complete Middle Name to E, section tab name to F, salted server-keyed passcode hash to G in **that same row** |
| Matching name; all five registration fields are populated | **Already registered**; no write |
| No name match, wrong section, duplicate full names, or partial existing data | **Contact instructor**; no write |
| Duplicate Student ID or email already used in another active roster tab | **Contact instructor**; no write |
| Invalid institutional email, missing fields, mismatched passcodes or too many attempts | Reject; no write |

This is **automatic roster matching, NOT verified email ownership**. An unauthorized person who knows an unused student's name and section could claim the student's record before them. If you need actual identity verification or Google Forms exam access control, add an instructor approval or school-account sign-in step before releasing restricted links. The Sheet's header `Verified Email` is inherited from the original file; the present process verifies the domain **format only**, not ownership.

## Passcode safety

The student chooses a **new, non-reused passcode of at least 8 characters**. Column G retains the existing header `Passcode`, but stores `hmac256$v1$<random salt>$<digest>`, **never the readable passcode**. The server's independent HMAC secret is stored in Apps Script Script Properties and is not accessible to students through the web page. This salted keyed hash is adequate only as a **limited-purpose access token representation** with high-entropy passcodes; it is *not* an Argon2id/scrypt password hash for general account login. **Eight characters is a minimum, not a recommended target.** Prefer a longer, randomly generated passcode that is hard to guess. Do not reuse Google or social-media passwords. A future account login system requires a proper slow password KDF, secure session controls, recovery and improved identity proofing.

## Integrity and privacy safeguards

- Only the Google-hosted `Index.html` invokes `google.script.run`; no public JavaScript has the authority to edit the Google Sheet.
- All server helpers have names ending in `_`; Apps Script prevents clients from invoking these private helpers.
- `LockService.getScriptLock()` protects the match/check/write sequence, stopping concurrent duplicate submissions.
- All data in a matched row is updated **in place**, preserving the Family Name and Given Name (including any original formula cells).
- `Student ID Number` and email collision checks avoid two active accounts claiming one identity; there are no appends and no re-sorting of grades.
- Simple per-roster-name attempt throttling limits casual enumeration. It cannot stop every distributed abusive request; monitor deployment quotas and access.
- Students receive no private roster names, email lists or direct spreadsheet links.
- There is no quiz or Google Forms integration in this phase.

## Test locally before deploying

With Node.js installed, in VS Code terminal:

```powershell
node --test tests/cet154-registration.test.mjs
.\tests\check-site.ps1
```

The first command uses fictional names and a simulated Sheet to test name matching, duplicate registration, partial records, validation, and passcode protection. These tests do not prove that the Apps Script deployment has been authorized or configured; **live deployment requires the instructor setup above**.


## Updating an existing Apps Script deployment for the 8-character minimum

Both `Code.gs` (server-side validation) and `Index.html` (the form's `minlength` and placeholder) changed from a 16-character minimum to **8 characters**. **Publishing to GitHub does not update Apps Script automatically.**

1. From the private student registry, select **Extensions → Apps Script**.
2. Replace the contents of **both** `Code.gs` and the `Index` HTML file using the newly published GitHub versions.
3. Save the Apps Script project.
4. If not previously deployed, follow the initial deployment steps above. If already deployed, select **Deploy → Manage deployments**, edit the existing web app deployment, select **Version → New version**, and deploy. This preserves the existing deployment URL.
5. Check that a 7-character passcode is rejected and an exactly 8-character passcode satisfies length validation, using fictional data for UI checks. For a full test submission, use only an instructor-authorized test row; never use a real student's unclaimed row.
6. Back in VS Code, run `git fetch origin`, `git switch main` and `git pull --ff-only origin main` after the GitHub update. The deployment URL configuration needs changing only if its URL changes.

## Do not enable until ready

Leave `js/cet154-registration-config.js` empty until the web app has been deployed and tested successfully. Until then the public CET154 enrollment design stays in **preview mode** and continues to collect **no actual student data**.
