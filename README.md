# Ayusha Health

Health records for children in care. Ayusha Health gives a children's home one
place for every child's checkups, growth, blood tests, vaccinations,
appointments and documents. It keeps the home's own Google Sheets, Drive and
Calendar up to date as staff work.

Live at **[ayushahealth.in](https://ayushahealth.in)**. Built for
[Ayusha Nilayam](https://ayushahealth.in/about) and provided by Empowered
Margins Foundation.

## What it does

- **Child profiles.** Each child gets one profile, with checkups (vitals,
  complaints, prescriptions), growth history (height, weight, BMI), blood tests,
  vaccinations and documents.
- **Reading lab reports.** Upload a blood test report as a PDF or a photo and
  choose *Read the values*. The values fill the form, highlighted for staff to
  check, and nothing is saved until they press Save.
  - The report is read in the browser, using the PDF text layer or Tesseract OCR
    for scans and photos.
  - Values that don't add up or disagree with each other are rejected, and so
    are blurry photos.
  - Any digit the OCR is unsure of is left blank rather than guessed.
- **Google Workspace sync.** Connecting the home's Google account creates these
  workbooks and keeps them current:
  - a master directory with one row per child;
  - a medical-records workbook with one tab per child;
  - a monthly checkup register;
  - a blood test register.

  Rows staff add in the sheet can be pulled back into the app.
- **Documents.** Reports and certificates are filed in Google Drive, in one
  folder per child.
- **Appointments.** Individual and group visits go on a shared calendar, and
  each one can be added to Google Calendar in one click.
- **Reports.** A date-range report and a summary of health status, checkup
  coverage and registrations, ready for inspections.
- **Family spaces.** Families get their own private space, with family wording
  and their own workbooks, separate from the children's home.

## How it is built

```
Browser (vanilla ES modules, bundled by Rollup)
   │  Firebase Authentication (Google sign-in)
   ▼
Express server (server.js)
   ├─ verifies the Firebase ID token and an email allowlist on every API call
   ├─ /api/sync         → Firestore, one document tree per space (ngos/{slug}/…)
   ├─ /api/sheets/*     → Google Sheets  ┐ through the space owner's
   └─ /api/drive/upload → Google Drive   ┘ OAuth connection
```

| Area | Files |
|---|---|
| App shell, routing, screens | `js/app.js`, `js/router.js`, `css/` |
| Data model and sync with the server | `js/storage.js`, `js/apiClient.js`, `js/server/syncMerge.js` |
| Lab report reading | `js/reportReader.js` (PDF and OCR), `js/bloodReportParser.js` (values and checks), `js/reportReading.js` (form prefill) |
| Google integration | `js/server/googleOAuth.js`, `js/server/monthlyRegister.js`, `js/server/bloodTestRegister.js`, `js/googleCalendar.js` |
| Auth and tenancy | `js/server/auth.js`, `js/server/ngoStore.js`, `firestore.rules` |
| Public pages | `public/` (home, about, privacy, terms) |

`js/bundle.js` and `vendor/` (pdf.js, Tesseract and its English model) are
committed, so the production host only needs runtime dependencies.

## Running it locally

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env               # then fill in the values
# place the Firebase service account key at ./serviceAccountKey.json
npm start                          # http://localhost:3000
```

After changing anything in `js/`, rebuild the bundle:

```bash
npm run build
```

## Tests

The lab report parser is covered by fixtures taken from several labs' report
layouts, including scanned and photographed ones:

```bash
npm test
```

## Security

- Every API request carries a Firebase ID token. The server verifies it and
  admits only emails on a server-side allowlist or with an active
  `authorized_users` record in Firestore.
- Firestore rules deny all client writes. Only the server, using the Admin SDK,
  touches data.
- Each space's data and Google connection are kept apart. Only the configured
  owner account can connect the main home's Google Workspace.
- API calls and uploads are rate-limited.
- Secrets (`.env`, service account keys, OAuth client files) never enter the
  repository.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting on a Node.js host (the live site
runs on MilesWeb), including the Google and Firebase console settings.
