# Sched — Classroom Visual Schedule

A visual schedule board for the classroom, hosted on GitHub Pages. It shows the full day as symbol cards, plus a draggable **Now / Next** timer that counts down each activity and chimes at transitions.

## Everyday use
- **Now / Next box** — drag it anywhere (works with mouse or touch). Drag the corner handle to resize.
- **Details** — activities with mini-schedule steps open their steps automatically when they start.
- **Sound** — browsers block audio until someone taps the page. If you see "Tap to turn on sound", tap it once in the morning.
- **Weekends** — the board stays quiet on Saturday and Sunday unless *Settings → Run on weekends* is on.

## Settings
- **Edit Schedule** — drag cards to reorder, change times, names, symbols, and mini-schedule steps.
- **Day ends at** — when the last activity (Bus) ends. Defaults to 2:20.
- **Substitute** — shows a "Subs click here" button and makes the Now icon open directions for that activity. The time ranges in the sub directions come from the live schedule, so they update when you edit it.
- **Export / Import Schedule** — saves your edited schedule to a file and restores it. Your schedule is stored only in this browser, so export a backup after big changes or before switching computers.
- **Reset Schedule** (in Edit mode) — returns to the built-in default schedule.

## Bathroom timers
A small box on the board counts down each student's next bathroom trip (120 minutes by default). Green means time remains, yellow means 15 minutes or less, and red means the trip is overdue. Each student's timer starts at their first logged trip of the day (a scan on arrival counts, even before the first activity). Until then it shows "No trip yet." Timers hide outside school hours.

Tap a student's timer to see their QR code or tap **Reset now**. To reset by scanning with a phone, connect a Google Sheet once:

1. In Sched, open **Settings → Set up bathroom timers**, add each student's initials, and tap **Copy** next to the secret code.
2. Create a new Google Sheet. Go to **Extensions → Apps Script**, delete the sample code, and paste in everything from `apps-script/Code.gs`.
3. Replace `PASTE_SECRET_CODE_HERE` with the secret code you copied, then save.
4. Click **Deploy → New deployment**, choose **Web app**, set **Execute as: Me** and **Who has access: Anyone**, then **Deploy**. Approve the permissions Google asks for.
5. Copy the **Web app URL** (it ends in `/exec`) and paste it into **Web app link** in Sched. The status should say **Connected**.
6. Tap **Print QR codes**.

### Phone buttons (instead of QR codes)
In **Set up bathroom timers**, tap **Set up a phone** and scan that one code with the phone's camera (or tap **Copy link to text it** and text the link to the phone). The page lists each student with their countdown and a **Done** button. Tap **Done**, choose what happened (Sat, Dry Pull-Up, Changed Pull-Up, Accident; Voided and BM each as Toilet, Pull-Up, or Both; stool type LS1/LS2 if BM; prompt level I/VM/V/G/P), then **Save**. Choosing Pull-Up or Both also selects Changed Pull-Up (tap it to undo). "N – Did not go" is filled in automatically when Sat is chosen without voiding or a BM in the toilet. Each save adds a row to the **Toileting Log** tab of the Sheet. Add the page to the phone's home screen so it opens like an app:
- **iPhone (Safari):** Share button → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Add to Home screen**

If you add or remove students, set up the phone again and replace the home-screen icon.

Every phone save, QR scan, or board reset adds a row to the **Toileting Log** tab of the Sheet (scans and board resets log just the time). If you edit the Apps Script later, use **Deploy → Manage deployments → Edit → New version** so the link (and your printed QR codes) keep working.

Use initials only, never full names. If your district account doesn't allow **Anyone** access for Apps Script, QR resets can't reach the Sheet; the timers still work with **Reset now** on the board.

## Files
- `index.html`, `styles.css`, `app.js` — the app
- `bathroom.js`, `scan.html`, `remote.html`, `qrcode.js` — bathroom timers, the QR scan page, the phone button page, and the QR code library (MIT license)
- `apps-script/Code.gs` — the Google Sheet script for bathroom timers
- `transition-chime.mp3` — transition sound
- `*.png`, `*.jpg`, `*.mp4` — local symbols, images, and step videos
