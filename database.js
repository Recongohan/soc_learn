const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'bootcamp.db');
const WEEKS = 12;
const SECTIONS = ['concepts', 'lab', 'quiz', 'soc_problem'];
// Actions that count as a "study day" for the streak (plus any daily log with hours > 0).
const STUDY_ACTIONS = ['completed', 'quiz_completed', 'lab_checked', 'daily_log', 'timer'];
// Pre-computed hash so login timing is the same whether or not the user exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

let db;

// ── Time helpers (local server time — this app runs on the learner's own machine) ──
function pad(n) { return String(n).padStart(2, '0'); }
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localDateTime(d = new Date()) {
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

function init() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true, mode: 0o700 });
  // The DB holds password hashes, notes and live session IDs: keep it owner-only (0600),
  // including databases created by older versions. SQLite gives -wal/-shm the DB file's mode.
  const oldMask = process.umask(0o077);
  try { db = new Database(DB_PATH); } finally { process.umask(oldMask); }
  try { fs.chmodSync(DB_PATH, 0o600); } catch { /* e.g. Windows or read-only FS */ }
  db.pragma('journal_mode = WAL');
  for (const f of [DB_PATH + '-wal', DB_PATH + '-shm']) {
    try { fs.chmodSync(f, 0o600); } catch { /* not created yet */ }
  }
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME,
      last_login DATETIME,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      weekly_goal_hours INTEGER DEFAULT 12,
      start_date DATE
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      section TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      time_spent_minutes INTEGER DEFAULT 0,
      UNIQUE(user_id, week, section)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      answers TEXT,
      grades TEXT,
      score INTEGER,
      total INTEGER,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date DATE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      detail TEXT,
      week INTEGER,
      created_at DATETIME
    );
    CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_log(user_id, created_at);

    CREATE TABLE IF NOT EXISTS lab_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      item_index INTEGER NOT NULL,
      checked INTEGER DEFAULT 0,
      checked_at DATETIME,
      UNIQUE(user_id, week, item_index)
    );

    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      section TEXT NOT NULL,
      content TEXT,
      updated_at DATETIME,
      UNIQUE(user_id, week, section)
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      hours_studied REAL DEFAULT 0,
      topics_covered TEXT,
      mood TEXT,
      notes TEXT,
      UNIQUE(user_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
  `);

  // Lightweight migration for databases created by the original handoff schema.
  const cols = db.prepare("PRAGMA table_info('quiz_attempts')").all().map(c => c.name);
  if (!cols.includes('grades')) db.exec('ALTER TABLE quiz_attempts ADD COLUMN grades TEXT');

  return db;
}

function getDb() { return db || init(); }

// ── Users ──
function createUser(username, email, password, displayName) {
  const hash = bcrypt.hashSync(password, 10);
  const now = localDateTime();
  const result = getDb().prepare(
    'INSERT INTO users (username, email, password_hash, display_name, created_at, start_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, email, hash, displayName || username, now, localDate());
  getDb().prepare('INSERT INTO streaks (user_id) VALUES (?)').run(result.lastInsertRowid);
  return Number(result.lastInsertRowid);
}

// bcrypt off the main thread (bcrypt-worker.js), so one login or password change cannot stall other requests.
const { Worker } = require('worker_threads');
let bcryptWorker = null, bcryptSeq = 0;
const bcryptPending = new Map();
function failPending(err) { for (const p of bcryptPending.values()) p.reject(err); bcryptPending.clear(); bcryptWorker = null; }
function bcryptOffThread(op, a, b) {
  if (!bcryptWorker) {
    bcryptWorker = new Worker(path.join(__dirname, 'bcrypt-worker.js'));
    bcryptWorker.unref(); // never keeps the process alive by itself
    bcryptWorker.on('message', ({ id, ok, result, error }) => {
      const p = bcryptPending.get(id);
      if (!p) return;
      bcryptPending.delete(id);
      ok ? p.resolve(result) : p.reject(new Error(error));
    });
    bcryptWorker.on('error', failPending);
    bcryptWorker.on('exit', code => { if (code !== 0) failPending(new Error(`bcrypt worker exited (${code})`)); else bcryptWorker = null; });
  }
  return new Promise((resolve, reject) => {
    const id = ++bcryptSeq;
    bcryptPending.set(id, { resolve, reject });
    bcryptWorker.postMessage({ id, op, a, b });
  });
}

async function authenticateUser(login, password) {
  const user = getDb().prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
  const ok = await bcryptOffThread('compare', password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return null;
  getDb().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(localDateTime(), user.id);
  return getUser(user.id);
}

function getUser(id) {
  return getDb().prepare(
    'SELECT id, username, email, display_name, start_date, weekly_goal_hours, timezone, created_at, last_login FROM users WHERE id = ?'
  ).get(id);
}

function updateProfile(userId, { displayName, email, weeklyGoalHours, startDate }) {
  getDb().prepare(
    'UPDATE users SET display_name = ?, email = ?, weekly_goal_hours = ?, start_date = ? WHERE id = ?'
  ).run(displayName, email, weeklyGoalHours, startDate, userId);
  return getUser(userId);
}

async function changePassword(userId, currentPassword, newPassword) {
  const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
  if (!row || !(await bcryptOffThread('compare', currentPassword, row.password_hash))) return false;
  const hash = await bcryptOffThread('hash', newPassword, 10);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  return true;
}

// ── Activity + streak ──
const MAX_ACTIVITY_PER_DAY = 200; // per user; older rows from the same day are pruned (streaks only need one per day)
function logActivity(userId, action, detail, week) {
  const now = localDateTime();
  getDb().prepare('INSERT INTO activity_log (user_id, action, detail, week, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, action, detail || null, week || null, now);
  const day = now.slice(0, 10);
  getDb().prepare(`DELETE FROM activity_log WHERE user_id = ? AND created_at >= ? AND created_at < ? AND id NOT IN (
    SELECT id FROM activity_log WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY id DESC LIMIT ?)`)
    .run(userId, `${day} 00:00:00`, `${addDays(day, 1)} 00:00:00`, userId, `${day} 00:00:00`, `${addDays(day, 1)} 00:00:00`, MAX_ACTIVITY_PER_DAY);
  if (STUDY_ACTIONS.includes(action)) updateStreak(userId);
}

function getRecentActivity(userId, limit = 20) {
  return getDb().prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(userId, limit);
}

function getActivityBetween(userId, fromDate, toDate) {
  return getDb().prepare(
    'SELECT * FROM activity_log WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at ASC'
  ).all(userId, `${fromDate} 00:00:00`, `${addDays(toDate, 1)} 00:00:00`);
}

/** All distinct dates (YYYY-MM-DD) that count as study days, ascending. */
function getStudyDates(userId) {
  const placeholders = STUDY_ACTIONS.map(() => '?').join(',');
  return getDb().prepare(`
    SELECT d FROM (
      SELECT substr(created_at, 1, 10) AS d FROM activity_log WHERE user_id = ? AND action IN (${placeholders})
      UNION
      SELECT log_date AS d FROM daily_logs WHERE user_id = ? AND hours_studied > 0
    ) ORDER BY d ASC
  `).all(userId, ...STUDY_ACTIONS, userId).map(r => r.d);
}

/**
 * Streaks are derived from the actual study dates, so back-filled daily logs and
 * deleted data are always reflected correctly. A streak stays "alive" until the
 * end of the day after the last study day.
 */
function computeStreak(userId) {
  const dates = getStudyDates(userId);
  const today = localDate();
  let longest = 0, run = 0, prev = null;
  for (const d of dates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const last = dates[dates.length - 1] || null;
  const alive = last === today || last === addDays(today, -1);
  return {
    current_streak: alive ? run : 0,
    longest_streak: longest,
    total_study_days: dates.length,
    last_activity_date: last,
    studied_today: last === today
  };
}

function updateStreak(userId) {
  const s = computeStreak(userId);
  getDb().prepare(`
    INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak, last_activity_date = excluded.last_activity_date
  `).run(userId, s.current_streak, s.longest_streak, s.last_activity_date);
  return s;
}

function getStreak(userId) { return computeStreak(userId); }

// ── Progress ──
function setProgress(userId, week, section, completed) {
  const existing = getDb().prepare('SELECT completed FROM progress WHERE user_id = ? AND week = ? AND section = ?')
    .get(userId, week, section);
  if (existing && !!existing.completed === !!completed) return false; // no change
  const now = localDateTime();
  getDb().prepare(`
    INSERT INTO progress (user_id, week, section, completed, completed_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week, section) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at
  `).run(userId, week, section, completed ? 1 : 0, completed ? now : null);
  logActivity(userId, completed ? 'completed' : 'uncompleted', section, week);
  return true;
}

function addTime(userId, week, section, minutes) {
  getDb().prepare(`
    INSERT INTO progress (user_id, week, section, time_spent_minutes) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, week, section) DO UPDATE SET time_spent_minutes = COALESCE(time_spent_minutes, 0) + excluded.time_spent_minutes
  `).run(userId, week, section, minutes);
  logActivity(userId, 'timer', `${minutes} min on ${section}`, week);
}

function getProgress(userId) {
  return getDb().prepare('SELECT * FROM progress WHERE user_id = ?').all(userId);
}

function getWeekProgress(userId, week) {
  return getDb().prepare('SELECT * FROM progress WHERE user_id = ? AND week = ?').all(userId, week);
}

// ── Quiz ──
const MAX_ATTEMPTS_PER_WEEK = 20; // keep the newest attempts per user per week
function saveQuizAttempt(userId, week, answers, grades, score, total) {
  getDb().prepare(
    'INSERT INTO quiz_attempts (user_id, week, answers, grades, score, total, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, week, JSON.stringify(answers), JSON.stringify(grades), score, total, localDateTime());
  getDb().prepare(`DELETE FROM quiz_attempts WHERE user_id = ? AND week = ? AND id NOT IN (
    SELECT id FROM quiz_attempts WHERE user_id = ? AND week = ? ORDER BY id DESC LIMIT ?)`)
    .run(userId, week, userId, week, MAX_ATTEMPTS_PER_WEEK);
  logActivity(userId, 'quiz_completed', `Week ${week}: ${Math.round((score / total) * 100)}%`, week);
}

function getQuizAttempts(userId, week) {
  return getDb().prepare('SELECT * FROM quiz_attempts WHERE user_id = ? AND week = ? ORDER BY completed_at DESC, id DESC')
    .all(userId, week)
    .map(a => ({ ...a, answers: safeJson(a.answers, []), grades: safeJson(a.grades, []) }));
}

/** Best attempt per week as a percentage (attempts can have different totals). */
function getQuizBests(userId) {
  return getDb().prepare(`
    SELECT week, MAX(CAST(score AS REAL) / total) AS best_ratio, COUNT(*) AS attempts
    FROM quiz_attempts WHERE user_id = ? AND total > 0 GROUP BY week ORDER BY week
  `).all(userId).map(r => ({ week: r.week, best: Math.round(r.best_ratio * 100), attempts: r.attempts }));
}

function getBestQuizScore(userId, week) {
  return getQuizBests(userId).find(q => q.week === week) || null;
}

// ── Lab checklist ──
function setLabCheck(userId, week, itemIndex, checked) {
  getDb().prepare(`
    INSERT INTO lab_checklist (user_id, week, item_index, checked, checked_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week, item_index) DO UPDATE SET checked = excluded.checked, checked_at = excluded.checked_at
  `).run(userId, week, itemIndex, checked ? 1 : 0, checked ? localDateTime() : null);
  if (checked) logActivity(userId, 'lab_checked', `Step ${itemIndex + 1}`, week);
  return getDb().prepare('SELECT COUNT(*) AS n FROM lab_checklist WHERE user_id = ? AND week = ? AND checked = 1')
    .get(userId, week).n;
}

function getLabChecklist(userId, week) {
  return getDb().prepare('SELECT item_index, checked, checked_at FROM lab_checklist WHERE user_id = ? AND week = ?')
    .all(userId, week);
}

// ── Notes ──
function saveNote(userId, week, section, content) {
  getDb().prepare(`
    INSERT INTO user_notes (user_id, week, section, content, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week, section) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `).run(userId, week, section, content, localDateTime());
  // Auto-save fires often; only log a note activity once per 30 min per section.
  const recent = getDb().prepare(`
    SELECT 1 FROM activity_log WHERE user_id = ? AND week = ? AND action = 'note_saved' AND detail = ? AND created_at > ?
  `).get(userId, week, section, localDateTime(new Date(Date.now() - 30 * 60 * 1000)));
  if (!recent && content && content.trim()) logActivity(userId, 'note_saved', section, week);
}

function getNotes(userId, week) {
  return getDb().prepare('SELECT week, section, content, updated_at FROM user_notes WHERE user_id = ? AND week = ?').all(userId, week);
}

// ── Daily log ──
function saveDailyLog(userId, date, hours, topics, mood, notes) {
  getDb().prepare(`
    INSERT INTO daily_logs (user_id, log_date, hours_studied, topics_covered, mood, notes) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, log_date) DO UPDATE SET hours_studied = excluded.hours_studied,
      topics_covered = excluded.topics_covered, mood = excluded.mood, notes = excluded.notes
  `).run(userId, date, hours, topics, mood, notes);
  logActivity(userId, 'daily_log', `${date}: ${hours}h`, null);
  updateStreak(userId); // a back-filled date can change the streak too
}

function getDailyLogs(userId, fromDate, toDate) {
  return getDb().prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? ORDER BY log_date DESC')
    .all(userId, fromDate, toDate);
}

function deleteDailyLog(userId, date) {
  getDb().prepare('DELETE FROM daily_logs WHERE user_id = ? AND log_date = ?').run(userId, date);
  updateStreak(userId);
}

// ── Calendar / heatmap ──
/** Per-day summary between two dates: logged hours, mood, completions, activity count. */
function getDaySummaries(userId, fromDate, toDate) {
  const days = {};
  const ensure = d => (days[d] = days[d] || { date: d, hours: 0, timerMinutes: 0, mood: null, topics: null, notes: null, completions: 0, activities: [] });
  for (const l of getDailyLogs(userId, fromDate, toDate)) {
    Object.assign(ensure(l.log_date), { hours: l.hours_studied, mood: l.mood, topics: l.topics_covered, notes: l.notes });
  }
  for (const a of getActivityBetween(userId, fromDate, toDate)) {
    const d = ensure(a.created_at.slice(0, 10));
    if (a.action === 'completed') d.completions++;
    if (a.action === 'timer') d.timerMinutes += parseInt(a.detail, 10) || 0;
    d.activities.push({ action: a.action, detail: a.detail, week: a.week, time: a.created_at.slice(11, 16) });
  }
  return days;
}

// ── Dashboard ──
function getDashboardStats(userId, course) {
  const rows = getProgress(userId);
  const byWeek = {};
  for (let w = 1; w <= WEEKS; w++) byWeek[w] = { concepts: false, lab: false, quiz: false, soc_problem: false };
  let timerMinutes = 0;
  for (const r of rows) {
    if (byWeek[r.week] && SECTIONS.includes(r.section)) byWeek[r.week][r.section] = !!r.completed;
    timerMinutes += r.time_spent_minutes || 0;
  }

  const labCounts = {};
  getDb().prepare('SELECT week, COUNT(*) AS n FROM lab_checklist WHERE user_id = ? AND checked = 1 GROUP BY week')
    .all(userId).forEach(r => { labCounts[r.week] = r.n; });

  const weeklyProgress = [];
  let completedCount = 0;
  for (let w = 1; w <= WEEKS; w++) {
    const done = Object.values(byWeek[w]).filter(Boolean).length;
    completedCount += done;
    const c = course ? course[w - 1] : null;
    weeklyProgress.push({
      week: w, title: c ? c.title : '', month: c ? c.month : null, monthTitle: c ? c.monthTitle : '',
      sections: byWeek[w], completed: done, total: 4, percentage: Math.round((done / 4) * 100),
      labChecked: labCounts[w] || 0, labTotal: c ? c.lab.steps.length : 0
    });
  }

  // Recommended week = first week that isn't fully complete; continue = its first incomplete section.
  const rec = weeklyProgress.find(w => w.completed < 4) || null;
  const continueTarget = rec ? { week: rec.week, section: SECTIONS.find(s => !rec.sections[s]) } : null;

  const today = localDate();
  const loggedHours = getDb().prepare('SELECT COALESCE(SUM(hours_studied), 0) AS h FROM daily_logs WHERE user_id = ?').get(userId).h;
  // This week = Monday..Sunday containing today
  const dow = (new Date().getDay() + 6) % 7;
  const weekStart = addDays(today, -dow);
  const weekHours = getDb().prepare('SELECT COALESCE(SUM(hours_studied), 0) AS h FROM daily_logs WHERE user_id = ? AND log_date BETWEEN ? AND ?')
    .get(userId, weekStart, today).h;
  const user = getUser(userId);

  const heatFrom = addDays(today, -97); // 14 full weeks
  const summaries = getDaySummaries(userId, heatFrom, today);
  const heatmap = [];
  for (let d = heatFrom; d <= today; d = addDays(d, 1)) {
    const s = summaries[d];
    heatmap.push({
      date: d,
      hours: s ? Math.max(s.hours, Math.round((s.timerMinutes / 60) * 10) / 10) : 0,
      activity: s ? s.activities.length : 0,
      completions: s ? s.completions : 0
    });
  }

  return {
    overall: { completed: completedCount, total: WEEKS * 4, percentage: Math.round((completedCount / (WEEKS * 4)) * 100) },
    totalTimeMinutes: timerMinutes,
    loggedHours,
    thisWeek: { start: weekStart, hours: weekHours, goal: user ? user.weekly_goal_hours : 12 },
    streak: computeStreak(userId),
    quizScores: getQuizBests(userId),
    weeklyProgress,
    recommendedWeek: rec ? rec.week : null,
    continueTarget,
    heatmap
  };
}

// ── Reset / export ──
function resetProgress(userId, includeNotes) {
  const tx = getDb().transaction(() => {
    for (const t of ['progress', 'quiz_attempts', 'lab_checklist', 'activity_log']) {
      getDb().prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
    }
    if (includeNotes) {
      getDb().prepare('DELETE FROM user_notes WHERE user_id = ?').run(userId);
      getDb().prepare('DELETE FROM daily_logs WHERE user_id = ?').run(userId);
    }
  });
  tx();
  updateStreak(userId);
}

function exportData(userId) {
  const q = sql => getDb().prepare(sql).all(userId);
  return {
    exportedAt: new Date().toISOString(),
    user: getUser(userId),
    streak: computeStreak(userId),
    progress: q('SELECT week, section, completed, completed_at, time_spent_minutes FROM progress WHERE user_id = ? ORDER BY week'),
    quizAttempts: q('SELECT week, answers, grades, score, total, completed_at FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at')
      .map(a => ({ ...a, answers: safeJson(a.answers, []), grades: safeJson(a.grades, []) })),
    labChecklist: q('SELECT week, item_index, checked, checked_at FROM lab_checklist WHERE user_id = ? ORDER BY week, item_index'),
    notes: q('SELECT week, section, content, updated_at FROM user_notes WHERE user_id = ? ORDER BY week'),
    dailyLogs: q('SELECT log_date, hours_studied, topics_covered, mood, notes FROM daily_logs WHERE user_id = ? ORDER BY log_date'),
    activity: q('SELECT action, detail, week, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at')
  };
}

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

module.exports = {
  init, getDb, SECTIONS, WEEKS, localDate, addDays,
  createUser, authenticateUser, getUser, updateProfile, changePassword,
  setProgress, addTime, getProgress, getWeekProgress,
  updateStreak, getStreak,
  saveQuizAttempt, getQuizAttempts, getBestQuizScore, getQuizBests,
  setLabCheck, getLabChecklist,
  saveNote, getNotes,
  logActivity, getRecentActivity,
  saveDailyLog, getDailyLogs, deleteDailyLog, getDaySummaries,
  getDashboardStats, resetProgress, exportData
};
