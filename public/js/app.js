/* App core: API client, state, router, sidebar, global timer. */
(function () {
  'use strict';
  const { esc, toast } = UI;

  // ── API ──
  async function api(method, url, body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(url, opts); } catch { throw new Error('Cannot reach the server — is it running?'); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !url.endsWith('/login')) {
      App.state.user = null;
      if (!location.hash.startsWith('#/login')) location.hash = '#/login';
      throw new Error(data.error || 'Please log in');
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  api.get = url => api('GET', url);
  api.post = (url, body) => api('POST', url, body || {});
  api.put = (url, body) => api('PUT', url, body || {});
  api.del = url => api('DELETE', url, {});

  // ── Safe localStorage ──
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  };

  const state = { user: null, course: null, streak: null, weekSummary: null };

  // ── Sidebar ──
  function renderSidebar() {
    const nav = document.getElementById('sidebar');
    if (!state.user) { nav.innerHTML = ''; document.body.classList.add('no-sidebar'); return; }
    document.body.classList.remove('no-sidebar');
    const route = location.hash || '#/dashboard';
    const s = state.streak || { current_streak: 0 };
    const summary = state.weekSummary || {};
    const months = [];
    (state.course || []).forEach(w => {
      let m = months.find(x => x.month === w.month);
      if (!m) months.push(m = { month: w.month, title: w.monthTitle, weeks: [] });
      m.weeks.push(w);
    });
    const link = (href, icon, label, extra = '') =>
      `<a href="${href}" class="nav-link${route === href || route.startsWith(href + '/') ? ' active' : ''}">${icon ? `<span class="nav-icon" aria-hidden="true">${icon}</span>` : ''}<span class="nav-label">${label}</span>${extra}</a>`;

    nav.innerHTML = `
      <div class="brand"><span class="brand-mark" aria-hidden="true">◈</span><div><div class="brand-title">SOC Boot Camp</div><div class="brand-sub">12-week analyst track</div></div></div>
      <a href="#/dashboard" class="streak-badge${s.studied_today ? ' lit' : ''}" title="Longest: ${s.longest_streak || 0} days">
        <span class="flame" aria-hidden="true">🔥</span><span><strong>${s.current_streak}</strong> day streak</span>
        ${s.studied_today ? '' : '<span class="streak-hint">study today to keep it</span>'}
      </a>
      <nav aria-label="Main">
        ${link('#/dashboard', '▦', 'Dashboard')}
        ${months.map(m => `<div class="nav-group"><div class="nav-group-title">Month ${m.month} · ${esc(m.title)}</div>
          ${m.weeks.map(w => {
            const p = summary[w.week];
            return link(`#/week/${w.week}`, '', `<span class="wk-num">W${w.week}</span> ${esc(w.title)}`,
              p ? `<span class="nav-pct${p === 4 ? ' done' : ''}">${p === 4 ? '✓' : `${p}/4`}</span>` : '');
          }).join('')}</div>`).join('')}
        <div class="nav-group"><div class="nav-group-title">Tools</div>
          ${link('#/calendar', '📅', 'Calendar & Log')}
          ${link('#/resources', '📚', 'Resources')}
          ${link('#/profile', '⚙', 'Profile')}
          <button type="button" class="nav-link" data-action="logout"><span class="nav-icon" aria-hidden="true">⎋</span><span class="nav-label">Log out</span></button>
        </div>
      </nav>`;
  }

  async function refreshMeta() {
    if (!state.user) return;
    try {
      const [streak, dash] = await Promise.all([api.get('/api/streak'), api.get('/api/dashboard')]);
      state.streak = streak;
      state.weekSummary = {};
      dash.stats.weeklyProgress.forEach(w => { state.weekSummary[w.week] = w.completed; });
      renderSidebar();
    } catch { /* non-fatal */ }
  }

  // ── Global study timer (survives navigation and reloads) ──
  const timer = {
    get() { return store.get('socbc.timer', null); },
    isRunning(week, section) { const t = this.get(); return !!t && t.week === week && t.section === section; },
    async start(week, section) {
      const t = this.get();
      if (t) await this.stop();
      store.set('socbc.timer', { week, section, start: Date.now() });
      renderTimerBar();
    },
    async stop() {
      const t = this.get();
      if (!t) return 0;
      store.del('socbc.timer');
      renderTimerBar();
      const minutes = Math.round((Date.now() - t.start) / 60000);
      if (minutes < 1) { toast('Timer stopped (under a minute — not recorded)'); return 0; }
      const capped = Math.min(minutes, 600);
      try {
        await api.post('/api/progress/time', { week: t.week, section: t.section, minutes: capped });
        toast(`Recorded ${UI.fmtMinutes(capped)} on Week ${t.week} ${UI.SECTION_LABELS[t.section]}`, 'success');
        refreshMeta();
      } catch (e) { toast(e.message, 'error'); }
      return capped;
    }
  };

  let timerTick = null;
  function renderTimerBar() {
    const bar = document.getElementById('timer-bar');
    const t = timer.get();
    clearInterval(timerTick);
    if (!t || !state.user) { bar.hidden = true; return; }
    bar.hidden = false;
    const draw = () => {
      const s = Math.floor((Date.now() - t.start) / 1000);
      const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
      bar.innerHTML = `<span class="pulse" aria-hidden="true"></span> Timing <a href="#/week/${t.week}">Week ${t.week} · ${UI.SECTION_LABELS[t.section]}</a>
        <span class="mono">${hh ? hh + ':' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}</span>
        <button type="button" class="btn btn-sm btn-ghost" data-action="timer-stop">Stop &amp; save</button>`;
    };
    draw();
    timerTick = setInterval(draw, 1000);
  }

  // ── Router ──
  const routes = [
    [/^#\/login$/, () => Views.auth()],
    [/^#\/dashboard$/, (m, cur) => Views.dashboard(m, cur)],
    [/^#\/week\/(\d+)(?:\/(\w+))?$/, (m, cur) => Views.week(parseInt(m[1], 10), m[2], cur)],
    [/^#\/calendar(?:\/(\d{4}-\d{2}-\d{2}))?$/, (m, cur) => Views.calendar(m[1], cur)],
    [/^#\/profile$/, (m, cur) => Views.profile(m, cur)],
    [/^#\/resources$/, (m, cur) => Views.resources(m, cur)]
  ];

  let routeSeq = 0;
  async function route() {
    const seq = ++routeSeq;
    const hash = location.hash || '#/dashboard';
    if (!state.user && hash !== '#/login') { location.hash = '#/login'; return; }
    if (state.user && hash === '#/login') { location.hash = '#/dashboard'; return; }
    document.body.classList.remove('nav-open');
    const main = document.getElementById('main');
    const match = routes.map(([re, fn]) => [hash.match(re), fn]).find(([m]) => m);
    renderSidebar();
    if (!match) { main.innerHTML = '<div class="empty-state"><h2>Page not found</h2><a class="btn btn-primary" href="#/dashboard">Back to dashboard</a></div>'; return; }
    main.setAttribute('aria-busy', 'true');
    try {
      await match[1](match[0], () => seq === routeSeq);
    } catch (e) {
      if (seq === routeSeq) main.innerHTML = `<div class="empty-state"><h2>Something went wrong</h2><p class="muted">${esc(e.message)}</p><button class="btn btn-primary" data-action="reload">Retry</button></div>`;
    } finally {
      main.removeAttribute('aria-busy');
    }
    if (seq === routeSeq) {
      if (!hash.includes('/week/') || !hash.split('/')[3]) window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
  }

  async function onLogin(user) {
    state.user = user;
    state.course = await api.get('/api/course');
    await refreshMeta();
    renderTimerBar();
  }

  async function logout() {
    if (timer.get()) await timer.stop();
    await api.post('/api/logout').catch(() => {});
    Object.assign(state, { user: null, course: null, streak: null, weekSummary: null });
    renderSidebar();
    renderTimerBar();
    location.hash = '#/login';
  }

  // ── Global event delegation ──
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'logout') { e.preventDefault(); logout(); }
    else if (action === 'timer-stop') { e.preventDefault(); timer.stop().then(() => Views.onTimerChange && Views.onTimerChange()); }
    else if (action === 'toggle-nav') { document.body.classList.toggle('nav-open'); }
    else if (action === 'close-nav') { document.body.classList.remove('nav-open'); }
    else if (action === 'reload') { route(); }
    else if (action === 'open-day') { location.hash = `#/calendar/${el.dataset.date}`; }
    else if (action === 'copy-code') {
      const code = el.parentElement.querySelector('code').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject())
        .then(() => { el.textContent = 'Copied'; setTimeout(() => { el.textContent = 'Copy'; }, 1500); })
        .catch(() => toast('Copy failed — select the text manually', 'error'));
    }
  });

  window.addEventListener('hashchange', route);

  async function boot() {
    try {
      const me = await api.get('/api/me');
      await onLogin(me);
    } catch { state.user = null; }
    route();
  }

  window.App = { api, store, state, route, onLogin, refreshMeta, renderSidebar, timer, renderTimerBar };
  document.addEventListener('DOMContentLoaded', boot);
})();
