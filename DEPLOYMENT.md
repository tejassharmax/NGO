# Deploying to Render — https://ngo-4xde.onrender.com

This is the complete list of what changed in the code and, more importantly, **what
you have to do by hand** in three dashboards. Nothing in Part B can be done from the
repository, which is why the app currently loses data and drops its Google connection
on every deploy.

Work through Part B in order. It takes about 15 minutes.

---

## Part A — Code changes (already made, just needs a push)

You don't have to do anything for these except commit and push. Listed so you know
what moved.

| File | Change | Why it mattered on Render |
|---|---|---|
| `js/server/firebaseAdmin.js` | Rewritten for `firebase-admin` v14's modular API (`firebase-admin/app`, `/firestore`, `/auth`) | v14 deleted the `admin.apps` / `admin.credential` namespace. The old code threw on startup, so **Firestore never connected at all** and the server silently fell back to a local file. |
| `js/server/integrationStore.js` | **New.** Stores each NGO's Google OAuth refresh token and created sheet/doc IDs in Firestore at `integrations/{slug}` | These lived only in `data/integrations/*.json`. Render wipes the disk on every deploy, so Google showed "disconnected" after each push, and reconnecting created a **duplicate spreadsheet** because the stored `sheetId` was gone. |
| `js/server/googleOAuth.js` | `getNgoIntegration` / `saveNgoIntegration` / `getClientForNgo` are now async; 14 call sites awaited | Follows from the Firestore-backed store above. |
| `js/server/auth.js` | Local-dev bypass now keys on the **TCP peer address**, not `req.hostname`. Disabled outright when `NODE_ENV=production` or `RENDER` is set. | `req.hostname` comes from the client's `Host` header. A request to the public URL carrying `Host: localhost` skipped authentication entirely and returned the whole child medical database. Verified as a real bypass, now verified closed. |
| `server.js` | `app.set('trust proxy', 1)` | Render terminates TLS at its edge and forwards plain HTTP. Without this, `req.protocol` is `http` and OAuth redirect URIs are built with the wrong scheme. One hop only — trusting the whole chain would let a client forge `X-Forwarded-For`. |
| `server.js` | Cloud Vision OCR now off unless `ENABLE_VISION_OCR=true`, and the SDK is `require`d lazily | It was constructing a client from a key file that doesn't exist on Render, and the eager `require` slowed cold starts. OCR runs on bundled Tesseract. |
| `server.js` | OAuth callback authorization is now the allowlist **only** | It also accepted any Google address merely *containing* `tejas`, `sachin` or `ayusha`, and accepted everyone if the allowlist was empty. Fine on localhost; on a public URL a stranger with a lookalike Gmail could bind their own Google account and receive every synced record. |
| `firestore.rules` | Added an explicit deny for `integrations/**` | A refresh token must never be readable from a browser. This is also why it is *not* stored under `ngos/{slug}`, where your own admins would have had read access. |
| `.env.example` | Rewritten to document every variable below | — |

```bash
git add -A && git commit -m "fix(deploy): make all features work on Render" && git push
```

Pushing triggers the Render deploy. **Do Part B first** — otherwise the deploy comes
up without a database credential and writes to a disk that is about to be erased.

---

## Part B — What you must do

### B1. Render → Environment variables

Dashboard → your service → **Environment** → *Add Environment Variable* for each.

| Key | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The **entire** contents of `serviceAccountKey.json`, on one line. See below. |
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `anirudh-449ca` |
| `AUTHORIZED_EMAILS` | `tejassachin2010@gmail.com,sachinsharma.hr@gmail.com,ayushahome@gmail.com` |
| `ALLOWED_ORIGINS` | `https://ngo-4xde.onrender.com` |
| `DEFAULT_NGO` | `Ayusha Nilayam` |
| `GOOGLE_OAUTH_CLIENT_ID` | from Google Cloud Console (see B3) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from Google Cloud Console (see B3) |
| `ENABLE_VISION_OCR` | `false` |

**`FIREBASE_SERVICE_ACCOUNT` is the one that matters most.** Without it the server
prints `[firestore] Disabled` and falls back to `data/db.json` on Render's ephemeral
disk — meaning **every child record you enter is destroyed by the next deploy**, with
no error shown in the UI. To get the one-line value onto your clipboard:

```bash
node -e "process.stdout.write(JSON.stringify(require('./serviceAccountKey.json')))" | clip
```

Then paste into the Render value box. It will be a single long line starting
`{"type":"service_account","project_id":"anirudh-449ca",...`. Don't add quotes around it
and don't let your editor wrap it.

**Do NOT set these on Render:**
- `GOOGLE_APPLICATION_CREDENTIALS` — points at a file path that doesn't exist there.
- `PORT` — Render assigns it; the code already reads `process.env.PORT`.
- `GOOGLE_OAUTH_REDIRECT_URI` — the server derives the live URI from the request host,
  so a hardcoded localhost value would break the callback.

### B2. Render → Service settings

Same page, **Settings** → *Build & Deploy*:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

The build step is required. `js/bundle.js` is committed, but rebuilding guarantees
the served bundle matches `js/app.js`. `rollup` is in `dependencies`, not
`devDependencies`, so it is present on Render.

Node version: `package.json` declares `>=18.0.0`, which Render honours. No action
unless you've pinned an older version.

### B3. Google Cloud Console → OAuth redirect URI

**This is why Google Sheets sync fails on Render with `redirect_uri_mismatch`.**

1. https://console.cloud.google.com/apis/credentials
2. Select the project that owns your OAuth client, then click the client under
   *OAuth 2.0 Client IDs*.
3. Under **Authorized redirect URIs**, *Add URI*:
   ```
   https://ngo-4xde.onrender.com/auth/google/callback
   ```
   Exactly that — `https`, no trailing slash. Keep the existing
   `http://localhost:3000/auth/google/callback` so local development still works.
4. **Save.** Changes can take a few minutes to propagate.
5. While here, copy the **Client ID** and **Client secret** into the two Render
   variables from B1.
6. Check **OAuth consent screen** → if publishing status is *Testing*, each of the
   three admin emails must be listed under *Test users*, or their sign-in will be
   rejected.

### B4. Firebase Console → Authorized domains

**This is why Google Sign-In fails on Render with `auth/unauthorized-domain`.**

1. https://console.firebase.google.com → project **anirudh-449ca**
2. **Authentication** → **Settings** → **Authorized domains** → *Add domain*
3. Enter `ngo-4xde.onrender.com` (hostname only, no `https://`, no path)

### B5. Firebase Console → Publish Firestore rules

Your database is currently in **open test mode**: anyone on the internet can read
`authorized_users` *and write to it*, which means an attacker can insert their own
email with `active: true` and sign in as an NGO admin. The repo has correct rules but
they have never been published — I can't do this from here (no Firebase CLI in the
project).

1. Firebase Console → **Firestore Database** → **Rules** tab
2. Delete what's there, paste the full contents of [firestore.rules](firestore.rules)
3. **Publish**

Sanity check after publishing: the app must still load children normally. It will —
the browser reads child data through `/api/sync`, which uses the Admin SDK and
bypasses rules entirely. The rules only stop *direct* client access with a stolen API
key.

---

## Part C — Verify the deploy

After the deploy finishes, open the Render **Logs** tab. You should see:

```
[Vision] Disabled. OCR uses the bundled Tesseract engine.
[Server] NGO Platform running on http://localhost:10000
[Server] Image preprocessing: sharp enabled
[Server] Security & rate limiting middleware active
[firestore] Connected to project "anirudh-449ca" via FIREBASE_SERVICE_ACCOUNT env var
[Server] Database: Firestore (per NGO) — connected via FIREBASE_SERVICE_ACCOUNT env var
```

The last line is the one to check. If it instead says
`[Server] Database: data/db.json (fallback)`, preceded by
`[firestore] Disabled: no service-account key for project "anirudh-449ca"`, then B1
didn't take — recheck `FIREBASE_SERVICE_ACCOUNT` for truncation or added quotes.
**Don't enter real data until that line reads `Firestore (per NGO)`**, because the
fallback store is erased by the next deploy.

Then, in the browser at https://ngo-4xde.onrender.com:

1. **Sign in** with Google → succeeds (B4).
2. **Add a child**, then hard-reload → the child is still there (B1).
3. **Settings → Connect Google Workspace** → completes without
   `redirect_uri_mismatch` (B3).
4. **Upload a medical document** → OCR returns text. First upload after a restart
   takes 10–20s extra while `eng.traineddata` downloads.
5. Optional, confirms the auth fix:
   ```bash
   curl -s -H "Host: localhost" https://ngo-4xde.onrender.com/api/sync
   ```
   Must return `{"error":"Authentication required"}`. Before the fix this returned
   the entire database.

---

## Part D — Two decisions for you

### D1. Your Google connection is filed under the wrong NGO

You set Tejas's `ngo` field to `"Alex Agape"` while testing. The existing Google
Workspace connection — including the two spreadsheets already holding records — is
stored under slug `ayusha-nilayam`. So Settings will show **"not connected"** for
you even though a valid token exists.

Three ways out; I deliberately didn't pick one, since the `ngo` change looked like a
test you may want to revert:

- **Revert the field** — in Firestore, set Tejas's `authorized_users.ngo` back to
  `Ayusha Nilayam`. Existing sheets and children reconnect immediately. Simplest.
- **Move the record** — copy Firestore `integrations/ayusha-nilayam` to
  `integrations/alex-agape`. Keeps the tenant split; reuses the same spreadsheets.
- **Reconnect from Settings** — works, but creates **fresh, empty spreadsheets**,
  leaving the old ones orphaned in Drive.

### D2. Rotate the service-account key

The private key in `serviceAccountKey.json` (key id `0db54dfb9da32b5072eeb730196822f036146b5d`)
was pasted into our chat transcript. It grants full admin access to your Firestore
database. Rotate it:

Firebase Console → **Project settings** → **Service accounts** → *Generate new private
key*, update `serviceAccountKey.json` locally and `FIREBASE_SERVICE_ACCOUNT` on
Render, then delete the old key in
[Google Cloud → IAM → Service accounts → Keys](https://console.cloud.google.com/iam-admin/serviceaccounts).

---

## Part E — Free-tier limits worth knowing

These are Render/Firebase platform behaviours, not bugs:

- **Spin-down.** A free instance sleeps after ~15 minutes idle. The next visitor
  waits 30–60s for a cold start. Nothing is lost — the data is in Firestore — but it
  looks like a hang. A paid instance removes this.
- **Tesseract language data.** `eng.traineddata` is gitignored and downloaded at
  runtime, so the first OCR after each restart is slower.
- **Ephemeral disk.** Anything written under `data/` or uploaded to disk is gone on
  the next deploy. Firestore is the only durable store. Uploaded PDFs are parsed in
  memory and pushed to Drive, so they aren't affected.
- **Firestore free quota.** 50,000 reads / 20,000 writes per day. The debounced
  `/api/sync` writes one document tree per save, so normal use is far under this.
