# SOC Analyst Boot Camp — Training Hub

A localhost training platform for a 12-week SOC analyst programme: theory, hands-on labs, open-ended quizzes with model answers, and real-world SOC problems, with progress tracking, streaks, a study calendar and notes.

## Run

```bash
cd soc_learn
npm install
npm start          # → http://127.0.0.1:3000
```

Node 20, 22 or 24 required (Windows, macOS and Linux install a prebuilt database driver; no Visual Studio needed). Data lives in `data/bootcamp.db` (SQLite, created on first run). The session secret is generated into `data/.secret`. Both are git-ignored.

Environment options (put them in a `.env`-style shell export; `.env*` files are git-ignored):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface to bind. `0.0.0.0` exposes it on your LAN — see the warning below |
| `ALLOWED_HOSTS` | — | Extra `host:port` values allowed in the Host header, comma-separated (e.g. `192.168.1.20:3000`). Requests for any other host get 421 |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS so the session cookie is never sent over plain HTTP |
| `TRUST_PROXY` | — | Set when running behind a reverse proxy so client IPs are correct for rate limiting. `1` trusts a proxy on this machine (loopback) only; for a proxy on another host give its address or CIDR (e.g. `10.0.0.5`). `X-Forwarded-For` from any other sender is ignored |
| `DB_PATH` | `data/bootcamp.db` | SQLite file location |
| `SESSION_SECRET` | auto-generated | Override the generated session secret |

> **Using it from a tablet or another machine?** Plain `HOST=0.0.0.0` sends your password and session cookie unencrypted over Wi-Fi. Put it behind HTTPS instead — e.g. `tailscale serve 3000` or Caddy with `reverse_proxy 127.0.0.1:3000` — and run with `TRUST_PROXY=1 COOKIE_SECURE=true ALLOWED_HOSTS=<your-hostname>`.

## What's inside

| Each week | |
|---|---|
| **Concepts** | Theory topics with tables, commands and queries, plus "From the SOC floor" real-world field notes |
| **Lab** | Step-by-step checklist (checking every step completes the lab) + tips / reference solutions |
| **Quiz** | 10 open-ended questions (20 interview questions in Week 12). Answer → compare with model answer + explanation → self-grade (keyword check suggests a grade) |
| **SOC Problem** | Scenario, tasks and deliverable; write your response in the notes box, then open the model analyst approach |

Also: per-section timer, auto-saving notes, dashboard (overall %, streak, hours vs weekly goal, course map, 14-week heatmap, quiz scores, activity feed, "continue where I left off"), calendar with daily study log and mood, resources and an Event ID cheat sheet, profile, JSON export and reset.

## Editing course content

Each week is plain Markdown in `data/weeks/weekNN.md`, structured with `@@` directives (`@@topic`, `@@step`, `@@q`, `@@answer`, `@@why`, `@@keywords`, `@@task`, `@@approach`…). See the header of `data/course-content.js` for the full list. Restart the server after editing. The loader validates every week on startup.

## Security notes

- Binds to loopback by default; Host-header allowlist blocks DNS-rebinding attacks.
- Default-deny auth: every `/api` route needs a session except login, register and logout.
- bcrypt password hashes (8 characters to 72 bytes), constant-time login (no username enumeration via timing).
- SQLite-backed sessions: httpOnly, SameSite=Strict, optional `secure`; regenerated on login; changing your password signs out all other sessions.
- Rate limits: all login attempts per IP plus failed logins per IP+username and per IP, sign-ups per IP, wrong current-password attempts per user, "email already in use" answers per user, and row-creating saves per user (600/hour).
- bcrypt on a worker thread, so one login doesn't stall other users; at most 10 live sessions per account.
- Storage bounds per user: newest 20 quiz attempts per week, 200 activity entries per day, daily logs only for the past year.
- Browser data (quiz drafts, timer) is bound to the logged-in account and cleared on logout or when a different account logs in.
- Strict CSP (no inline scripts), `nosniff`, `X-Frame-Options: DENY`, `no-referrer`; all user content is HTML-escaped.
- JSON-only state-changing requests (CSRF defence); server-side validation of every field; parameterised SQL scoped to the session user.
- Quiz model answers are only sent after you submit your answers.

## Layout

```
server.js            Express API + static hosting
database.js          SQLite schema and data access (streaks derived from study dates)
session-store.js     express-session store on SQLite
data/course-content.js   Markdown → structured course loader
data/weeks/*.md      Course content (12 weeks)
data/resources.md    Appendix / quick reference
public/              SPA: index.html, css/style.css, js/{components,views,app}.js
```
