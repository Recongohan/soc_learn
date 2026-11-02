/* Reusable UI pieces: escaping, markdown, progress, heatmap, toasts, modals. */
(function () {
  'use strict';

  const SECTION_LABELS = { concepts: 'Concepts', lab: 'Lab', quiz: 'Quiz', soc_problem: 'SOC Problem' };
  const SECTION_ORDER = ['concepts', 'lab', 'quiz', 'soc_problem'];
  const MOODS = { great: '🤩', good: '🙂', okay: '😐', rough: '😣' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Markdown (small, safe subset: input is escaped first) ──
  function inline(text) {
    const codes = [];
    let s = esc(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }

  function renderList(lines) {
    // lines: [{indent, ordered, text}] → nested <ul>/<ol>
    let html = '';
    const stack = [];
    for (const l of lines) {
      while (stack.length && l.indent < stack[stack.length - 1].indent) {
        html += `</li></${stack.pop().tag}>`;
      }
      const top = stack[stack.length - 1];
      if (!top || l.indent > top.indent) {
        const tag = l.ordered ? 'ol' : 'ul';
        stack.push({ indent: l.indent, tag });
        html += `<${tag}><li>`;
      } else {
        html += '</li><li>';
      }
      html += inline(l.text);
    }
    while (stack.length) html += `</li></${stack.pop().tag}>`;
    return html;
  }

  function md(src) {
    if (!src) return '';
    const lines = String(src).replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    const listRe = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        const lang = line.trim().slice(3).trim();
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ''}><button class="copy-btn" data-action="copy-code" type="button">Copy</button><code>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }
      if (!line.trim()) { i++; continue; }
      const hm = line.match(/^(#{1,4})\s+(.*)$/);
      if (hm) { const n = Math.min(hm[1].length + 1, 5); out.push(`<h${n}>${inline(hm[2])}</h${n}>`); i++; continue; }
      if (/^\s*---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^\s*\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const hasHeader = rows.length > 1 && /^[\s|:-]+$/.test(rows[1]);
        let t = '<div class="table-wrap"><table>';
        if (hasHeader) t += '<thead><tr>' + cells(rows[0]).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead>';
        t += '<tbody>' + rows.slice(hasHeader ? 2 : 0).map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
        out.push(t);
        continue;
      }
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(`<blockquote>${md(buf.join('\n'))}</blockquote>`);
        continue;
      }
      if (listRe.test(line)) {
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(listRe);
          if (m) { items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] }); i++; continue; }
          // continuation line of the previous item (indented, non-empty)
          if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length && !/^\s*```/.test(lines[i])) {
            items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue;
          }
          break;
        }
        out.push(renderList(items));
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !listRe.test(lines[i]) && !/^\s*(```|#{1,4}\s|\||>)/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  // ── Small builders ──
  function progressBar(pct, opts = {}) {
    const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    return `<div class="progress ${opts.small ? 'progress-sm' : ''}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"${opts.label ? ` aria-label="${esc(opts.label)}"` : ''}><div class="progress-fill" style="width:${p}%"></div></div>`;
  }

  function sectionDots(sections) {
    return `<span class="dots">${SECTION_ORDER.map(s =>
      `<span class="dot ${sections && sections[s] ? 'on' : ''}" title="${SECTION_LABELS[s]}${sections && sections[s] ? ' ✓' : ''}"></span>`).join('')}</span>`;
  }

  function heatLevel(hours, activity) {
    if (hours >= 3) return 4;
    if (hours >= 2) return 3;
    if (hours >= 1) return 2;
    if (hours > 0 || activity > 0) return 1;
    return 0;
  }

  /** GitHub-style grid: columns = weeks (Mon→Sun rows). */
  function heatmap(days) {
    if (!days || !days.length) return '';
    const first = new Date(days[0].date + 'T00:00:00');
    const lead = (first.getDay() + 6) % 7; // Monday = 0
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="hm-cell hm-empty"></span>');
    for (const d of days) {
      const lvl = heatLevel(d.hours, d.activity);
      const label = `${fmtDate(d.date)} — ${d.hours ? d.hours + 'h' : 'no hours logged'}${d.activity ? `, ${d.activity} actions` : ''}${d.completions ? `, ${d.completions} completed` : ''}`;
      cells.push(`<button type="button" class="hm-cell lvl-${lvl}${d.completions ? ' has-dot' : ''}" data-action="open-day" data-date="${d.date}" title="${esc(label)}" aria-label="${esc(label)}"></button>`);
    }
    return `<div class="heatmap-wrap"><div class="hm-days"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span>Sun</span></div><div class="heatmap">${cells.join('')}</div></div>
      <div class="hm-legend">Less <span class="hm-cell lvl-0"></span><span class="hm-cell lvl-1"></span><span class="hm-cell lvl-2"></span><span class="hm-cell lvl-3"></span><span class="hm-cell lvl-4"></span> More <span class="muted">· dot = section completed</span></div>`;
  }

  // ── Formatting ──
  function fmtDate(d, opts) {
    const dt = d instanceof Date ? d : new Date(String(d).length === 10 ? d + 'T00:00:00' : String(d).replace(' ', 'T'));
    return dt.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function timeAgo(ts) {
    const dt = new Date(String(ts).replace(' ', 'T'));
    const s = Math.round((Date.now() - dt) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
    return fmtDate(dt);
  }
  function fmtMinutes(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function activityText(a) {
    const wk = a.week ? ` · Week ${a.week}` : '';
    switch (a.action) {
      case 'completed': return { icon: '✅', text: `Completed ${SECTION_LABELS[a.detail] || a.detail}${wk}` };
      case 'uncompleted': return { icon: '↩️', text: `Reopened ${SECTION_LABELS[a.detail] || a.detail}${wk}` };
      case 'quiz_completed': return { icon: '📝', text: `Quiz scored ${(a.detail || '').split(': ')[1] || ''}${wk}` };
      case 'lab_checked': return { icon: '🧪', text: `Lab ${String(a.detail || '').toLowerCase()} done${wk}` };
      case 'note_saved': return { icon: '🗒️', text: `Notes on ${SECTION_LABELS[a.detail] || a.detail}${wk}` };
      case 'daily_log': return { icon: '📅', text: `Logged study: ${a.detail}` };
      case 'timer': return { icon: '⏱️', text: `Timed ${(a.detail || '').replace('soc_problem', 'SOC problem')}${wk}` };
      default: return { icon: '•', text: `${a.action}${wk}` };
    }
  }

  // ── Toasts ──
  function toast(msg, type = 'info') {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  // ── Modal ──
  function modal({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">${esc(title)}</h3><div class="modal-body">${body}</div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-m="cancel">${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-m="ok">${esc(confirmText)}</button></div></div>`;
      // Resolves false on cancel, or an object of the modal's input values (keyed by id) on confirm.
      const close = ok => {
        const values = {};
        wrap.querySelectorAll('input[id], textarea[id]').forEach(i => { values[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
        wrap.remove(); document.removeEventListener('keydown', onKey); resolve(ok ? values : false);
      };
      const onKey = e => { if (e.key === 'Escape') close(false); };
      wrap.addEventListener('click', e => {
        if (e.target === wrap || e.target.dataset.m === 'cancel') close(false);
        if (e.target.dataset.m === 'ok') close(true);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-m="ok"]').focus();
    });
  }

  function debounce(fn, ms) {
    let t;
    const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    d.flush = (...args) => { clearTimeout(t); fn(...args); };
    return d;
  }

  window.UI = {
    SECTION_LABELS, SECTION_ORDER, MOODS,
    esc, md, inline, progressBar, sectionDots, heatmap, heatLevel,
    fmtDate, timeAgo, fmtMinutes, todayStr, activityText, toast, modal, debounce
  };
})();
