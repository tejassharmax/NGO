# Deploying to MilesWeb (cPanel Node.js hosting)

This takes the app from GitHub to your own domain on a MilesWeb plan with Node.js
apps (the **Business** plan and above). Follow the steps in order. Replace
`your-domain.com` with your real domain everywhere. It takes about 20 minutes, plus
DNS time.

You will upload **two files** from your computer that are not in GitHub (they are
secret):

| File on your computer | Name on the server | What it is |
|---|---|---|
| `D:\anirudh\serviceAccountKey.json` | `serviceAccountKey.json` | Firebase admin key (database access) |
| `D:\anirudh\.env.production` | `.env` | Production settings (Google OAuth client, allowed admin emails) |

---

## 1. Domain and SSL

1. MilesWeb client area → **Domains** → your domain → **Nameservers**: set the two
   nameservers from your hosting welcome email. DNS can take a few hours.
2. cPanel → **Security** → **SSL/TLS Status** → select your domain → **Run AutoSSL**.
   Google sign-in only works over `https://`.

---

## 2. Get the code onto the server

Keep the app **outside `public_html`**, in its own folder `ngo-app` in your home
directory. Inside `public_html` the web server could hand out the secret files
directly.

cPanel → **Files** → **Git™ Version Control** → **Create**:

| Field | Value |
|---|---|
| Clone a Repository | **On** |
| Clone URL | `https://github.com/tejassharmax/NGO.git` |
| Repository Path | `ngo-app` |
| Repository Name | `NGO` |

Click **Create** and wait for the clone to finish. The repository is public, so no
key or password is needed.

---

## 3. Upload the two secret files

cPanel → **File Manager** → open the `ngo-app` folder → **Upload**:

1. Upload `serviceAccountKey.json`.
2. Upload `.env.production`, then right-click it → **Rename** → `.env`.
   (If you can't see files starting with a dot: *Settings* → tick **Show Hidden
   Files**.)
3. Right-click each file → **Change Permissions** → `600`.

---

## 4. Create the Node.js application

cPanel → **Software** → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| Node.js version | **22** or newer (the Firebase library needs 22+) |
| Application mode | **Production** |
| Application root | `ngo-app` |
| Application URL | `your-domain.com` (leave the path box empty) |
| Application startup file | `server.js` |

Click **Create**. Then, on the same page:

1. Click **Run NPM Install** and wait until it finishes.
2. Click **Restart**.

You do not need to add environment variables here. They come from the `.env` file.

> **If your cPanel shows "Application Manager" instead of "Setup Node.js App":**
> Software → Application Manager → **Register Application**. Use application path
> `ngo-app`, your domain, environment **Production** → **Deploy**, then click
> **Ensure Dependencies**. It starts `app.js` automatically, which loads `server.js`.

> **If Node 22 is not in the version list,** tell Claude. The Firebase library can
> be switched to a version that runs on Node 18/20.

---

## 5. Google and Firebase settings (one-time, about 5 minutes)

Without these, sign-in and the Google Sheets connection fail on the new domain.

### 5a. Firebase: allow sign-in from your domain
https://console.firebase.google.com → project **anirudh-449ca** → **Authentication**
→ **Settings** → **Authorized domains** → **Add domain** → `your-domain.com`.
Add `www.your-domain.com` too if you use it. Hostname only, no `https://`.

### 5b. Google Cloud: allow the Sheets connection to return to your domain
https://console.cloud.google.com/apis/credentials → open the **OAuth 2.0 Client ID**
→ **Authorized redirect URIs** → **Add URI**:

```
https://your-domain.com/auth/google/callback
```

Exactly that: `https`, no trailing slash. Add the `www.` version too if you use it.
Keep the existing localhost entry. Click **Save**; it can take a few minutes to apply.

### 5c. Google Cloud: keep the Sheets connection from expiring
Same console → **OAuth consent screen**. If *Publishing status* says **Testing**,
click **Publish app**. In Testing mode Google cuts the Sheets connection every
7 days.

---

## 6. Check it works

1. Open `https://your-domain.com`. The sign-in page loads.
2. **Sign in with Google.** You land on the dashboard ("Good morning, <your name>")
   with your existing children and appointments. It uses the same Firestore
   database as before.
3. **Settings** shows *Connected*, with buttons for the Student Medical Records
   workbook and the **Monthly Checkup Register**. The Google connection is stored in
   Firestore, so it carries over automatically.
4. Security checks. Each must **not** return data:
   - `https://your-domain.com/serviceAccountKey.json` → Not Found
   - `https://your-domain.com/.env` → Not Found
   - `https://your-domain.com/api/sync` (in a private window, not signed in) →
     `{"error":"Authentication required"}`

**Logs:** the Setup Node.js App page shows the log file, usually `ngo-app/stderr.log`
(open it in File Manager). A healthy start ends with:

```
[firestore] Connected to project "anirudh-449ca" via /home/.../ngo-app/serviceAccountKey.json
[Server] Database: Firestore (per NGO) — connected via ...
```

If it says `Database: data/db.json (fallback)`, `serviceAccountKey.json` is missing
from `ngo-app`.

---

## 7. Updating the site later

1. On your computer: make changes. If you changed anything in `js/`, run
   `npm run build` (the built `js/bundle.js` is committed). Then commit and push to
   GitHub.
2. cPanel → **Git Version Control** → **Manage** → **Pull or Deploy** →
   **Update from Remote**.
3. cPanel → **Setup Node.js App** → **Run NPM Install** (only if `package.json`
   changed) → **Restart**.

Your `.env`, `serviceAccountKey.json` and `data/` folder are not in git, so updates
never overwrite them.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "503 Service Unavailable" / blank page | Open `stderr.log`. Usually the Node version is below 22, or **Run NPM Install** was skipped. |
| Sign-in popup: `auth/unauthorized-domain` | Step 5a. |
| Connecting Google: `redirect_uri_mismatch` | Step 5b. The URI must match exactly, including `https` and `www.` if you use it. |
| Settings shows "Authorization Expired" | Step 5c, then **Reconnect Google Sheets Sync** in Settings. |
| "Access Denied" after signing in | The email needs an `authorized_users` document in Firestore with `active: true`. To connect Google in Settings it must also be listed in `AUTHORIZED_EMAILS` in `.env`. |
| Changes don't appear after an update | You skipped **Restart**, or forgot `npm run build` before committing. |
