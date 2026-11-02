# SOC Analyst Boot Camp — Training Hub

A localhost training platform for a 12-week SOC analyst programme: theory, hands-on labs, open-ended quizzes with model answers, and real-world SOC problems, with progress tracking, streaks, a study calendar and notes.

## Run

```bash
cd soc_learn
npm install
npm start          # → http://127.0.0.1:3000
```

Node 18+ required. Data lives in `data/bootcamp.db` (SQLite, created on first run). The session secret is generated into `data/.secret`. Both are git-ignored.

Environment options: `PORT` (default 3000), `HOST` (default `127.0.0.1`; set `0.0.0.0` to reach it from a tablet on your LAN), `DB_PATH`, `SESSION_SECRET`.

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

The server binds to loopback by default. It uses bcrypt password hashes, SQLite-backed sessions (httpOnly, SameSite=strict), a strict CSP (no inline scripts), JSON-only state-changing requests (CSRF defence), login throttling, and server-side input validation. Quiz model answers are only sent after you submit your answers.

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
