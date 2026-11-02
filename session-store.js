const session = require('express-session');

/** Minimal express-session store backed by the app's SQLite database. */
class SqliteStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    this.getStmt = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > ?');
    this.setStmt = db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`);
    this.delStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchStmt = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.pruneStmt = db.prepare('DELETE FROM sessions WHERE expires <= ?');
    this.prune();
    this.timer = setInterval(() => this.prune(), 60 * 60 * 1000);
    this.timer.unref();
  }

  expiry(sess) {
    const maxAge = sess && sess.cookie && sess.cookie.maxAge;
    return Date.now() + (typeof maxAge === 'number' ? maxAge : 24 * 60 * 60 * 1000);
  }

  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (e) { cb(e); }
  }

  set(sid, sess, cb) {
    try { this.setStmt.run(sid, JSON.stringify(sess), this.expiry(sess)); cb && cb(null); } catch (e) { cb && cb(e); }
  }

  destroy(sid, cb) {
    try { this.delStmt.run(sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }

  touch(sid, sess, cb) {
    try { this.touchStmt.run(this.expiry(sess), sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }

  prune() { this.pruneStmt.run(Date.now()); }
}

module.exports = SqliteStore;
