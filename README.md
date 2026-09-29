# Child Health Management Platform

An NGO child health management workspace: a vanilla ES-module frontend served by a Node.js/Express backend, with Firebase sign-in, Firestore storage, and Google Sheets, Drive and Calendar sync.

Run `npm install` (which also builds `js/bundle.js`) and then `npm start`, and open http://localhost:3000. See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting.

## Key Modules

- **Dashboard** — Children count, records and the appointment calendar at a glance
- **Children Registry** — Register, search, reorder and manage child profiles
- **Clinical Checkups & Blood Tests** — Vitals, complaints, prescriptions and CBC reports per child
- **Growth Tracking** — Height, weight and BMI history
- **Appointments** — Calendar booking (including vaccinations with a free-text vaccine name), synced to Google Calendar
- **Documents** — Upload medical reports, certificates and ID documents to Google Drive, organised by child
- **Reports** — Health status, checkup coverage, registration trend and gender distribution

## Google Sheets

Connecting Google Workspace in Settings creates and keeps three spreadsheets in sync:

- **Child Health Records** — the master directory, one row per child
- **Student Medical Records** — one tab per child with checkups and blood tests
- **Monthly Checkup Register** — one tab per month listing every child's visits (name, checkup type, prescription, notes, date)
