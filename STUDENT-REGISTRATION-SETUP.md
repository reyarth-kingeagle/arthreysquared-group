# Student Enrollment Setup

## Current website behavior

Every subject page now has an **Enroll in this subject** link. It opens `account.html` with that subject selected. The form collects surname, given name, middle name, student ID, email, section, password, and password confirmation. It checks that the two password entries match, and MSU-IIT course enrollment requires an `@g.msuiit.edu.ph` email.

The site is a static GitHub Pages website. The form currently performs browser-side checks only: it does **not** submit or save student information, create an account, or connect to Google Sheets. It clears the password fields after local validation. Do not use real student data until the backend is deployed.

## Google Drive destination

Use the instructor-controlled folder supplied for enrollment data:

<https://drive.google.com/drive/folders/1czVh-IBsB-TqbVhzsMLvxj5iy4DvdHSV?usp=drive_link>

This is a folder link, not a Google Sheet link. Create the enrollment spreadsheet inside that folder and keep it restricted to authorized staff. No sheet has been created or connected by this repository.

## To make enrollment functional

1. Create a Google Sheet inside the folder with columns for student UID, subject, surname, given name, middle name, student ID, email, section, and enrollment timestamp. Do not add a password column.
2. Use Supabase Auth (or another maintained authentication provider) to receive and hash passwords. Never send a password to Google Sheets, client-side JavaScript, Apps Script logs, or GitHub.
3. Add a server-side endpoint (for example, a Supabase Edge Function) that validates the subject and institutional email, authenticates the student, checks duplicate IDs/emails, and appends only the student profile/enrollment metadata to the restricted sheet using a server-held Google service credential.
4. Add email verification, rate limiting, safe error handling, and access controls before enabling real registration. Keep all service credentials out of this repository and browser bundle.
5. Configure the endpoint URL and public auth key in the client, then enable submissions only after testing with dummy records and confirming that password values never reach Sheets or logs.

The provided Drive URL is the data destination. This code change cannot create a live spreadsheet or securely connect Google credentials without access to the Drive account and a deployed backend.
