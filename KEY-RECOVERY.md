# Encryption key: backup and recovery plan

Aadhaar numbers and Ayushman/insurance IDs are stored encrypted (AES-256-GCM).
The server needs one key, `FIELD_ENCRYPTION_KEY`, to read them. This page says
where that key is kept and what to do if it is lost or leaks.

**The key itself is never written in this repository.**

## Where the key is kept

| # | Copy | Who |
|---|------|-----|
| 1 | Server: `public_html/.env.fieldkey` on MilesWeb (blocked from the web) | Hosting |
| 2 | Password manager, entry "Ayusha Health – field encryption key" | Tejas |
| 3 | A second password manager or sealed envelope | Anirudh / the home's admin |
| 4 | Printed copy, or on a USB stick, kept with the home's important papers | Offline |

Keep at least three of these at all times. After any key change, update every copy.

**Independent safety net:** the master directory Google Sheet (Sheet1 of the
home's workbook) holds every full Aadhaar and insurance number, because the
app writes them there on every sync. Even if every key copy is lost, the IDs can
be rebuilt from the Sheet (scenario B). Keep the Google account that owns the
Sheet protected with 2-Step Verification.

## Monthly check (2 minutes)

Confirm the saved copy still works, on a computer with the project and the
Firebase service key:

```bash
node scripts/recover-ids-from-sheet.js --space ayusha-nilayam --key-file <path to saved key file> --csv <any Sheet1.csv>
```

"0 record(s) to restore" means the saved key reads every stored ID.

Take a Firestore backup before every step below:
`node D:/anirudh-backups/tools/fs_backup.js`

## A. The server's key file was deleted, but a copy exists

1. Create `.env.fieldkey` containing `FIELD_ENCRYPTION_KEY=<the key>`.
2. Upload it to `public_html` on MilesWeb.
3. Press **Restart** on the Node.js page (not "Update Node App").

Nothing is lost. Without a valid key the server refuses to start rather than
store IDs unencrypted, so a missing key shows up immediately as the site being down.

## B. Every copy of the key is lost

The stored IDs cannot be decrypted any more, but the Google Sheet still has them.

1. Make a new key:
   `node -e "console.log('FIELD_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))" > new-key.txt`
2. Get the Sheet's data, either way:
   - read it live through the app's Google connection (default), or
   - in Google Sheets, open the master workbook, Sheet1, then **File → Download → CSV**.
3. Dry run (writes nothing; lists what will be restored, masked):
   `node scripts/recover-ids-from-sheet.js --space ayusha-nilayam --key-file new-key.txt [--csv Sheet1.csv]`
4. If the list looks right, run it again with `--apply`. It rebuilds each child's
   Aadhaar and insurance entries from the Sheet, encrypted with the new key, and
   changes no other field. It checks every restored value afterwards.
5. Put the new key in `.env.fieldkey` on the server, press **Restart**, and save
   the new key in every copy listed above.
6. Repeat steps 3–4 for each other space (for example `pandya-family`).

Only IDs that reached the Sheet can be rebuilt. An ID entered in the last few
seconds before the key was lost, when the Sheet had not synced yet, would need
entering again.

## C. The key may have leaked (or a scheduled change)

Re-encrypt everything with a new key while the old one still works:

1. Make a new key file as in B.1.
2. Dry run:
   `node scripts/change-key.js --old-key-file old-key.txt --new-key-file new-key.txt`
3. Run again with `--apply`. It refuses to write anything if a single stored
   value cannot be read with the old key, and verifies every value with the new
   key afterwards.
4. Put the new key in `.env.fieldkey` on the server, press **Restart**, update
   every copy, and destroy the old key's copies.

## Tested

Both tools were tested on the sandbox space (`test-sandbox`) on 6 Nov 2026:
- a key change and back: 13 of 13 values re-encrypted and verified;
- a wrong old key was refused with nothing written;
- a full recovery from the Sheet's CSV with a brand-new key: 7 of 7 children
  restored exactly, insurance entries keeping their ids, insurers and dates.

`npm test` covers the encryption (scripts/test-field-crypto.mjs) and reading
IDs back from the Sheet (scripts/test-key-tools.mjs).
