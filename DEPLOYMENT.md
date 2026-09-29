# Deploying to MilesWeb (cPanel Node.js hosting)

This guide takes the app from GitHub to your own domain on a MilesWeb plan that
includes Node.js apps (the **Business** plan and above). Work through it in order.
Replace `your-domain.com` with your real domain everywhere.

> **Do step 0 first.** It is about data that is already public.

---

## 0. Make the GitHub repository private (urgent)

`github.com/tejassharmax/NGO` is **public**, and two earlier commits contain
`data/db.json` and `data/google_sheets_live_sync.csv`: names, dates of birth, parents,
phone numbers, addresses, ID/Aadhaar numbers and medical conditions of the children.
Those files are no longer tracked, but they are still in the git history.

1. GitHub → the repo → **Settings** → **General** → scroll to **Danger Zone** →
   **Change repository visibility** → **Make private**.
2. Scrub the history so the files are gone for good. The repo has to be rewritten
   and force-pushed, and anyone with a clone must re-clone. Ask Claude to do this for
   you, or follow GitHub's guide "Removing sensitive data from a repository".

---

## 1. What you need before starting

| Item | Where |
|---|---|
| Domain pointed at MilesWeb | MilesWeb client area → Domains → Nameservers set to the ones in your hosting welcome email. DNS can take a few hours. |
| SSL certificate | cPanel → **SSL/TLS Status** → *Run AutoSSL* (free Let's Encrypt). Google sign-in needs `https://`. |
| Node.js 22 or newer | `firebase-admin` v14 refuses to start on older versions. |
| `serviceAccountKey.json` | The Firebase Admin key you already use locally (project `anirudh-449ca`). |
| Google OAuth client ID and secret | From your local `.env` (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`). |

---

## 2. Put the code on the server

Keep the app **outside `public_html`**, for example in `/home/CPANEL_USER/ngo-app`.
Inside `public_html` the web server could hand out the key file and data folder
directly, bypassing the app.

### Option A: Git Version Control (recommended; easy updates)

Because the repo will be private, cPanel needs permission to read it:

1. cPanel → **SSH Access** → *Manage SSH Keys* → **Generate a New Key** (no
   passphrase) → then *View/Download* the **public** key and copy it.
2. GitHub → repo → **Settings** → **Deploy keys** → *Add deploy key* → paste it →
   leave *Allow write access* unticked → Add.
3. cPanel → **Files** → **Git™ Version Control** → **Create**:
   - *Clone a Repository*: on
   - *Clone URL*: `git@github.com:tejassharmax/NGO.git`
   - *Repository Path*: `ngo-app`
   - *Repository Name*: `NGO`
   → **Create**.

If cloning fails with a host-key or permission error, MilesWeb support (24/7 chat) can
confirm SSH-to-GitHub is enabled on your server. Mention the article
"Set Up Access to Private Repositories Using Git".

### Option B: Upload a zip

On your computer, zip the project **without** `node_modules`, `data`, `scratch`,
`brag-output` and `.env`. Then cPanel → **File Manager** → create `ngo-app` in your
home folder (not in `public_html`) → Upload → Extract.

---

## 3. Upload the Firebase key

cPanel → **File Manager** → open `ngo-app` → **Upload** `serviceAccountKey.json`.
Then right-click it → **Change Permissions** → `600`.

The server finds it automatically. It is gitignored and never served to browsers.

---

## 4. Create the Node.js application

cPanel → **Software** → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| Node.js version | **22** (or the newest offered, 22+) |
| Application mode | **Production** |
| Application root | `ngo-app` |
| Application URL | `your-domain.com` (leave the path empty) |
| Application startup file | `server.js` |

Click **Create**. Then, on the same page, add these under **Environment variables**
(*Add Variable* for each), and click **Save**:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `anirudh-449ca` |
| `AUTHORIZED_EMAILS` | `tejassachin2010@gmail.com,sachinsharma.hr@gmail.com,ayushahome@gmail.com` |
| `DEFAULT_NGO` | `Ayusha Nilayam` |
| `ALLOWED_ORIGINS` | `https://your-domain.com,https://www.your-domain.com` |
| `GOOGLE_OAUTH_CLIENT_ID` | your client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | your client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://your-domain.com/auth/google/callback` |

Do **not** set `PORT` (the host assigns it) or `ALLOW_LOCAL_AUTH_BYPASS` (local
development only).

Finally click **Run NPM Install**, wait for it to finish, then **Restart**.

> **If your cPanel shows "Application Manager" instead of "Setup Node.js App":**
> Software → Application Manager → *Register Application*. Use application path
> `ngo-app`, your domain, environment **Production**, and add the same environment
> variables. Then click **Ensure Dependencies**. It starts `app.js` automatically,
> which loads `server.js`.

---

## 5. Google Cloud and Firebase settings (one-time)

### 5a. OAuth redirect URI (Google Sheets connection)
1. https://console.cloud.google.com/apis/credentials → open the OAuth 2.0 Client ID.
2. **Authorized redirect URIs** → *Add URI* →
   `https://your-domain.com/auth/google/callback`
   (exactly that: `https`, no trailing slash). Keep the localhost one.
3. If you will also use `www.`, add `https://www.your-domain.com/auth/google/callback`.
4. **Save**. It can take a few minutes to apply.

### 5b. OAuth consent screen
If *Publishing status* is **Testing**, Google expires the Sheets connection every
7 days and only listed test users can connect. Either add all three admin emails
as test users, or click **Publish app**.

### 5c. Firebase authorized domain (Google sign-in)
https://console.firebase.google.com → project **anirudh-449ca** → **Authentication**
→ **Settings** → **Authorized domains** → *Add domain* → `your-domain.com` (and
`www.your-domain.com`). Hostname only, no `https://`.

### 5d. Firestore rules
Firestore Database → **Rules** → confirm the published rules match
[firestore.rules](firestore.rules). If not, paste them in and **Publish**.

---

## 6. Check it works

1. Open `https://your-domain.com`. The sign-in page loads.
2. Sign in with Google. You land on the dashboard with "Good morning/afternoon, <your name>".
3. **Settings** shows *Connected* (or click **Connect Google Sheets Sync**), plus
   buttons for the Student Medical Records workbook and the **Monthly Checkup
   Register**.
4. Add a test child, reload the page, and the child is still there.
5. Security checks. Each of these must **not** return data:
   - `https://your-domain.com/data/db.json` → 404
   - `https://your-domain.com/serviceAccountKey.json` → 404
   - `https://your-domain.com/api/sync` (not signed in) → `{"error":"Authentication required"}`

**Logs:** Setup Node.js App → your app shows the log location. Usually
`ngo-app/stderr.log`, readable in File Manager. A healthy start prints:

```
[Server] NGO Platform running on http://localhost:<port>
[firestore] Connected to project "anirudh-449ca" via /home/.../ngo-app/serviceAccountKey.json
[Server] Database: Firestore (per NGO) — connected via ...
```

If it says `Database: data/db.json (fallback)`, the key file is missing or in the wrong
folder. **Don't enter real data until it says Firestore.**

---

## 7. Deploying updates later

1. On your computer: make changes, run `npm run build` if you changed anything in
   `js/` (the built `js/bundle.js` is committed), then commit and push to GitHub.
2. cPanel → **Git Version Control** → *Manage* → **Pull or Deploy** →
   **Update from Remote**.
3. cPanel → **Setup Node.js App** → **Run NPM Install** (only if `package.json`
   changed) → **Restart**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "503 / Service Unavailable" or blank page | Check `stderr.log`. Most often the Node version is below 22, or NPM Install wasn't run. |
| Google sign-in: `auth/unauthorized-domain` | Step 5c. |
| Connect Google: `redirect_uri_mismatch` | Step 5a. The URI must match `GOOGLE_OAUTH_REDIRECT_URI` exactly. |
| Settings keeps showing "Authorization Expired" | Step 5b (publish the consent screen), then reconnect. |
| Changes don't show after an update | You skipped **Restart**, or forgot `npm run build` before committing. |

---

## Rotate the Firebase key

The private key in `serviceAccountKey.json` (key id `0db54dfb9da32b5072eeb730196822f036146b5d`)
was pasted into an earlier chat transcript. It grants full admin access to Firestore.
Firebase Console → **Project settings** → **Service accounts** → *Generate new private
key*. Replace the file locally and on the server, then delete the old key in
[Google Cloud → IAM → Service accounts → Keys](https://console.cloud.google.com/iam-admin/serviceaccounts).
