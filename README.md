# Let's Trade ZM: GitHub + Apps Script + one JSON file

```
Customer / admin browser
        │  (the website: HTML files on GitHub Pages)
        ▼  one POST per action
Google Apps Script web app   ← the backend (apps-script/Code.gs + Crypto.gs)
        │  reads / writes
        ▼
letstrade-data.json          ← your data, a private file in YOUR Google Drive
```

| Part | Where it lives | Public? |
|---|---|---|
| Website (`*.html`, `api.js`, `config.js`) | GitHub repo → GitHub Pages | Yes |
| Backend code | Google Apps Script (a copy is in `apps-script/` for version control) | No |
| Data (clients, accounts, orders) | `letstrade-data.json` in your Google Drive | **No. Never share or commit it** |

The data file is in Drive and not in GitHub because it holds customer logins. Free GitHub Pages needs a public repo, and a data file there would be public.

---

## Step 1: Backend on Apps Script (about 10 minutes)

1. Go to <https://script.google.com> → **New project**. Name it `Let's Trade ZM`.
2. Replace the default `Code.gs` content with the contents of `apps-script/Code.gs`.
3. Add a second file: **+ → Script**, name it `Crypto`, paste `apps-script/Crypto.gs`.
4. Gear icon **Project Settings** → tick **Show "appsscript.json" manifest file in editor**. Go back to the editor, open `appsscript.json`, and replace it with `apps-script/appsscript.json` (sets Zambia time zone and public web-app access).
5. In **Project Settings → Script Properties → Add script property**, add:
   - `ADMIN_USERNAME` = the username you want for the admin portal
   - `ADMIN_PASSWORD` = a strong password (8 or more characters)
6. In the editor choose the function **`setup`** and press **Run**. Google asks for permission to use Drive. Because it's your own script it shows an "unverified app" warning: **Advanced → Go to Let's Trade ZM → Allow**. The log shows the link to your new `letstrade-data.json`.
7. Optional: run **`benchmarkPassword`** and read the log. If one password check takes over about 2,000 ms, lower `PBKDF2_ITERATIONS` in `Crypto.gs`.
8. **Deploy → New deployment** → gear → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then copy the **Web app URL** (it ends in `/exec`).

**Changing the code later:** edit it, then **Deploy → Manage deployments →** pencil **→ Version: New version → Deploy**. The URL stays the same. Saving alone does not update the live site.

## Step 2: Website on GitHub Pages

1. Open `config.js` and paste your web app URL into `API_URL`.
2. Put your two images in `assets/images/` (`image_4.png` background, `image_7.png` logo), as your pages expect.
3. Create a **public** GitHub repo and push this folder:
   ```bash
   git init && git add . && git commit -m "Let's Trade ZM"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
   git push -u origin main
   ```
4. Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
   Your site appears at `https://YOUR-USER.github.io/YOUR-REPO/`.

`.gitignore` already keeps `data/*.json` out of GitHub (only the harmless `data/letstrade-data.sample.json` is committed).

## Step 3: Check it works

1. Open the site → **Sign Up** → pick a service → finish. Your price list should load on the second step.
2. Open `.../admin.html`, log in, and confirm the payment on that client.
3. Log in as the customer; the login you assigned now shows.
4. Open `letstrade-data.json` in Drive and see the new client in it.

If a page says *"Unexpected reply from the server"*, the web app isn't deployed with access **Anyone**, or you saved a code change without creating a **New version**.

---

## How orders work

1. Customer signs up with a phone number and password and picks services. Each service starts **Pending** with an unpaid record, and the customer cannot see any login yet.
2. You receive the Airtel Money payment, then in the admin portal press **Confirm Payment**. The service becomes **Active** for 30 days and the login you assigned becomes visible.
3. **Renew Service** creates a renewal request. Confirming it adds 30 days (from the current expiry if still running, otherwise from today).
4. A service past its expiry shows as **Expired** automatically and hides its login.
5. Prices always come from your catalog in the data file, never from the browser.

## The data file

`letstrade-data.json` looks like this (see `data/letstrade-data.sample.json`):

```json
{
  "counters": { "client": 2, "subscription": 3, "payment": 4, "catalog": 13 },
  "catalog": [ { "id": 1, "category": "Shared", "service": "Spotify", "price": 60, "active": true } ],
  "clients": [
    {
      "id": 1, "name": "Alice Banda", "phone": "0971234567", "email": "alice@gmail.com",
      "passwordHash": "pbkdf2-sha256$...", "status": "Active", "createdAt": "...",
      "subscriptions": [
        {
          "id": 1, "service": "Spotify", "type": "Shared", "price": 60, "status": "Active",
          "signupDate": "2026-11-05", "expirationDate": "2026-12-05",
          "loginDetails": "user@mail.com | PIN 1234", "showCredentials": true,
          "payments": [ { "id": 1, "amount": 60, "kind": "signup", "method": "Airtel Money",
                          "status": "confirmed", "createdAt": "...", "confirmedAt": "..." } ]
        }
      ]
    }
  ]
}
```

- **Accounts** are each client's `subscriptions`. **Order data** is each subscription's `payments`.
- The admin portal is the safest way to make changes. Editing the file by hand also works, and takes effect on the next request.

### Editing it by hand

1. Download `letstrade-data.json` from Drive, edit it in a text editor (VS Code, Notepad).
2. Upload it back as a **new version** of the same file: right-click the file in Drive → **Manage versions → Upload new version**. This keeps the same file ID so the backend keeps working. (If you upload a fresh file instead, the site can't find it.)
3. Run **`checkData`** in the Apps Script editor. It reports duplicate ids, duplicate phone numbers, bad statuses or dates, and clients that can't log in.

Rules:
- It must stay valid JSON (watch the commas). If it breaks, the site shows "temporarily unavailable" and **does not overwrite your file**. Fix it and the site recovers immediately.
- Dates are `YYYY-MM-DD`. Statuses are `Pending`, `Active`, `Expired` (subscriptions) and `pending`, `confirmed` (payments).
- Leave new `id`s to the system, or use a number nobody has used. Ids are never reused.
- You can't type a password into the file. Use **Reset Password** in the admin portal.
- **Edit at a quiet time.** Every order rewrites the whole file, so an order placed between your download and your upload is lost.

### Safety nets
- **Daily backup** (installed by `setup`): a dated copy goes into a Drive folder called `letstrade-backups`, newest 30 kept.
- **Drive version history** on the file itself (right-click → Manage versions).
- If two customers order at the same moment, the backend queues them (lock), so neither is lost.

## Good to know

- **Speed:** every action reads and rewrites the file through Apps Script, so expect a second or two per action (I could not measure this against real Google; the site shows a progress bar at the top meanwhile). Apps Script also pauses briefly after being idle.
- **Size:** a customer with 2 services and 3 payments each takes about 3 KB, so 1,000 customers is about 3 MB. Because the whole file is read on every request, this setup suits up to a few hundred customers. Beyond that, move to a real database; the endpoints would stay the same.
- **Security:**
  - Customer passwords are hashed (PBKDF2-SHA256, 60,000 rounds). That is weaker than bcrypt/argon2, which Apps Script lacks.
  - Subscription logins are stored as plain text in the file, because they must be shown to customers. Keep the Drive file private, never share the file or its folder, and turn on 2-step verification for this Google account.
  - Your admin password is stored in Script Properties, visible only to you. Changing it signs out every admin session. A customer password reset signs that customer out everywhere.
  - Five wrong passwords lock that phone number (or the admin name) for 15 minutes.
  - The web app URL is public (it's in `config.js`), and sign-up has no CAPTCHA, so someone could submit junk orders. They stay `Pending` and you can delete them in the admin portal.
- **Tested here, not on Google:** all the backend code runs in a test emulator of Apps Script on a real file, including parallel orders and a corrupted file, and the website was tested in a real browser against it (`node tests/test_api.js`, `test_crypto.js`, `test_concurrency.js`). I couldn't run it on real Google servers, so Step 3 is your first real check.

## Optional: keep Apps Script code in GitHub too

`apps-script/` already holds the three backend files. To sync them automatically instead of copy-pasting, use Google's `clasp` tool (`npm i -g @google/clasp`, `clasp login`, `clasp clone <scriptId>`, then `clasp push`). `.clasp.json` is git-ignored.

## Files

```
index.html, signup.html, login.html, customer_dashboard.html, admin.html, admin_dashboard.html
config.js        paste your web app URL here
api.js           sends requests to the backend
apps-script/     Code.gs, Crypto.gs, appsscript.json   (the backend)
data/            letstrade-data.sample.json            (template only, no customers)
tests/           emulator + test suites (run with node)
```
