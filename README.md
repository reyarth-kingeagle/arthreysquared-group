# ARTHREYSQUARED Group Website

ARTHREYSQUARED Group is a static GitHub Pages website with a public Student Portal and optional Supabase-powered student accounts and protected assessments. Public lessons and resources remain available without an account.

## Files

- `index.html` — main ARTHREYSQUARED Group homepage
- `coursework.html` — student courseworks and instructor portal
- `styles.css` — all colors, layout, typography, and responsive rules
- `script.js` — mobile menu, tabs, course filters, automatic footer year
- `Coursework/` — existing subject pages organized by institution
- `js/` — Supabase browser client and optional account, quiz, results, instructor flows
- `supabase/migrations/` — database schema, policies, and server-side assessment functions
- `SETUP.md` — beginner-friendly Supabase, authentication, instructor, local test, and deployment setup

## Quick start in VS Code

1. Open the folder in Visual Studio Code.
2. Install the **Live Server** extension if you do not already have it.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

## Optional accounts and quizzes

Follow [SETUP.md](./SETUP.md) to create the Supabase project and run the database migration. Put only your project's URL and public publishable key in `js/config.js`. Do not add a service-role/secret key or database password to browser code. Without backend configuration, the public website stays usable and accounts/quizzes are reported as unavailable.

## Important edits

### 1. Company email
Search for:

`hello@arthreysquared.com`

Replace it with your actual company email after you create one.

### 2. Logo and profile image

The existing logo at `assets/logo.png` is already used across the homepage, portal, and subject pages. The supplied `assets/rey-arth-rublico.jpg` is used on the homepage and instructor profile.

### 3. Brand colors
Edit the variables near the top of `styles.css`:

```css
:root {
  --navy: #0b1f3a;
  --blue: #2563eb;
  --teal: #0f766e;
  --gold: #d99a24;
}
```

### 4. Product/reviewer cards
In `index.html`, edit the section with ID:

`review-materials`

Later, each card can link to:
- a product page
- a Google Form
- a checkout page
- a PDF preview
- an online course
- a store page

## Recommended future pages

As ARTHREYSQUARED grows, add:

- `tutorials.html`
- `review-center.html`
- `publishing.html`
- `catalog.html`
- `about.html`
- `contact.html`
- `privacy.html`
- `terms.html`

## Recommended company architecture

ARTHREYSQUARED Group
- ARTHREYSQUARED Learning Hub
- ARTHREYSQUARED Tutorials
- ARTHREYSQUARED Review
- ARTHREYSQUARED Publishing

This keeps the company brand broader than the founder's current teaching assignments.
