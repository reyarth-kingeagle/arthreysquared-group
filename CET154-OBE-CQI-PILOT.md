# CET154 — OBE-CQI setup and master class record (pilot 1)

## What has been completed

The **CET154** sample in `course-builder.html` now represents all five modules and 15 ILOs from the supplied syllabus, not only Module 1.

Assessment codes: **QILO1–QILO14 (14 quizzes), L1–L7 (7 laboratories), E1–E3 (3 examinations), R1 (1 capstone/report)**.

The downloadable master Excel workbook generated in ChatGPT has **11 tabs**:
1. START HERE
2. CET154 Student Dataset
3. Course Settings
4. Modules and ILOs
5. Assessment Blueprint
6. Score Entry
7. CET154 Grading System
8. CO Evidence Entries
9. Student CO Attainment
10. CO Summary Report
11. CQI Action Log

## Syllabus evidence and approval gates

Syllabus revision 2, effective 2026-01-25: **50% exams, 35% labs/performance, 10% capstone/reporting, 5% quizzes**.

The syllabus contains an unresolved inconsistency: evaluation criteria say **70% passing**, while the grading table says **65% = 3.0**. It does **not** establish a definite per-CO attainment threshold. These require institutional review before real grade release.

The total score for an examination or capstone spanning multiple COs must **not** be copied to each CO. Map item scores or rubric criteria to ILO/CO allocated marks, and require complete evidence before formal CO attainment judgments.

No dates, individual marks, student registrations or private answer keys were invented.

## Work locally

1. Open the feature branch in VS Code.
2. Open `course-builder.html` using Live Server.
3. Click **Load CET154 example** to refresh any older one-module draft in local storage.
4. Enter sections and academic term; review the ILO–CO mappings.
5. Set each assessment's approved maximum marks and allocate points across assessed ILOs.
6. Export JSON and the two CSV mappings.
7. Review the downloadable class-record master in a private local/Google Drive copy. Do not share personal data publicly.

## Current phase boundaries

The master is **not yet connected to Google Sheets or the website's students**. Browser-local blueprint edits are not an authenticated instructor workflow. We will next create an approved Google Sheets master in the private MSU-IIT/CET154 folder, then automate section copies through Google Apps Script with proper access checks and score validation.
