# Accounts and quizzes: local setup

The public site continues to run on GitHub Pages. Supabase adds optional email/password accounts and a PostgreSQL-backed assessment service. The browser never decides access permissions or scores. With no configuration, public coursework stays usable and account/quiz pages show an honest unavailable message.

## 1. Create a Supabase project

Create a project in Supabase. This repository does not create or pay for one. In **Project Settings → API Keys**, copy the Project URL and the **publishable** key (`sb_publishable_…`; a legacy `anon` key is accepted).

Enter only those public values in [js/config.js](./js/config.js):

```js
export const config = Object.freeze({
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  publishableKey: "sb_publishable_REPLACE_WITH_YOUR_PUBLIC_KEY"
});
```

Never put a `sb_secret_…` or service-role key, database password, or SMTP password in browser code or Git. This app needs no privileged browser key. If an SMTP provider requires a password, enter it only in the Supabase Dashboard's SMTP settings.

## 2. Create the database

In the Supabase Dashboard, open **SQL Editor → New query**, paste the complete migration [supabase/migrations/202610230001_accounts_and_assessments.sql](./supabase/migrations/202610230001_accounts_and_assessments.sql), and run it once. It creates subject records for the existing pages under [Coursework/](./Coursework), profiles and roles, pending/approved enrollments, public assessment metadata/questions, private answer keys, attempts, submitted answers, results, RLS policies and RPC functions. It does not invent or seed lesson content, assessment questions or results.

## 3. Configure authentication email links

In **Authentication → URL Configuration** set:

- Site URL to `http://127.0.0.1:8765` for local testing. Change it to `https://www.arthreysquared.com` for production.
- Additional Redirect URLs to `https://www.arthreysquared.com/account.html\?mode=callback*`, `https://www.arthreysquared.com/account.html\?mode=reset*`, `http://127.0.0.1:8765/account.html\?mode=callback*`, and `http://127.0.0.1:8765/account.html\?mode=reset*`. Supabase uses wildcard patterns to allow the encoded internal return query while restricting redirects to the account page and mode. The backslash makes the question mark literal in the allow-list pattern.

The site sends confirmation and recovery links to the account page. Keep the Supabase email template's `{{ .ConfirmationURL }}` link intact. PKCE confirmation needs to finish in the same browser/origin where account creation began.

Email/password confirmation uses Supabase Auth. Public signup requires a verified custom SMTP sender at **Authentication → SMTP Settings**. Supabase's built-in email sender is testing-only: messages go only to project team addresses, currently up to two per hour. Put SMTP credentials in Supabase settings only.

Official setup references: [API keys](https://supabase.com/docs/guides/api/api-keys), [password authentication](https://supabase.com/docs/guides/auth/passwords), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE sessions](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. Test locally

Serve this folder with VS Code Live Server (right-click `index.html`, choose **Open with Live Server**) or run `python -m http.server 8765 --bind 127.0.0.1` and open `http://127.0.0.1:8765/`. Register at `account.html?mode=signup`, confirm your email, then verify that browsing [coursework.html](./coursework.html) and the subject pages still works signed out.

Run static links and fallback checks in PowerShell 5.1 or newer with `.\tests\check-site.ps1`. If Node.js is installed, also run `node --test tests/safe-return.test.mjs` for internal return-URL cases.

The migration includes rollback-only authorization/scoring fixtures in [supabase/tests/security.sql](./supabase/tests/security.sql). After applying the migration to a disposable local Supabase database, run `psql -v ON_ERROR_STOP=1 -f supabase/tests/security.sql`. These database tests require PostgreSQL and were not run without a configured backend.

The supplied profile photo is used on the homepage and instructor profile at [assets/rey-arth-rublico.jpg](./assets/rey-arth-rublico.jpg).

## 5. Authorize the first instructor

Register the instructor through the site and verify the email. In **Authentication → Users**, copy that confirmed user's UUID. Then run this in the Supabase SQL Editor, replacing the example UUID:

```sql
update public.profiles
set role = 'instructor'
where id = 'PASTE-CONFIRMED-AUTH-USER-UUID-HERE'
  and exists (
    select 1 from auth.users u
    where u.id = profiles.id and u.email_confirmed_at is not null
  );
```

Check that one row changed. New accounts always start as students, and authenticated users can update only their profile name. Keep Dashboard access limited to the site owner. Instructors and admins are trusted globally across the current subjects.

Sign in as an instructor and open `instructor.html` to approve/deny enrollment requests, review submissions, or create an assessment. A practice quiz requires a verified account. A class test requires instructor-approved enrollment. The migration keeps answer keys and scoring in the private schema; only permitted question text/options are sent to a started attempt.

A null `results_release_at` withholds scores, correct answers, and explanations indefinitely. A past timestamp releases them after submission; a future timestamp releases them at that time. The effective deadline is the earlier of `closes_at` and the attempt start plus `time_limit_minutes`; submissions at or after that deadline are rejected.

## 6. Add subjects and assessments

Stable subject identifiers map to the existing pages under [Coursework/](./Coursework); portal cards link to those exact files. For another subject, add a unique stable ID, code, title, existing page path and institution to `public.subjects`, then add the matching portal card. Do not rename IDs after attempts exist.

Create assessments using the instructor page. Select practice or class access, set optional availability, attempt count and time limit, enter question JSON and leave the assessment unpublished until reviewed. Do not put answer keys in public lesson files. Results and explanations are withheld unless a release time is configured.

## 7. Deploy

Commit the files and migration, then deploy through the existing GitHub Pages workflow. The repository's CNAME is `www.arthreysquared.com`. Change Supabase's Site URL to `https://www.arthreysquared.com` before testing the production email flow. Nothing is pushed or deployed by this implementation.

## Verification limits

Static route and accessibility fallbacks can be checked locally. Live email delivery, Supabase RLS, class enrollment, role grants, concurrent submissions and scoring require a configured Supabase project and database. The workspace has no configured credentials or local database, so those backend integrations must be tested after setup.
