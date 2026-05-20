# Project Changes Log

This document captures all changes made to `aspire-now` since the last commit (`de73b4a`), covering work done via Codex and via Claude Code (this session).

---

## 1. New Backend: Lead Email Relay Server

A standalone Express backend was added under [server/](server/) so SMTP credentials and recipient addresses no longer live in frontend code.

### New files
- [server/index.js](server/index.js) — Express app, exposes `POST /api/leads` and `GET /api/health`. Hardened with `helmet`, CORS limited to `http://localhost:<port>`, `express-rate-limit` (20 requests / 15 min on `/api/leads`), and 100 kB JSON body cap.
- [server/config.js](server/config.js) — Loads env vars via `dotenv` and exposes a single typed `config` object (port, SMTP, recipients, forward endpoints, stats file path).
- [server/mailer.js](server/mailer.js) — `nodemailer` transporter + HTML/plain-text email templates for new leads.
- [server/validation.js](server/validation.js) — `normalizeLeadPayload` / `validateLeadPayload` — trims input and enforces required fields + email/numeric format.
- [server/statsStore.js](server/statsStore.js) — Persists a monotonically incrementing submission counter to [data/lead-stats.json](data/lead-stats.json).
- [data/lead-stats.json](data/lead-stats.json) — Runtime stats file (`{"totalSubmissions": N}`).

### Behaviour
1. Frontend posts the lead JSON to `/api/leads`.
2. Server normalizes + validates → 400 on invalid input.
3. If SMTP is not configured → 500 with explicit error message.
4. Otherwise: increment counter, send email via SMTP, optionally forward to legacy lead collectors (`LEADS_FORWARD_ENDPOINTS`), respond `200 {ok: true}`.

---

## 2. Environment Configuration

### [.env.example](.env.example) (new)
Template for required env vars: `SERVER_PORT`, `SMTP_HOST/PORT/SECURE/USER/PASS`, `LEADS_EMAIL_TO`, `LEADS_EMAIL_FROM`, `LEADS_FORWARD_ENDPOINTS`.

### [.env](.env) (new, gitignored)
Live secrets — **not committed**. Current configuration:
- SMTP provider: **ZeptoMail** (`smtp.zeptomail.in:587`, user `emailapikey`, API key in `SMTP_PASS`).
- From: `staylivegrow@aspirenow.in`.
- To: `krishnaprasaad@spigroup.in, letspartner@spigroup.in, shibirathna.rg@spigroup.in`.
- Forward endpoints: legacy APIs at `apicuration.aspirenow.in` and `api.thrivingworkplace.in`.

> **Reminder:** Node reads `.env` only at startup. Every edit to `.env` requires a server restart (`Ctrl+C` then `npm run server`).

---

## 3. Frontend: [public/aspire.html](public/aspire.html)

The form submission handler was completely rewritten.

### Old flow (removed)
- Two parallel `fetch` calls hardcoded to `https://apicuration.aspirenow.in/v2/get-leads` and `https://api.thrivingworkplace.in/report/get-lead-data`.
- No success/failure UI feedback.
- `formObject` logged to console.

### New flow
- Single POST to the lead relay:
  - `http://localhost:2575/api/leads` when running on `localhost`.
  - `/api/leads` (same-origin) otherwise.
- Toggles Webflow's built-in `.w-form-done` (green success) and `.w-form-fail` (red error) panels based on response.
- Form is reset on success only.

### EmailJS path (added then removed during this session)
A third `try/catch` posting to `api.emailjs.com/api/v1.0/email/send` was added as a fallback while the backend was being debugged, then removed once ZeptoMail SMTP was confirmed working end-to-end.

---

## 4. Frontend: [src/screens/Aspire.js](src/screens/Aspire.js)

Added a **Download PDF** feature on the Aspire screen.

- New deps: `html2canvas`, `jspdf`.
- Floating blue button (top-right) triggers `convertToPDF()`.
- Captures the embedded `/aspire.html` iframe via `html2canvas` at 2× scale.
- Waits for all `<img>` elements to load (5 s timeout) before capture.
- Generates a single-page PDF if content fits A4, otherwise splits across multiple A4 pages and scales each section to fit.
- File downloads as `aspire-webpage.pdf`.

---

## 5. Dependencies — [package.json](package.json)

### Added (runtime)
| Package | Purpose |
|---|---|
| `express` ^5.2.1 | HTTP server |
| `cors` ^2.8.6 | CORS middleware |
| `helmet` ^8.1.0 | Security headers |
| `express-rate-limit` ^8.5.2 | Rate limit on `/api/leads` |
| `nodemailer` ^8.0.7 | SMTP client |
| `dotenv` ^17.4.2 | Env var loading |
| `html2canvas` ^1.4.1 | DOM-to-canvas for PDF |
| `jspdf` ^4.2.1 | PDF generation |

### Added (dev)
| Package | Purpose |
|---|---|
| `concurrently` ^9.2.1 | Run server + client in one terminal |

### New npm scripts
- `npm run server` → `node server/index.js`
- `npm run dev` → runs server and CRA dev server in parallel

---

## 6. Documentation

### [README.md](README.md) (modified)
Added a **Lead Email Relay (Secure Form Delivery)** section explaining `.env` setup and `npm run dev`.

### [AWS_SSL_TROUBLESHOOTING.md](AWS_SSL_TROUBLESHOOTING.md) (new)
SSL/HTTPS troubleshooting notes for AWS deployment.

### [CHECK_SERVER_SSL_CONFIG.md](CHECK_SERVER_SSL_CONFIG.md) (new)
Steps to verify server SSL configuration.

---

## 7. Session Debugging Notes (Claude Code)

Issues encountered and resolved while wiring the form to ZeptoMail:

1. **EmailJS 400 — *The template ID not found*.** Wrong placeholder ID `template_lj77776`; replaced with real `template_veddn2y` from the EmailJS dashboard.
2. **Lead API 404 on `/api/leads`.** Port 2575 was held by an unrelated `node app.js` process (PID 6440). Killed it and started `npm run server`.
3. **Lead API 500 — *Email transport is not configured*.** Server was started before `.env` was populated. Restart fixed it.
4. **Lead API 500 — *535 Authentication Failed*.** ZeptoMail API key in `.env` was rotated while the server was still running with the old key. Restart fixed it.
5. **Redundant EmailJS path.** Once ZeptoMail SMTP was confirmed working, the EmailJS `fetch` block in `aspire.html` was removed to avoid sending duplicate emails.
6. **Recipients updated.** `LEADS_EMAIL_TO` changed from `imsachinkannan@gmail.com` → three SPI addresses (`krishnaprasaad@`, `letspartner@`, `shibirathna.rg@spigroup.in`).

---

## 8. How to Run Locally

```bash
# one-time
cp .env.example .env        # then fill in real SMTP credentials

# every dev session
npm run dev                 # backend on :2575 + CRA on :5006

# or split across two terminals
npm run server              # terminal 1
npm start                   # terminal 2
```

**Verify the backend is alive:**
```bash
curl http://localhost:2575/api/health      # → {"ok":true}
```

---

## 9. Files Touched — Quick Index

| Path | Status | What |
|---|---|---|
| [server/index.js](server/index.js) | new | Express app + routes |
| [server/config.js](server/config.js) | new | Env config |
| [server/mailer.js](server/mailer.js) | new | Nodemailer transport + templates |
| [server/validation.js](server/validation.js) | new | Input normalization/validation |
| [server/statsStore.js](server/statsStore.js) | new | Submission counter |
| [data/lead-stats.json](data/lead-stats.json) | new | Runtime stats |
| [.env.example](.env.example) | new | Env var template |
| [.env](.env) | new (gitignored) | Live secrets |
| [public/aspire.html](public/aspire.html) | modified | Form submit → `/api/leads` |
| [src/screens/Aspire.js](src/screens/Aspire.js) | modified | PDF download feature |
| [package.json](package.json) | modified | New deps + scripts |
| [README.md](README.md) | modified | Lead relay docs |
| [AWS_SSL_TROUBLESHOOTING.md](AWS_SSL_TROUBLESHOOTING.md) | new | SSL deploy notes |
| [CHECK_SERVER_SSL_CONFIG.md](CHECK_SERVER_SSL_CONFIG.md) | new | SSL config checklist |
