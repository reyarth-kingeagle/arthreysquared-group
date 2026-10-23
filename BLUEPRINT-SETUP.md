# OBE-CQI Course Blueprint Builder (first milestone)

Open `course-builder.html` through VS Code Live Server or a local HTTP server.

This is a **local-only draft editor**, not a production admin service. The page is not restricted to instructors. It intentionally contains **no student data, passwords, answer keys, database access, or Google Drive credentials**. Do not use it to store confidential content. Drafts are stored in the current browser's localStorage and can be exported as JSON.

## Features

- Create or edit institution, subject code, title, sections and course-level grading weights.
- Add/remove COs, modules, ILOs and assessments.
- Map each ILO to one or more COs.
- Link assessments to ILOs using allocated points; linked points must equal maximum marks.
- Validate uniqueness, references, weights, thresholds and incomplete mappings.
- Download JSON drafts and spreadsheet-compatible ILO–CO and assessment mapping CSVs.
- Import previously exported version-1 JSON drafts (1 MB maximum).
- CET154 syllabus example: five modules, ILO1–ILO15, QILO1–QILO14, L1–L7, E1–E3, and R1. The ILO15 integrated case study covers CO1, CO2 and CO3.
- CET154 sample uses **65% course passing = 3.0** and **65% individual CO attainment**, as confirmed by the instructor. This does not set a separate class-level CO attainment-rate benchmark. Other course thresholds remain editable, not assumed.

## Workflow

1. Select **Load CET154 example** or **Start blank**.
2. Fill course info and sections; review the four category weights.
3. Define each CO, then modules and associated ILOs.
4. Use the CO checkboxes under each ILO to define mappings.
5. Add an assessment, select its module and category, define maximum marks and distribute those marks to assessed ILOs.
6. Check **Blueprint review** for blocking errors and missing information.
7. Download JSON to retain the complete editable draft, plus CSV mappings if desired.

This milestone **does not** parse uploaded .docx syllabi, generate Google Sheets or Drive folders, register students, grade quizzes, print PDF reports, or replace an existing live assessment system. Those require a separate authenticated backend and approved grading/CO-attainment rules. The developer must also design secure server-side validation and record ownership before connecting to real student records.

Tests: `node --test tests/blueprint.test.mjs`. These are model tests, not end-to-end browser/security tests.
