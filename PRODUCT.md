# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Care-home staff and admins** (first: Ayusha Nilayam, owner A Raj). They keep each child's health history, prepare reports for inspections, and work in the browser on laptops and phones.
- **Families** in their own family spaces (first: the Pandya Family), tracking their members' records.
- **From 1 Jan 2027: Empowered Margins employees** as alpha users, invited to start their own records around New Year health resolutions.
- **The client, Anirudh Pandya**, who reviews progress in demos and sets the product backlog.

## Product Purpose

Ayusha Health replaces scattered paper registers and repeated spreadsheet updates with one place where a home keeps every child's checkups, growth, blood tests, vaccinations, insurance, appointments and documents. Staff enter information once; the home's own Google Sheets, Drive and Calendar stay up to date as its reporting layer. Success means less manual recordkeeping, medical history that is easy to find, and reports ready for inspections with little effort.

## Positioning

Records are organised around individual children and entered once, while the home keeps ownership of its data in its own Google Workspace (no downloaded Excel copies, no lock-in). Lab reports can be read straight into the record, with values checked rather than guessed. Ask Ayusha answers questions only from the sources the user ticks, the space's own workbooks and calendar.

## Operating Context

- Staff sign in with Google; the server checks authorisation and loads only that home's records.
- Workbooks the app writes and keeps current: a master directory, medical records (one tab per child), a monthly checkup register with a date-range report, and blood test reports. Documents are filed in Google Drive, one folder per child.
- Reports are used for government inspections and audits (Mission Vatsalya guidelines are a stated target).
- Built for Ayusha Nilayam, provided by Empowered Margins Foundation; client Anirudh Pandya keeps a "Product Backlog – Ayusha Health" with three epics: home compliance, family health tracking, and core platform and sync.

## Capabilities and Constraints

- Web app for laptop and phone browsers (vanilla JS, Express, Firestore, Firebase Auth, Google Sheets/Drive APIs; hosted on MilesWeb).
- Each space's data and Google connection are isolated; Firestore is the main store, Google Sheets the accessible layer.
- Aadhaar and insurance IDs are encrypted and shown masked, with an audited 30-second reveal.
- Ask Ayusha (prototype, sandbox only): answers only from ticked sources, cannot change records, gives no medical advice, and never sees ID numbers, phone numbers, emails or addresses. It will not go on ayushahealth.in until it is perfected. A live version would move from the free Gemini key to Vertex AI.
- Undecided: LOINC codes for lab tests (study only), an agent for low-priority backlog items (long term).

## Brand Commitments

None confirmed as binding. The name "Ayusha Health", the heart-pulse mark and the "Provided by Empowered Margins Foundation" credit are in use today but open to change.

## Evidence on Hand

- Live product at ayushahealth.in with Ayusha Nilayam's records (22 children); demo children in the Test Sandbox space.
- Lab report reading tested on 10 lab layouts (92/92 PDF values right) and 100 photos (0 wrong numbers): `docs/presentation-prep.md`.
- Presentation material and launch videos: `docs/presentation-prep.md`, `brag-output-2026-10-22/`.
- No testimonials, customer quotes or usage statistics exist; do not invent them.

## Product Principles

1. Enter once: no feature should make staff type the same fact twice.
2. The child is the unit: everything is reachable from, and organised around, one child's record.
3. The home owns its data: its Google Workspace stays the readable, portable copy.
4. Checked, never guessed: values read, computed or answered by the app are verifiable and say where they came from.
5. Built for real staff work: every feature must improve recordkeeping, access, reporting, reliability or usability.

## Voice

Plain and practical by default, like a capable colleague; clinically precise wherever values, units and dates appear; warm where it concerns the children themselves. No hype, no jokes in errors.
