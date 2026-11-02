/* View renderers. Each view renders into #main and wires its own events on a fresh root element. */
(function () {
  'use strict';
  const { esc, md, progressBar, sectionDots, heatmap, fmtDate, timeAgo, fmtMinutes, todayStr,
    activityText, toast, modal, debounce, SECTION_LABELS, SECTION_ORDER, MOODS } = UI;

  const main = () => document.getElementById('main');
  function mount(html) {
    const root = document.createElement('div');
    root.className = 'view';
    root.innerHTML = html;
    main().replaceChildren(root);
    return root;
  }
  const loading = () => mount('<div class="loading"><span class="spinner" aria-hidden="true"></span> Loading…</div>');

  const Views = {};

  // ════════════════ AUTH ════════════════
  Views.auth = function () {
    let mode = 'login';
    const root = mount('');
    const draw = (err = '') => {
      root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-brand"><span class="brand-mark" aria-hidden="true">◈</span> SOC Analyst Boot Camp</div>
          <p class="muted auth-tag">12 weeks · theory · labs · real SOC problems</p>
          <div class="tabs" role="tablist">
            <button type="button" role="tab" class="tab${mode === 'login' ? ' active' : ''}" aria-selected="${mode === 'login'}" data-mode="login">Log in</button>
            <button type="button" role="tab" class="tab${mode === 'register' ? ' active' : ''}" aria-selected="${mode === 'register'}" data-mode="register">Create account</button>
          </div>
          <form class="form" novalidate>
            ${mode === 'register' ? `
              <label>Display name<input name="displayName" autocomplete="name" placeholder="Recon"></label>
              <label>Username<input name="username" required autocomplete="username" pattern="[A-Za-z0-9_.\\-]{3,40}"></label>
              <label>Email<input name="email" type="email" required autocomplete="email"></label>
              <label>Password <span class="muted">(8+ characters)</span><input name="password" type="password" required minlength="8" autocomplete="new-password"></label>`
            : `
              <label>Username or email<input name="username" required autocomplete="username"></label>
              <label>Password<input name="password" type="password" required autocomplete="current-password"></label>`}
            <div class="form-error" role="alert">${esc(err)}</div>
            <button class="btn btn-primary btn-block" type="submit">${mode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
          <p class="muted small">Everything is stored locally in SQLite on this machine.</p>
        </div>
      </div>`;
      root.querySelector('input').focus();
    };
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-mode]');
      if (t) { mode = t.dataset.mode; draw(); }
    });
    root.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await App.api.post(mode === 'login' ? '/api/login' : '/api/register', f);
        await App.onLogin(res.user);
        toast(mode === 'login' ? `Welcome back, ${res.user.display_name}` : 'Account created — let’s get you SOC-ready', 'success');
        location.hash = '#/dashboard';
      } catch (err) {
        draw(err.message);
      }
    });
    draw();
  };

  // ════════════════ DASHBOARD ════════════════
  Views.dashboard = async function (m, current) {
    loading();
    const { stats, activity } = await App.api.get('/api/dashboard');
    if (!current()) return;
    const u = App.state.user;
    const s = stats.streak;
    const rec = stats.recommendedWeek ? stats.weeklyProgress[stats.recommendedWeek - 1] : null;
    const ct = stats.continueTarget;
    const weekPct = stats.thisWeek.goal ? Math.min(100, (stats.thisWeek.hours / stats.thisWeek.goal) * 100) : 0;
    const months = [1, 2, 3].map(n => stats.weeklyProgress.filter(w => w.month === n));
    const quizMap = Object.fromEntries(stats.quizScores.map(q => [q.week, q]));
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const root = mount(`
      <header class="page-head">
        <div>
          <p class="eyebrow">${esc(fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
          <h1>${greet}, ${esc(u.display_name)}</h1>
          <p class="muted">${stats.overall.completed === 0 ? 'Day one. Start with Week 1 concepts — networking is the floor everything else stands on.'
            : stats.overall.percentage === 100 ? 'Course complete. Time to polish the portfolio and start applying.'
            : `You’re ${stats.overall.percentage}% through the boot camp${rec ? ` — currently on Week ${rec.week}` : ''}.`}</p>
        </div>
        <div class="head-actions">
          ${ct ? `<a class="btn btn-primary" href="#/week/${ct.week}/${ct.section}">▶ Continue: W${ct.week} ${esc(SECTION_LABELS[ct.section])}</a>` : ''}
          <a class="btn btn-ghost" href="#/calendar/${todayStr()}">＋ Log today’s study</a>
        </div>
      </header>

      <div class="overall card">
        <div class="overall-row"><span>Overall progress</span><strong>${stats.overall.completed} / ${stats.overall.total} sections · ${stats.overall.percentage}%</strong></div>
        ${progressBar(stats.overall.percentage, { label: 'Overall progress' })}
      </div>

      <div class="stat-grid">
        <div class="stat card"><div class="stat-label">Current streak</div><div class="stat-value">🔥 ${s.current_streak}<span class="stat-unit">${s.current_streak === 1 ? 'day' : 'days'}</span></div>
          <div class="stat-sub">Longest ${s.longest_streak} · ${s.total_study_days} study days total</div></div>
        <div class="stat card"><div class="stat-label">Hours logged</div><div class="stat-value">${Math.round(stats.loggedHours * 10) / 10}<span class="stat-unit">h</span></div>
          <div class="stat-sub">+ ${fmtMinutes(stats.totalTimeMinutes)} on section timers</div></div>
        <div class="stat card"><div class="stat-label">This week</div><div class="stat-value">${stats.thisWeek.hours}<span class="stat-unit">/ ${stats.thisWeek.goal}h goal</span></div>
          ${progressBar(weekPct, { small: true, label: 'Weekly goal' })}</div>
        <div class="stat card"><div class="stat-label">Quizzes taken</div><div class="stat-value">${stats.quizScores.length}<span class="stat-unit">/ 12</span></div>
          <div class="stat-sub">${stats.quizScores.length ? `Avg best ${Math.round(stats.quizScores.reduce((a, q) => a + q.best, 0) / stats.quizScores.length)}%` : 'Self-graded, open-ended'}</div></div>
      </div>

      ${rec ? `<section class="card focus-card">
        <div class="focus-main">
          <p class="eyebrow">This week’s focus · Month ${rec.month} — ${esc(rec.monthTitle)}</p>
          <h2>Week ${rec.week}: ${esc(rec.title)}</h2>
          <ul class="focus-sections">
            ${SECTION_ORDER.map(sec => `<li class="${rec.sections[sec] ? 'done' : ''}"><a href="#/week/${rec.week}/${sec}">
              <span class="check" aria-hidden="true">${rec.sections[sec] ? '✓' : ''}</span>${SECTION_LABELS[sec]}
              ${sec === 'lab' && rec.labTotal ? `<span class="muted small">${rec.labChecked}/${rec.labTotal} steps</span>` : ''}
              ${sec === 'quiz' && quizMap[rec.week] ? `<span class="muted small">best ${quizMap[rec.week].best}%</span>` : ''}</a></li>`).join('')}
          </ul>
        </div>
        <a class="btn btn-primary" href="#/week/${rec.week}/${ct.section}">Open week ${rec.week} →</a>
      </section>` : ''}

      <section>
        <h2 class="section-title">Course map</h2>
        ${months.map(ws => `<div class="month-row">
          <div class="month-label">Month ${ws[0].month}<span>${esc(ws[0].monthTitle)}</span></div>
          <div class="week-grid">${ws.map(w => `
            <a class="week-card card${w.week === stats.recommendedWeek ? ' recommended' : ''}${w.completed === 4 ? ' complete' : ''}" href="#/week/${w.week}">
              <div class="week-card-top"><span class="wk">Week ${w.week}</span>${sectionDots(w.sections)}</div>
              <div class="week-card-title">${esc(w.title)}</div>
              <div class="week-card-foot"><span>${w.completed}/4</span>${quizMap[w.week] ? `<span class="quiz-pill">Quiz ${quizMap[w.week].best}%</span>` : ''}${w.week === stats.recommendedWeek ? '<span class="rec-pill">Up next</span>' : ''}</div>
            </a>`).join('')}</div></div>`).join('')}
      </section>

      <div class="two-col">
        <section class="card">
          <h2 class="card-title">Study activity <span class="muted small">last 14 weeks</span></h2>
          ${heatmap(stats.heatmap)}
        </section>
        <section class="card">
          <h2 class="card-title">Quiz scores <span class="muted small">best attempt</span></h2>
          ${stats.quizScores.length ? `<ul class="bars">${stats.quizScores.map(q => `
            <li><a href="#/week/${q.week}/quiz">W${q.week}</a>${progressBar(q.best, { small: true, label: `Week ${q.week} quiz` })}<span class="mono">${q.best}%</span></li>`).join('')}</ul>`
            : '<p class="muted">No quizzes yet. Each week’s quiz is open-ended — you type answers, compare with the model answer, and grade yourself honestly.</p>'}
        </section>
      </div>

      <section class="card">
        <h2 class="card-title">Recent activity</h2>
        ${activity.length ? `<ul class="feed">${activity.map(a => { const t = activityText(a); return `
          <li><span class="feed-icon" aria-hidden="true">${t.icon}</span><span class="feed-text">${esc(t.text)}</span><time class="muted small" datetime="${esc(a.created_at)}">${timeAgo(a.created_at)}</time></li>`; }).join('')}</ul>`
          : '<p class="muted">Nothing yet — your actions (completions, quizzes, lab steps, logs) will show up here.</p>'}
      </section>`);
    return root;
  };

  // ════════════════ WEEK ════════════════
  Views.week = async function (weekNum, focusSection, current) {
    if (typeof focusSection === 'function') { current = focusSection; focusSection = undefined; }
    loading();
    const data = await App.api.get(`/api/course/${weekNum}`);
    if (!current()) return;
    const w = data.content;
    const W = {
      week: w.week,
      done: Object.fromEntries(SECTION_ORDER.map(s => [s, false])),
      time: Object.fromEntries(SECTION_ORDER.map(s => [s, 0])),
      notes: Object.fromEntries(SECTION_ORDER.map(s => [s, ''])),
      lab: new Set(data.labChecklist.filter(r => r.checked).map(r => r.item_index)),
      quizBest: data.quizBest,
      quiz: { mode: 'answer', answers: App.store.get(`socbc.quizdraft.${w.week}`, []), results: null, grades: [], result: null }
    };
    data.progress.forEach(p => { W.done[p.section] = !!p.completed; W.time[p.section] = p.time_spent_minutes || 0; });
    data.notes.forEach(n => { W.notes[n.section] = n.content || ''; });

    const openKey = `socbc.open.${w.week}`;
    let open = App.store.get(openKey, null);
    if (!open) { const first = SECTION_ORDER.find(s => !W.done[s]) || 'concepts'; open = { [first]: true }; }
    if (focusSection && SECTION_ORDER.includes(focusSection)) open[focusSection] = true;

    const noteLabels = {
      concepts: 'My notes on the concepts', lab: 'Lab notes — commands, findings, screenshots to take',
      quiz: 'Notes on what I got wrong', soc_problem: 'My response / deliverable (draft your answer here)'
    };

    const prev = w.week > 1 ? w.week - 1 : null;
    const next = w.week < data.totalWeeks ? w.week + 1 : null;

    const sectionContent = {
      concepts: () => `
        ${w.concepts.intro ? `<div class="lead">${md(w.concepts.intro)}</div>` : ''}
        <div class="toc">${w.concepts.topics.map((t, i) => `<a href="#" data-action="goto-topic" data-i="${i}">${esc(t.heading)}</a>`).join('')}</div>
        ${w.concepts.topics.map((t, i) => `<article class="topic" id="topic-${i}"><h3>${esc(t.heading)}</h3>${md(t.content)}</article>`).join('')}
        ${w.concepts.fieldNotes.length ? `<aside class="field-notes"><h3>🎯 From the SOC floor</h3><ul>${w.concepts.fieldNotes.map(n => `<li>${UI.inline(n)}</li>`).join('')}</ul></aside>` : ''}`,
      lab: () => `
        <h3 class="lab-title">${esc(w.lab.title)}</h3>
        ${w.lab.intro ? md(w.lab.intro) : ''}
        <div class="lab-progress"><span id="lab-count">${W.lab.size}/${w.lab.steps.length}</span> steps done ${progressBar((W.lab.size / w.lab.steps.length) * 100, { small: true, label: 'Lab steps' })}</div>
        <ol class="steps">${w.lab.steps.map((s, i) => `
          <li class="step${W.lab.has(i) ? ' checked' : ''}">
            <label class="step-check"><input type="checkbox" data-action="lab-step" data-i="${i}" ${W.lab.has(i) ? 'checked' : ''}><span class="box" aria-hidden="true"></span><span class="sr-only">Step ${i + 1} done</span></label>
            <div class="step-body"><span class="step-num">${i + 1}</span>${md(s)}</div>
          </li>`).join('')}</ol>
        ${w.lab.tips ? `<details class="reveal"><summary>💡 Tips, reference commands &amp; solutions</summary><div class="reveal-body">${md(w.lab.tips)}</div></details>` : ''}
        <p class="muted small">Checking every step marks the lab complete automatically.</p>`,
      quiz: () => `<div id="quiz-root">${renderQuiz()}</div>`,
      soc_problem: () => `
        <h3 class="problem-title">🚨 ${esc(w.soc_problem.title)}</h3>
        <div class="scenario">${md(w.soc_problem.scenario)}</div>
        <h4>Your tasks</h4>
        <ol class="tasks">${w.soc_problem.tasks.map(t => `<li>${UI.inline(t)}</li>`).join('')}</ol>
        <div class="deliverable"><strong>Expected deliverable:</strong> ${md(w.soc_problem.deliverable)}</div>
        <p class="muted small">Write your response in the notes box below — it saves automatically. Attempt it fully before opening the model approach.</p>
        ${w.soc_problem.approach ? `<details class="reveal spoiler"><summary>🔓 Show model analyst approach (spoiler)</summary><div class="reveal-body">${md(w.soc_problem.approach)}</div></details>` : ''}`
    };

    function sectionMeta(sec) {
      const bits = [];
      if (sec === 'lab') bits.push(`${W.lab.size}/${w.lab.steps.length} steps`);
      if (sec === 'quiz') bits.push(`${w.quiz.count} questions${W.quizBest ? ` · best ${W.quizBest.best}%` : ''}`);
      if (sec === 'concepts') bits.push(`${w.concepts.topics.length} topics`);
      if (W.time[sec]) bits.push(`⏱ ${fmtMinutes(W.time[sec])}`);
      return bits.join(' · ');
    }

    function renderSection(sec, idx) {
      const running = App.timer.isRunning(w.week, sec);
      return `
      <section class="sec-card card${W.done[sec] ? ' done' : ''}${open[sec] ? ' open' : ''}" id="sec-${sec}" data-section="${sec}">
        <button type="button" class="sec-head" data-action="toggle-sec" aria-expanded="${!!open[sec]}" aria-controls="body-${sec}">
          <span class="sec-check" aria-hidden="true">${W.done[sec] ? '✓' : idx + 1}</span>
          <span class="sec-title">${SECTION_LABELS[sec]}<span class="sec-meta">${esc(sectionMeta(sec))}</span></span>
          <span class="chev" aria-hidden="true">⌄</span>
        </button>
        <div class="sec-body" id="body-${sec}" ${open[sec] ? '' : 'hidden'}>
          <div class="prose">${sectionContent[sec]()}</div>
          <div class="sec-tools">
            <button type="button" class="btn ${W.done[sec] ? 'btn-done' : 'btn-primary'}" data-action="toggle-complete">${W.done[sec] ? '✓ Completed — undo' : 'Mark section complete'}</button>
            <button type="button" class="btn btn-ghost" data-action="timer">${running ? '■ Stop timer' : '⏱ Start timer'}</button>
          </div>
          <div class="notes">
            <label for="note-${sec}">${noteLabels[sec]}</label>
            <textarea id="note-${sec}" data-note="${sec}" rows="${sec === 'soc_problem' ? 14 : 5}" placeholder="Auto-saves as you type…">${esc(W.notes[sec])}</textarea>
            <div class="note-status muted small" id="note-status-${sec}">${W.notes[sec] ? 'Saved' : ''}</div>
          </div>
        </div>
      </section>`;
    }

    // ── Quiz rendering ──
    function renderQuiz() {
      const Q = W.quiz;
      const qs = w.quiz.questions;
      if (Q.mode === 'answer') {
        return `
          <p class="muted">Open-ended questions — answer in your own words as you would in an interview or ticket. Then compare with the model answers and grade yourself honestly. Drafts are kept in this browser.</p>
          <ol class="quiz-list">${qs.map((q, i) => `
            <li class="quiz-q"><div class="q-text">${md(q.question)}</div>
              <textarea data-quiz-answer="${i}" rows="3" aria-label="Answer to question ${i + 1}" placeholder="Your answer…">${esc(Q.answers[i] || '')}</textarea></li>`).join('')}</ol>
          <div class="quiz-actions">
            <button type="button" class="btn btn-primary" data-action="quiz-check">Submit &amp; compare with model answers</button>
            <button type="button" class="btn btn-ghost" data-action="quiz-history">Past attempts</button>
          </div>
          <div id="quiz-history"></div>`;
      }
      if (Q.mode === 'review') {
        const graded = Q.grades.filter(Boolean).length;
        return `
          <p class="muted">Compare your answer with the model answer. The <em>keyword check</em> is only a hint — you decide the grade. Correct = 2 pts, partial = 1.</p>
          <ol class="quiz-list">${Q.results.map((r, i) => `
            <li class="quiz-q review">
              <div class="q-text">${md(r.question)}</div>
              <div class="cmp">
                <div class="cmp-col"><div class="cmp-label">Your answer</div><div class="your-answer">${r.userAnswer ? esc(r.userAnswer).replace(/\n/g, '<br>') : '<span class="muted">(blank)</span>'}</div></div>
                <div class="cmp-col model"><div class="cmp-label">Model answer</div>${md(r.correctAnswer)}</div>
              </div>
              <div class="why"><strong>Why it matters:</strong> ${md(r.explanation)}</div>
              ${r.hint.matched.length || r.hint.missing.length ? `<div class="hint">Keyword check: ${r.hint.matched.map(k => `<span class="kw hit">${esc(k)}</span>`).join('')}${r.hint.missing.map(k => `<span class="kw miss">${esc(k)}</span>`).join('')}
                <span class="muted small">· suggests <strong>${r.hint.suggestion}</strong></span></div>` : ''}
              <div class="grade" role="radiogroup" aria-label="Grade question ${i + 1}">
                ${['correct', 'partial', 'incorrect'].map(g => `<button type="button" role="radio" aria-checked="${Q.grades[i] === g}" class="grade-btn g-${g}${Q.grades[i] === g ? ' active' : ''}" data-action="quiz-grade" data-i="${i}" data-g="${g}">${g === 'correct' ? '✓ Got it' : g === 'partial' ? '◐ Partly' : '✗ Missed'}</button>`).join('')}
              </div>
            </li>`).join('')}</ol>
          <div class="quiz-actions sticky-actions">
            <span class="muted">${graded}/${Q.results.length} graded</span>
            <button type="button" class="btn btn-ghost" data-action="quiz-accept">Use keyword suggestions for ungraded</button>
            <button type="button" class="btn btn-primary" data-action="quiz-save" ${graded < Q.results.length ? 'disabled' : ''}>Save score</button>
          </div>`;
      }
      const r = Q.result;
      return `
        <div class="quiz-result">
          <div class="score-ring" style="--p:${r.percentage}"><span>${r.percentage}%</span></div>
          <div>
            <h3>${r.percentage >= 80 ? 'Strong work.' : r.percentage >= 60 ? 'Solid — review the misses.' : 'Worth another pass.'}</h3>
            <p class="muted">${r.score}/${r.total} points · best ${r.best ? r.best.best : r.percentage}% over ${r.best ? r.best.attempts : 1} attempt(s). Quiz section marked complete.</p>
            <p class="muted small">Tip: write what you missed in the quiz notes below, and revisit the related concept topics.</p>
            <div class="quiz-actions"><button type="button" class="btn btn-primary" data-action="quiz-retry">Retry quiz</button>
            <button type="button" class="btn btn-ghost" data-action="quiz-history">Past attempts</button></div>
          </div>
        </div>
        <div id="quiz-history"></div>`;
    }

    const root = mount(`
      <header class="week-head">
        <div class="week-nav">
          ${prev ? `<a class="btn btn-ghost btn-sm" href="#/week/${prev}" aria-label="Previous week">← W${prev}</a>` : '<span></span>'}
          <span class="eyebrow">Month ${w.month} · ${esc(w.monthTitle)}</span>
          ${next ? `<a class="btn btn-ghost btn-sm" href="#/week/${next}" aria-label="Next week">W${next} →</a>` : '<span></span>'}
        </div>
        <h1>Week ${w.week}: ${esc(w.title)}</h1>
        <div class="week-progress"><span id="week-dots">${sectionDots(W.done)}</span><span id="week-count" class="muted">${Object.values(W.done).filter(Boolean).length}/4 sections complete</span>
          <button type="button" class="btn btn-sm btn-ghost" data-action="expand-all">Expand all</button></div>
      </header>
      <div class="sections">${SECTION_ORDER.map(renderSection).join('')}</div>
      <nav class="week-footer">
        ${prev ? `<a class="btn btn-ghost" href="#/week/${prev}">← Week ${prev}</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-primary" href="#/week/${next}">Week ${next} →</a>` : '<a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>'}
      </nav>`);

    const sectionEl = sec => root.querySelector(`#sec-${sec}`);
    function rerenderSection(sec) {
      const el = sectionEl(sec);
      const ta = el.querySelector('textarea[data-note]');
      if (ta) W.notes[sec] = ta.value;
      el.outerHTML = renderSection(sec, SECTION_ORDER.indexOf(sec));
    }
    function rerenderHeader() {
      root.querySelector('#week-dots').innerHTML = sectionDots(W.done);
      root.querySelector('#week-count').textContent = `${Object.values(W.done).filter(Boolean).length}/4 sections complete`;
    }
    function rerenderQuiz() {
      const q = root.querySelector('#quiz-root');
      if (q) q.innerHTML = renderQuiz();
    }
    function saveOpen() { App.store.set(openKey, open); }

    Views.onTimerChange = () => { if (root.isConnected) SECTION_ORDER.forEach(s => { const b = sectionEl(s).querySelector('[data-action="timer"]'); if (b) b.textContent = App.timer.isRunning(w.week, s) ? '■ Stop timer' : '⏱ Start timer'; }); };

    // ── Notes autosave (1s debounce per section) ──
    const savers = {};
    SECTION_ORDER.forEach(sec => {
      savers[sec] = debounce(async content => {
        const st = root.querySelector(`#note-status-${sec}`);
        try {
          await App.api.post('/api/notes', { week: w.week, section: sec, content });
          W.notes[sec] = content;
          if (st) st.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) { if (st) st.textContent = `Not saved: ${e.message}`; }
      }, 1000);
    });
    const saveQuizDraft = debounce(() => App.store.set(`socbc.quizdraft.${w.week}`, W.quiz.answers), 400);

    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.note) {
        const st = root.querySelector(`#note-status-${t.dataset.note}`);
        if (st) st.textContent = 'Saving…';
        savers[t.dataset.note](t.value);
      } else if (t.dataset.quizAnswer !== undefined) {
        W.quiz.answers[+t.dataset.quizAnswer] = t.value;
        saveQuizDraft();
      }
    });
    // Flush pending note saves when leaving the page.
    const flush = () => SECTION_ORDER.forEach(sec => {
      const ta = root.querySelector(`#note-${sec}`);
      if (ta && ta.value !== W.notes[sec]) savers[sec].flush(ta.value);
    });
    window.addEventListener('hashchange', flush, { once: true });

    root.addEventListener('change', async e => {
      const t = e.target;
      if (t.dataset.action !== 'lab-step') return;
      const i = +t.dataset.i;
      t.disabled = true;
      try {
        const res = await App.api.post('/api/lab/check', { week: w.week, itemIndex: i, checked: t.checked });
        t.checked ? W.lab.add(i) : W.lab.delete(i);
        t.closest('.step').classList.toggle('checked', t.checked);
        root.querySelector('#lab-count').textContent = `${res.checkedCount}/${res.total}`;
        root.querySelector('.lab-progress .progress-fill').style.width = `${(res.checkedCount / res.total) * 100}%`;
        root.querySelector('#sec-lab .sec-meta').textContent = sectionMeta('lab');
        if (res.labCompleted && !W.done.lab) {
          W.done.lab = true;
          toast('All lab steps done — lab marked complete 🎉', 'success');
          rerenderSection('lab'); rerenderHeader();
        }
        App.state.streak = res.streak; App.refreshMeta();
      } catch (err) { t.checked = !t.checked; toast(err.message, 'error'); }
      finally { t.disabled = false; }
    });

    root.addEventListener('click', async e => {
      const el = e.target.closest('[data-action]');
      if (!el || !root.contains(el)) return;
      const sec = el.closest('[data-section]') && el.closest('[data-section]').dataset.section;
      const a = el.dataset.action;

      if (a === 'toggle-sec') {
        open[sec] = !open[sec];
        saveOpen();
        const card = sectionEl(sec);
        card.classList.toggle('open', open[sec]);
        card.querySelector('.sec-body').hidden = !open[sec];
        el.setAttribute('aria-expanded', String(open[sec]));
      } else if (a === 'expand-all') {
        const all = SECTION_ORDER.every(s => open[s]);
        SECTION_ORDER.forEach(s => {
          open[s] = !all;
          const card = sectionEl(s);
          card.classList.toggle('open', open[s]);
          card.querySelector('.sec-body').hidden = !open[s];
          card.querySelector('.sec-head').setAttribute('aria-expanded', String(open[s]));
        });
        el.textContent = all ? 'Expand all' : 'Collapse all';
        saveOpen();
      } else if (a === 'goto-topic') {
        e.preventDefault();
        const t = root.querySelector(`#topic-${el.dataset.i}`);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (a === 'toggle-complete') {
        const to = !W.done[sec];
        el.disabled = true;
        try {
          const res = await App.api.post('/api/progress', { week: w.week, section: sec, completed: to });
          W.done[sec] = to;
          if (to) {
            // collapse finished section, open the next incomplete one
            open[sec] = false;
            const nextSec = SECTION_ORDER.find(s => !W.done[s]);
            if (nextSec) open[nextSec] = true;
            saveOpen();
            SECTION_ORDER.forEach(rerenderSection);
            toast(`${SECTION_LABELS[sec]} complete`, 'success');
            if (Object.values(W.done).every(Boolean)) toast(`Week ${w.week} complete! 🏁`, 'success');
            else if (nextSec) sectionEl(nextSec).scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else rerenderSection(sec);
          rerenderHeader();
          App.state.streak = res.streak; App.refreshMeta();
        } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      } else if (a === 'timer') {
        if (App.timer.isRunning(w.week, sec)) await App.timer.stop();
        else { await App.timer.start(w.week, sec); toast(`Timer started for ${SECTION_LABELS[sec]}`); }
        Views.onTimerChange();
        // refresh time meta
        try {
          const d = await App.api.get(`/api/course/${w.week}`);
          d.progress.forEach(p => { W.time[p.section] = p.time_spent_minutes || 0; });
          SECTION_ORDER.forEach(s => { const m = sectionEl(s).querySelector('.sec-meta'); if (m) m.textContent = sectionMeta(s); });
        } catch { /* ignore */ }
      } else if (a === 'quiz-check') {
        const answers = w.quiz.questions.map((_, i) => W.quiz.answers[i] || '');
        const blank = answers.filter(x => !x.trim()).length;
        if (blank && !(await modal({ title: 'Submit with blank answers?', body: `<p>${blank} question(s) are blank. They’ll be shown with the model answer so you can still learn from them.</p>`, confirmText: 'Submit anyway' }))) return;
        el.disabled = true;
        try {
          const res = await App.api.post(`/api/quiz/${w.week}/check`, { answers });
          W.quiz = { ...W.quiz, mode: 'review', results: res.results, grades: res.results.map(() => null) };
          rerenderQuiz();
          sectionEl('quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      } else if (a === 'quiz-grade') {
        W.quiz.grades[+el.dataset.i] = el.dataset.g;
        const li = el.closest('.quiz-q');
        li.querySelectorAll('.grade-btn').forEach(b => { const on = b === el; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
        const graded = W.quiz.grades.filter(Boolean).length;
        root.querySelector('.sticky-actions .muted').textContent = `${graded}/${W.quiz.results.length} graded`;
        root.querySelector('[data-action="quiz-save"]').disabled = graded < W.quiz.results.length;
      } else if (a === 'quiz-accept') {
        W.quiz.grades = W.quiz.grades.map((g, i) => g || W.quiz.results[i].hint.suggestion);
        rerenderQuiz();
      } else if (a === 'quiz-save') {
        el.disabled = true;
        try {
          const res = await App.api.post(`/api/quiz/${w.week}`, { answers: W.quiz.results.map(r => r.userAnswer), grades: W.quiz.grades });
          W.quiz = { ...W.quiz, mode: 'done', result: res };
          W.quizBest = res.best;
          App.store.del(`socbc.quizdraft.${w.week}`);
          W.done.quiz = true;
          rerenderSection('quiz'); rerenderHeader();
          sectionEl('quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
          App.refreshMeta();
        } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      } else if (a === 'quiz-retry') {
        W.quiz = { mode: 'answer', answers: [], results: null, grades: [], result: null };
        rerenderQuiz();
      } else if (a === 'quiz-history') {
        const box = root.querySelector('#quiz-history');
        if (box.innerHTML) { box.innerHTML = ''; return; }
        try {
          const hist = await App.api.get(`/api/quiz/${w.week}/history`);
          box.innerHTML = hist.length ? `<table class="history"><thead><tr><th>Date</th><th>Score</th><th>✓ / ◐ / ✗</th></tr></thead><tbody>${hist.map(h => {
            const c = g => h.grades.filter(x => x === g).length;
            return `<tr><td>${esc(fmtDate(h.completed_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td><td class="mono">${Math.round((h.score / h.total) * 100)}%</td><td class="mono">${c('correct')} / ${c('partial')} / ${c('incorrect')}</td></tr>`;
          }).join('')}</tbody></table>` : '<p class="muted">No attempts yet.</p>';
        } catch (err) { toast(err.message, 'error'); }
      }
    });

    if (focusSection && SECTION_ORDER.includes(focusSection)) {
      requestAnimationFrame(() => sectionEl(focusSection).scrollIntoView({ block: 'start' }));
    }
    return root;
  };

  // ════════════════ CALENDAR ════════════════
  Views.calendar = async function (selected, current) {
    if (typeof selected === 'function') { current = selected; selected = undefined; }
    const today = todayStr();
    const sel = selected || today;
    const [sy, sm] = sel.split('-').map(Number);
    loading();
    const cal = await App.api.get(`/api/calendar?month=${sm}&year=${sy}`);
    if (!current()) return;
    const days = cal.days;
    const first = new Date(sy, sm - 1, 1);
    const lead = (first.getDay() + 6) % 7;
    const nDays = new Date(sy, sm, 0).getDate();
    const ds = d => `${sy}-${String(sm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const prevM = new Date(sy, sm - 2, 1), nextM = new Date(sy, sm, 1);
    const mStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const monthHours = Object.values(days).reduce((a, d) => a + (d.hours || 0), 0);
    const studyDays = Object.values(days).filter(d => d.hours > 0 || d.activities.some(x => x.action !== 'note_saved')).length;

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell blank"></div>');
    for (let d = 1; d <= nDays; d++) {
      const key = ds(d), info = days[key];
      const lvl = info ? UI.heatLevel(info.hours, info.activities.length) : 0;
      const future = key > today;
      cells.push(`<button type="button" class="cal-cell lvl-${lvl}${key === sel ? ' selected' : ''}${key === today ? ' today' : ''}${future ? ' future' : ''}" data-action="pick-day" data-date="${key}" aria-label="${esc(fmtDate(key))}${info && info.hours ? `, ${info.hours} hours` : ''}">
        <span class="cal-num">${d}</span>
        ${info && info.mood ? `<span class="cal-mood" aria-hidden="true">${MOODS[info.mood] || ''}</span>` : ''}
        ${info && info.hours ? `<span class="cal-hours">${info.hours}h</span>` : ''}
        ${info && info.completions ? `<span class="cal-comp" title="${info.completions} section(s) completed">${info.completions}✓</span>` : ''}
      </button>`);
    }

    const info = days[sel] || { hours: 0, mood: null, topics: '', notes: '', activities: [] };
    const canLog = sel <= today;
    const root = mount(`
      <header class="page-head"><div><p class="eyebrow">Calendar &amp; daily log</p><h1>${esc(first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h1>
        <p class="muted">${monthHours.toFixed(1).replace(/\.0$/, '')}h logged across ${studyDays} study day(s) this month.</p></div>
        <div class="head-actions"><a class="btn btn-ghost" href="#/calendar/${mStr(prevM)}">← Prev</a><a class="btn btn-ghost" href="#/calendar/${today}">Today</a><a class="btn btn-ghost" href="#/calendar/${mStr(nextM)}">Next →</a></div>
      </header>
      <div class="cal-layout">
        <section class="card">
          <div class="cal-grid cal-dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div>${d}</div>`).join('')}</div>
          <div class="cal-grid">${cells.join('')}</div>
          <div class="hm-legend">0h <span class="hm-cell lvl-0"></span><span class="hm-cell lvl-1"></span><span class="hm-cell lvl-2"></span><span class="hm-cell lvl-3"></span><span class="hm-cell lvl-4"></span> 3h+ <span class="muted">· mood emoji · ✓ = completions</span></div>
        </section>
        <aside class="card day-panel">
          <h2 class="card-title">${esc(fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
          ${info.activities.length ? `<ul class="feed compact">${info.activities.map(a => { const t = activityText(a); return `<li><span class="feed-icon" aria-hidden="true">${t.icon}</span><span class="feed-text">${esc(t.text)}</span><span class="muted small">${esc(a.time)}</span></li>`; }).join('')}</ul>` : `<p class="muted">${sel > today ? 'This day hasn’t happened yet.' : 'No app activity recorded this day.'}</p>`}
          ${canLog ? `<form class="form log-form">
            <h3>Daily study log</h3>
            <label>Hours studied<input name="hours" type="number" min="0" max="24" step="0.25" value="${info.hours || ''}" placeholder="e.g. 1.5" required></label>
            <fieldset class="moods"><legend>Mood</legend>${Object.entries(MOODS).map(([k, v]) => `<label class="mood"><input type="radio" name="mood" value="${k}" ${info.mood === k ? 'checked' : ''}><span>${v}<small>${k}</small></span></label>`).join('')}</fieldset>
            <label>Topics covered<input name="topics" value="${esc(info.topics || '')}" placeholder="e.g. KQL joins, Week 6 challenges 8–12"></label>
            <label>Notes<textarea name="notes" rows="3" placeholder="What clicked, what didn’t, what to revisit…">${esc(info.notes || '')}</textarea></label>
            <div class="form-actions"><button class="btn btn-primary" type="submit">${days[sel] && (days[sel].hours || days[sel].mood) ? 'Update log' : 'Save log'}</button>
            ${days[sel] && (days[sel].hours || days[sel].mood) ? '<button type="button" class="btn btn-ghost" data-action="delete-log">Delete</button>' : ''}</div>
          </form>` : ''}
        </aside>
      </div>`);

    root.addEventListener('click', async e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      if (el.dataset.action === 'pick-day') location.hash = `#/calendar/${el.dataset.date}`;
      if (el.dataset.action === 'delete-log') {
        if (!(await modal({ title: 'Delete this day’s log?', body: '<p>This removes the hours, mood and notes for this day.</p>', confirmText: 'Delete', danger: true }))) return;
        try { await App.api.del(`/api/daily-log/${sel}`); toast('Log deleted'); App.refreshMeta(); App.route(); } catch (err) { toast(err.message, 'error'); }
      }
    });
    root.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        const res = await App.api.post('/api/daily-log', { date: sel, hours: Number(f.hours), mood: f.mood || null, topics: f.topics, notes: f.notes });
        App.state.streak = res.streak;
        toast(`Logged ${f.hours}h for ${fmtDate(sel)}`, 'success');
        App.refreshMeta();
        App.route();
      } catch (err) { toast(err.message, 'error'); }
    });
    return root;
  };

  // ════════════════ PROFILE ════════════════
  Views.profile = async function (m, current) {
    loading();
    const u = await App.api.get('/api/me');
    if (!current()) return;
    const root = mount(`
      <header class="page-head"><div><p class="eyebrow">Profile &amp; settings</p><h1>${esc(u.display_name)}</h1>
        <p class="muted">@${esc(u.username)} · member since ${esc(fmtDate(u.created_at))}${u.last_login ? ` · last login ${esc(timeAgo(u.last_login))}` : ''}</p></div></header>
      <div class="settings-grid">
        <section class="card"><h2 class="card-title">Profile</h2>
          <form class="form" id="profile-form">
            <label>Display name<input name="displayName" value="${esc(u.display_name)}" required maxlength="60"></label>
            <label>Email<input name="email" type="email" value="${esc(u.email)}" required></label>
            <label>Boot camp start date<input name="startDate" type="date" value="${esc(u.start_date)}" required></label>
            <label>Weekly study goal (hours)<input name="weeklyGoalHours" type="number" min="1" max="80" value="${u.weekly_goal_hours}" required></label>
            <button class="btn btn-primary" type="submit">Save profile</button>
          </form></section>
        <section class="card"><h2 class="card-title">Change password</h2>
          <form class="form" id="password-form">
            <label>Current password<input name="currentPassword" type="password" required autocomplete="current-password"></label>
            <label>New password <span class="muted">(8+ characters)</span><input name="newPassword" type="password" required minlength="8" autocomplete="new-password"></label>
            <button class="btn btn-primary" type="submit">Update password</button>
          </form></section>
        <section class="card"><h2 class="card-title">Export</h2>
          <p class="muted">Download all your progress, quiz attempts, notes and daily logs as JSON — handy as a backup or as raw material for your portfolio.</p>
          <a class="btn btn-ghost" href="/api/export" download>⬇ Export progress (JSON)</a></section>
        <section class="card danger-zone"><h2 class="card-title">Reset progress</h2>
          <p class="muted">Clears section completions, quiz attempts, lab checklists, activity and streak. Your account stays.</p>
          <label class="check-row"><input type="checkbox" id="reset-notes"> Also delete my notes and daily logs</label>
          <button type="button" class="btn btn-danger" data-action="reset">Reset progress…</button></section>
      </div>`);

    root.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        if (e.target.id === 'profile-form') {
          const res = await App.api.put('/api/profile', { ...f, weeklyGoalHours: Number(f.weeklyGoalHours) });
          App.state.user = res.user;
          toast('Profile saved', 'success');
          root.querySelector('h1').textContent = res.user.display_name;
        } else {
          const pw = await App.api.post('/api/password', f);
          e.target.reset();
          toast(pw.otherSessionsRevoked ? `Password updated — signed out ${pw.otherSessionsRevoked} other session(s)` : 'Password updated', 'success');
        }
      } catch (err) { toast(err.message, 'error'); }
    });
    root.addEventListener('click', async e => {
      if (!e.target.closest('[data-action="reset"]')) return;
      const includeNotes = root.querySelector('#reset-notes').checked;
      const ok = await modal({
        title: 'Reset all progress?', danger: true, confirmText: 'Reset',
        body: `<p>This can’t be undone. ${includeNotes ? '<strong>Notes and daily logs will also be deleted.</strong>' : 'Notes and daily logs are kept.'}</p><label>Type <strong>RESET</strong> to confirm<input id="reset-confirm" autocomplete="off"></label>`
      });
      if (!ok) return;
      const confirm = ok['reset-confirm'];
      try {
        await App.api.post('/api/reset', { confirm, includeNotes });
        Object.keys(localStorage).filter(k => k.startsWith('socbc.')).forEach(k => App.store.del(k));
        toast('Progress reset', 'success');
        App.refreshMeta();
      } catch (err) { toast(err.message, 'error'); }
    });
    return root;
  };

  // ════════════════ RESOURCES ════════════════
  Views.resources = async function (m, current) {
    loading();
    const { markdown } = await App.api.get('/api/resources');
    if (!current()) return;
    return mount(`<header class="page-head"><div><p class="eyebrow">Appendix</p><h1>Resources &amp; quick reference</h1>
      <p class="muted">Free labs, tools, reading and the Event IDs you’ll use every shift.</p></div></header>
      <div class="card prose resources">${md(markdown)}</div>`);
  };

  window.Views = Views;
})();
