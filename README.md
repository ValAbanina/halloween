# Halloween Costume & Film Night — registration page

Wed 28 October 2026, 6:00–9:00 PM, Room A130, Langara.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The page (hero, announcements, agenda, costume categories, register form, footer) |
| `styles.css` | Look and animation. Desktop, tablet and phone layouts |
| `app.js` | Sound, animation triggers, guests, form checks, talks to the Google Sheet |
| `config.js` | **The only file you edit**: paste the Apps Script URL here |
| `assets/` | Logos, fonts (Roboto Condensed) and the 5 sounds |

## Preview mode

While `SCRIPT_URL` in `config.js` is empty, the page shows a yellow bar
"Preview mode: sign-ups on this page are not saved yet". Everything works,
but nothing is saved. You can preview the other form states:

- `index.html?demo=full` — registration is full
- `index.html?demo=closed` — registration has ended
- `index.html?demo=few` — only 2 seats left (try adding guests)

## Connect the Google Sheet (about 10 minutes)

1. Sign in to Google as **valabanina@gmail.com**.
2. Create a new Google Sheet, name it "Halloween 2026 Registrations".
3. In the Sheet: **Extensions → Apps Script**. Delete the sample code and paste all of `Code.gs`. Save.
4. In the toolbar choose the function **setup** and click **Run**. Google asks for permission: click through and allow. The sheet now has a "Registrations" tab with headers.
5. Click **Deploy → New deployment → Select type: Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
6. Open `config.js` and paste it between the quotes: `SCRIPT_URL: 'https://script.google.com/macros/s/.../exec'`.
7. Open the page, register yourself as a test, check the row appears in the Sheet, then delete that test row.

If you change `Code.gs` later: **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

## Put it online (GitHub Pages)

1. Create a public repository (for example `halloween`) under your GitHub account.
2. Upload everything in this folder (keep the `assets` folder structure).
3. **Settings → Pages → Branch: main, folder: / (root) → Save**.
4. After a minute the page is at `https://<your-github-name>.github.io/halloween/`.
5. Make the QR code from that link.

## Good to know

- Sound is **on** by default. Browsers block music until the visitor taps, clicks or presses a key, so the music starts on their first tap or click anywhere on the page. If a visitor turns sound off, their browser remembers it.
- People who set "reduce motion" on their device get the page without animation.
- No API keys are in this page. The ElevenLabs key was only used to make the sound files.
- Seat limit (200), closing time (6:00 PM on the day) and the program list are set at the top of `Code.gs`.
