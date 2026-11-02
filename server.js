const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const SqliteStore = require('./session-store');
const courseData = require('./data/course-content');

const PORT = parseInt(process.env.PORT, 10) || 3000;
// Bind to loopback by default: this is a personal app. Set HOST=0.0.0.0 to expose it on your LAN.
const HOST = process.env.HOST || '127.0.0.1';

// Set COOKIE_SECURE=true when serving over HTTPS (e.g. behind Caddy/Tailscale). Set TRUST_PROXY=1 behind a reverse proxy.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
// Hostnames allowed in the Host header (DNS-rebinding defence). Add your LAN hostname/IP via ALLOWED_HOSTS=a:3000,b:3000.
const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`,
  ...(process.env.ALLOWED_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
]);

const sqlite = db.init();
const app = express();
app.disable('x-powered-by');
// Trust X-Forwarded-For only from the proxy itself, never from arbitrary direct clients:
// TRUST_PROXY=1/true -> proxy on this machine (loopback); otherwise an explicit address/CIDR list
// (e.g. TRUST_PROXY=10.0.0.5 or TRUST_PROXY=uniquelocal), passed to Express as-is.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY.trim();
  app.set('trust proxy', /^(1|true|yes)$/i.test(tp) ? 'loopback' : tp.split(',').map(s => s.trim()).filter(Boolean));
}

// Reject requests whose Host header isn't ours, so a malicious site can't DNS-rebind onto this server.
app.use((req, res, next) => {
  if (ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) return next();
  res.status(421).type('text/plain').send('Misdirected request: host not allowed. Add it to ALLOWED_HOSTS.');
});

// ── Session secret: generated once and kept in data/.secret (git-ignored) ──
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(__dirname, 'data', '.secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* create below */ }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

// ── Security headers ──
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(session({
  name: 'socbc.sid',
  store: new SqliteStore(sqlite),
  secret: loadSecret(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// CSRF defence: state-changing API calls must be JSON (cross-site forms can't send that without a CORS preflight).
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

// Default-deny: every /api route requires a logged-in session except this allowlist.
// (Routes still call requireAuth individually as a second layer.)
const PUBLIC_API = new Set(['POST /login', 'POST /register', 'POST /logout']);
app.use('/api', (req, res, next) =>
  PUBLIC_API.has(`${req.method} ${req.path}`) ? next() : requireAuth(req, res, next));

// ── Helpers ──
const SECTIONS = db.SECTIONS;
const MOODS = ['great', 'good', 'okay', 'rough'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!db.getUser(req.session.userId)) {
    return req.session.destroy(() => res.status(401).json({ error: 'Not authenticated' }));
  }
  next();
}

function parseWeek(v) {
  const w = Number(v);
  return Number.isInteger(w) && w >= 1 && w <= courseData.length ? w : null;
}
function getWeek(v) { const w = parseWeek(v); return w ? courseData[w - 1] : null; }
function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d) && db.localDate(d) === s;
}
function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
const bad = (res, msg) => res.status(400).json({ error: msg });

// bcrypt only uses the first 72 bytes of a password — reject longer ones instead of silently truncating.
function passwordProblem(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Password must be at most 72 bytes';
  return null;
}

/**
 * Fixed-window rate limiter. In-memory is a deliberate choice: this is a single-process app
 * on the learner's own machine, so there's no fleet to share state with. Expired windows are pruned.
 */
class RateLimiter {
  constructor(max, windowMs) { this.max = max; this.windowMs = windowMs; this.hits = new Map(); }
  entry(key) {
    const e = this.hits.get(key);
    if (!e || Date.now() - e.start > this.windowMs) return null;
    return e;
  }
  blocked(key) { const e = this.entry(key); return !!e && e.count >= this.max; }
  hit(key) {
    const e = this.entry(key);
    if (e) e.count++; else this.hits.set(key, { count: 1, start: Date.now() });
  }
  reset(key) { this.hits.delete(key); }
  prune() { for (const [k, e] of this.hits) if (Date.now() - e.start > this.windowMs) this.hits.delete(k); }
}
const MIN = 60 * 1000;
const loginByAccount = new RateLimiter(10, 15 * MIN); // failed logins per IP + username
const loginByIp = new RateLimiter(50, 15 * MIN);      // failed logins per IP across all usernames (spraying)
const registerByIp = new RateLimiter(10, 60 * MIN);   // account creations per IP
const passwordByUser = new RateLimiter(10, 15 * MIN); // failed current-password checks per user
const loginAttemptsByIp = new RateLimiter(30, 15 * MIN); // ALL login attempts per IP (bcrypt work is the cost)
const emailConflictsByUser = new RateLimiter(5, 60 * MIN); // "email already in use" answers per user (enumeration)
const writesByUser = new RateLimiter(600, 60 * MIN);  // row-creating writes per user (storage growth)
const LIMITERS = [loginByAccount, loginByIp, registerByIp, passwordByUser, loginAttemptsByIp, emailConflictsByUser, writesByUser];
setInterval(() => LIMITERS.forEach(l => l.prune()), 5 * MIN).unref();
const MAX_SESSIONS_PER_USER = 10;

/** Middleware: count a row-creating write against the user's hourly budget. */
function limitWrites(req, res, next) {
  if (writesByUser.blocked(req.session.userId)) return tooMany(res, 'saves this hour');
  writesByUser.hit(req.session.userId);
  next();
}
const tooMany = (res, what) => res.status(429).json({ error: `Too many ${what}. Try again later.` });

function startSession(req, res, userId, payload) {
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Session error' });
    req.session.userId = userId;
    req.session.save(() => {
      // Cap live sessions per account: keep only the newest MAX_SESSIONS_PER_USER.
      sqlite.prepare(`DELETE FROM sessions WHERE json_extract(sess, '$.userId') = ? AND sid NOT IN (
        SELECT sid FROM sessions WHERE json_extract(sess, '$.userId') = ? ORDER BY expires DESC LIMIT ?)`)
        .run(userId, userId, MAX_SESSIONS_PER_USER);
      res.json(payload);
    });
  });
}

// ── Auth ──
app.post('/api/register', (req, res) => {
  if (registerByIp.blocked(req.ip)) return tooMany(res, 'sign-up attempts');
  const username = str(req.body.username, 40).trim();
  const email = str(req.body.email, 120).trim();
  const password = str(req.body.password, 200);
  const displayName = str(req.body.displayName, 60).trim();
  if (!username || !email || !password) return bad(res, 'Username, email and password are required');
  if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) return bad(res, 'Username: 3–40 letters, numbers, . _ -');
  if (!EMAIL_RE.test(email)) return bad(res, 'Enter a valid email');
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);
  registerByIp.hit(req.ip);
  try {
    const userId = db.createUser(username, email, password, displayName);
    startSession(req, res, userId, { success: true, user: db.getUser(userId) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already exists' });
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const login = str(req.body.username, 120).trim();
    const accountKey = `${req.ip}|${login.toLowerCase()}`;
    if (loginByAccount.blocked(accountKey) || loginByIp.blocked(req.ip)) return tooMany(res, 'failed login attempts');
    // Every attempt (success or failure) costs a bcrypt hash, so every attempt is counted.
    if (loginAttemptsByIp.blocked(req.ip)) return tooMany(res, 'login attempts');
    loginAttemptsByIp.hit(req.ip);
    // bcrypt runs on a worker thread (database.js), so one login no longer freezes everyone.
    const user = await db.authenticateUser(login, str(req.body.password, 200));
    if (!user) {
      loginByAccount.hit(accountKey); loginByIp.hit(req.ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    loginByAccount.reset(accountKey);
    startSession(req, res, user.id, { success: true, user });
  } catch (e) { next(e); }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('socbc.sid');
    res.json({ success: true });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ ...db.getUser(req.session.userId), streak: db.getStreak(req.session.userId) });
});

// ── Profile ──
app.put('/api/profile', requireAuth, (req, res) => {
  const displayName = str(req.body.displayName, 60).trim();
  const email = str(req.body.email, 120).trim();
  const weeklyGoalHours = Number(req.body.weeklyGoalHours);
  const startDate = req.body.startDate;
  if (!displayName) return bad(res, 'Display name is required');
  if (!EMAIL_RE.test(email)) return bad(res, 'Enter a valid email');
  if (!Number.isInteger(weeklyGoalHours) || weeklyGoalHours < 1 || weeklyGoalHours > 80) return bad(res, 'Weekly goal must be 1–80 hours');
  if (!isValidDate(startDate)) return bad(res, 'Invalid start date');
  // "Email already in use" reveals that an account exists, so cap how often one user can get that answer.
  if (emailConflictsByUser.blocked(req.session.userId)) return tooMany(res, 'email change attempts');
  try {
    res.json({ success: true, user: db.updateProfile(req.session.userId, { displayName, email, weeklyGoalHours, startDate }) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      emailConflictsByUser.hit(req.session.userId);
      return res.status(409).json({ error: 'That email is already in use' });
    }
    throw e;
  }
});

app.post('/api/password', requireAuth, async (req, res, next) => {
  try {
    const uid = req.session.userId;
    if (passwordByUser.blocked(uid)) return tooMany(res, 'incorrect password attempts');
    const current = str(req.body.currentPassword, 200);
    const newPw = str(req.body.newPassword, 200);
    const pwErr = passwordProblem(newPw);
    if (pwErr) return bad(res, `New p${pwErr.slice(1)}`);
    if (!(await db.changePassword(uid, current, newPw))) {
      passwordByUser.hit(uid);
      return res.status(403).json({ error: 'Current password is incorrect' });
    }
    passwordByUser.reset(uid);
    // Log out every other session for this account (e.g. a forgotten shared-machine login).
    const revoked = sqlite.prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId') = ? AND sid != ?")
      .run(uid, req.sessionID).changes;
    res.json({ success: true, otherSessionsRevoked: revoked });
  } catch (e) { next(e); }
});

app.post('/api/reset', requireAuth, (req, res) => {
  if (req.body.confirm !== 'RESET') return bad(res, 'Type RESET to confirm');
  db.resetProgress(req.session.userId, !!req.body.includeNotes);
  res.json({ success: true });
});

app.get('/api/export', requireAuth, (req, res) => {
  const data = db.exportData(req.session.userId);
  res.set('Content-Disposition', `attachment; filename="soc-bootcamp-progress-${db.localDate()}.json"`);
  res.type('application/json').send(JSON.stringify(data, null, 2));
});

// ── Dashboard ──
app.get('/api/dashboard', requireAuth, (req, res) => {
  res.json({
    stats: db.getDashboardStats(req.session.userId, courseData),
    activity: db.getRecentActivity(req.session.userId, 10)
  });
});

// ── Course ──
app.get('/api/course', requireAuth, (req, res) => {
  res.json(courseData.map(w => ({ week: w.week, title: w.title, month: w.month, monthTitle: w.monthTitle })));
});

/** Week content for the client. Quiz model answers are withheld until the learner submits answers. */
function publicWeek(w) {
  return {
    ...w,
    quiz: { count: w.quiz.questions.length, questions: w.quiz.questions.map(q => ({ question: q.question })) }
  };
}

app.get('/api/course/:week', requireAuth, (req, res) => {
  const w = getWeek(req.params.week);
  if (!w) return res.status(404).json({ error: 'Week not found' });
  const uid = req.session.userId;
  res.json({
    content: publicWeek(w),
    progress: db.getWeekProgress(uid, w.week),
    labChecklist: db.getLabChecklist(uid, w.week),
    notes: db.getNotes(uid, w.week),
    quizBest: db.getBestQuizScore(uid, w.week),
    totalWeeks: courseData.length
  });
});

app.get('/api/resources', requireAuth, (req, res) => {
  res.json({ markdown: fs.readFileSync(path.join(__dirname, 'data', 'resources.md'), 'utf8') });
});

// ── Progress ──
app.post('/api/progress', requireAuth, limitWrites, (req, res) => {
  const week = parseWeek(req.body.week);
  const { section } = req.body;
  if (!week || !SECTIONS.includes(section)) return bad(res, 'Invalid week or section');
  db.setProgress(req.session.userId, week, section, !!req.body.completed);
  res.json({ success: true, streak: db.getStreak(req.session.userId) });
});

app.post('/api/progress/time', requireAuth, limitWrites, (req, res) => {
  const week = parseWeek(req.body.week);
  const minutes = Math.round(Number(req.body.minutes));
  if (!week || !SECTIONS.includes(req.body.section)) return bad(res, 'Invalid week or section');
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) return bad(res, 'Minutes must be 1–600');
  db.addTime(req.session.userId, week, req.body.section, minutes);
  res.json({ success: true, streak: db.getStreak(req.session.userId) });
});

// ── Quizzes (open-ended, self-graded) ──
const normalize = s => String(s || '').toLowerCase().replace(/z/g, 's').replace(/\s+/g, ' ');

/** Keyword hint: which expected key terms appear in the learner's answer, plus a suggested grade. */
function keywordHint(answer, keywords) {
  const a = normalize(answer);
  if (!a.trim()) return { matched: [], missing: keywords, suggestion: 'incorrect' };
  const matched = keywords.filter(k => a.includes(normalize(k)));
  const ratio = keywords.length ? matched.length / keywords.length : 0;
  return {
    matched,
    missing: keywords.filter(k => !matched.includes(k)),
    suggestion: ratio >= 0.5 ? 'correct' : ratio >= 0.2 ? 'partial' : 'incorrect'
  };
}

function readAnswers(body, n) {
  if (!Array.isArray(body.answers)) return null;
  return Array.from({ length: n }, (_, i) => str(body.answers[i], 5000));
}

app.get('/api/quiz/:week', requireAuth, (req, res) => {
  const w = getWeek(req.params.week);
  if (!w) return res.status(404).json({ error: 'Quiz not found' });
  res.json({ questions: w.quiz.questions.map(q => ({ question: q.question })) });
});

// Step 1: submit answers → model answers, explanations and keyword hints (nothing saved yet).
app.post('/api/quiz/:week/check', requireAuth, (req, res) => {
  const w = getWeek(req.params.week);
  if (!w) return res.status(404).json({ error: 'Quiz not found' });
  const answers = readAnswers(req.body, w.quiz.questions.length);
  if (!answers) return bad(res, 'answers must be an array');
  res.json({
    results: w.quiz.questions.map((q, i) => ({
      question: q.question, userAnswer: answers[i], correctAnswer: q.answer,
      explanation: q.explanation, hint: keywordHint(answers[i], q.keywords)
    }))
  });
});

// Step 2: submit self-grades → score saved. correct = 2 pts, partial = 1, incorrect = 0.
app.post('/api/quiz/:week', requireAuth, limitWrites, (req, res) => {
  const w = getWeek(req.params.week);
  if (!w) return res.status(404).json({ error: 'Quiz not found' });
  const n = w.quiz.questions.length;
  const answers = readAnswers(req.body, n);
  const grades = req.body.grades;
  if (!answers) return bad(res, 'answers must be an array');
  if (!Array.isArray(grades) || grades.length !== n || !grades.every(g => ['correct', 'partial', 'incorrect'].includes(g))) {
    return bad(res, `Grade all ${n} questions as correct, partial or incorrect`);
  }
  const score = grades.reduce((s, g) => s + (g === 'correct' ? 2 : g === 'partial' ? 1 : 0), 0);
  const total = n * 2;
  db.saveQuizAttempt(req.session.userId, w.week, answers, grades, score, total);
  db.setProgress(req.session.userId, w.week, 'quiz', true);
  res.json({ score, total, percentage: Math.round((score / total) * 100), best: db.getBestQuizScore(req.session.userId, w.week) });
});

app.get('/api/quiz/:week/history', requireAuth, (req, res) => {
  const week = parseWeek(req.params.week);
  if (!week) return res.status(404).json({ error: 'Quiz not found' });
  res.json(db.getQuizAttempts(req.session.userId, week));
});

// ── Lab checklist ──
app.post('/api/lab/check', requireAuth, limitWrites, (req, res) => {
  const w = getWeek(req.body.week);
  const idx = Number(req.body.itemIndex);
  if (!w || !Number.isInteger(idx) || idx < 0 || idx >= w.lab.steps.length) return bad(res, 'Invalid week or step');
  const uid = req.session.userId;
  const checkedCount = db.setLabCheck(uid, w.week, idx, !!req.body.checked);
  // Checking every step auto-completes the lab section.
  const allDone = checkedCount >= w.lab.steps.length;
  if (allDone) db.setProgress(uid, w.week, 'lab', true);
  res.json({ success: true, checkedCount, total: w.lab.steps.length, labCompleted: allDone, streak: db.getStreak(uid) });
});

// ── Notes ──
app.post('/api/notes', requireAuth, (req, res) => {
  const week = parseWeek(req.body.week);
  if (!week || !SECTIONS.includes(req.body.section)) return bad(res, 'Invalid week or section');
  if (typeof req.body.content !== 'string' || req.body.content.length > 200000) return bad(res, 'Note too long');
  db.saveNote(req.session.userId, week, req.body.section, req.body.content);
  res.json({ success: true });
});

app.get('/api/notes/:week', requireAuth, (req, res) => {
  const week = parseWeek(req.params.week);
  if (!week) return res.status(404).json({ error: 'Week not found' });
  res.json(db.getNotes(req.session.userId, week));
});

// ── Daily log ──
app.post('/api/daily-log', requireAuth, limitWrites, (req, res) => {
  const { date, mood } = req.body;
  const hours = Number(req.body.hours);
  if (!isValidDate(date)) return bad(res, 'Invalid date');
  if (date > db.localDate()) return bad(res, "You can't log study time for a future date");
  if (date < db.addDays(db.localDate(), -366)) return bad(res, 'You can only log study time for the past year');
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return bad(res, 'Hours must be between 0 and 24');
  if (mood && !MOODS.includes(mood)) return bad(res, 'Invalid mood');
  db.saveDailyLog(req.session.userId, date, Math.round(hours * 4) / 4, str(req.body.topics, 2000), mood || null, str(req.body.notes, 5000));
  res.json({ success: true, streak: db.getStreak(req.session.userId) });
});

app.delete('/api/daily-log/:date', requireAuth, (req, res) => {
  if (!isValidDate(req.params.date)) return bad(res, 'Invalid date');
  db.deleteDailyLog(req.session.userId, req.params.date);
  res.json({ success: true });
});

app.get('/api/daily-logs', requireAuth, (req, res) => {
  const today = db.localDate();
  const from = isValidDate(req.query.from) ? req.query.from : db.addDays(today, -30);
  const to = isValidDate(req.query.to) ? req.query.to : today;
  res.json(db.getDailyLogs(req.session.userId, from, to));
});

// ── Calendar ──
app.get('/api/calendar', requireAuth, (req, res) => {
  const now = new Date();
  let m = parseInt(req.query.month, 10);
  let y = parseInt(req.query.year, 10);
  if (!(m >= 1 && m <= 12)) m = now.getMonth() + 1;
  if (!(y >= 2000 && y <= 2100)) y = now.getFullYear();
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const to = db.localDate(new Date(y, m, 0)); // last day of month
  res.json({ month: m, year: y, days: db.getDaySummaries(req.session.userId, from, to) });
});

// ── Streak & activity ──
app.get('/api/streak', requireAuth, (req, res) => res.json(db.getStreak(req.session.userId)));

app.get('/api/activity', requireAuth, (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
  res.json(db.getRecentActivity(req.session.userId, limit));
});

// Unknown API routes → JSON 404; everything else → SPA shell.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Error handler (bad JSON bodies etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  // Client errors raised by Express/body-parser (bad URI encoding, unsupported charset, aborted request) keep their 4xx code.
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) return res.status(status).json({ error: 'Bad request' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    const url = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
    console.log('\n  ╔══════════════════════════════════════════╗');
    console.log('  ║   SOC Analyst Boot Camp — Training Hub   ║');
    console.log(`  ║   ${url.padEnd(39)}║`);
    console.log('  ╚══════════════════════════════════════════╝\n');
  }).on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${PORT} is already in use — is the boot camp already running?\n  Close it, or start on another port: PORT=3001 npm start\n`);
    } else if (err.code === 'EACCES') {
      console.error(`\n  No permission to listen on ${HOST}:${PORT}. Try a port above 1024.\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

module.exports = app;
