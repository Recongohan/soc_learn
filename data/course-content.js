/**
 * Course content loader.
 *
 * Each week lives in data/weeks/weekNN.md as plain Markdown with a few
 * "@@directive" lines that mark structure. That keeps the content easy to
 * read and edit (no JS escaping), while the app gets structured data:
 *
 *   @@week 1                     week number
 *   @@month 1 FOUNDATIONS        month number + month title
 *   @@title Networking ...       week title
 *   @@concepts                   intro text follows
 *   @@topic Heading              a concept topic (markdown body follows)
 *   @@fieldnotes                 "- " bullet list of real-world notes
 *   @@lab Title                  lab intro follows
 *   @@step [text]                one checklist step (markdown)
 *   @@tips                       lab tips / reference solutions (markdown)
 *   @@q [text]                   quiz question
 *   @@answer / @@why             model answer / explanation
 *   @@keywords a, b, c           terms used for the self-check hint
 *   @@problem Title              SOC problem
 *   @@scenario / @@deliverable / @@approach   markdown blocks
 *   @@task text                  one task line
 *
 * Directives inside ``` code fences are ignored.
 */
const fs = require('fs');
const path = require('path');

const WEEKS_DIR = path.join(__dirname, 'weeks');

function parseWeek(source, file) {
  const week = {
    week: null, title: '', month: null, monthTitle: '',
    concepts: { intro: '', topics: [], fieldNotes: [] },
    lab: { title: '', intro: '', steps: [], tips: '' },
    quiz: { questions: [] },
    soc_problem: { title: '', scenario: '', tasks: [], deliverable: '', approach: '' }
  };

  let target = null;          // { obj, key } that free text appends to
  let inFence = false;
  let currentQ = null;

  const setTarget = (obj, key, initial) => {
    if (initial !== undefined) obj[key] = initial;
    target = { obj, key };
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine;
    if (/^\s*```/.test(line)) inFence = !inFence;

    const m = !inFence && line.match(/^@@(\w+)\s*(.*)$/);
    if (!m) {
      if (target) target.obj[target.key] += (target.obj[target.key] ? '\n' : '') + line;
      continue;
    }
    const [, dir, rest] = m;
    const arg = rest.trim();

    switch (dir) {
      case 'week': week.week = parseInt(arg, 10); target = null; break;
      case 'title': week.title = arg; target = null; break;
      case 'month': {
        const [n, ...t] = arg.split(/\s+/);
        week.month = parseInt(n, 10);
        week.monthTitle = t.join(' ');
        target = null;
        break;
      }
      case 'concepts': setTarget(week.concepts, 'intro', arg); break;
      case 'topic': {
        const topic = { heading: arg, content: '' };
        week.concepts.topics.push(topic);
        setTarget(topic, 'content');
        break;
      }
      case 'fieldnotes': {
        const holder = { text: '' };
        week.concepts._fieldNotesRaw = holder;
        setTarget(holder, 'text');
        break;
      }
      case 'lab': week.lab.title = arg; setTarget(week.lab, 'intro', ''); break;
      case 'step': {
        week.lab.steps.push(arg);
        setTarget(week.lab.steps, week.lab.steps.length - 1);
        break;
      }
      case 'tips': setTarget(week.lab, 'tips', arg); break;
      case 'q': {
        currentQ = { question: arg, answer: '', explanation: '', keywords: [] };
        week.quiz.questions.push(currentQ);
        setTarget(currentQ, 'question');
        break;
      }
      case 'answer': setTarget(currentQ, 'answer', arg); break;
      case 'why': setTarget(currentQ, 'explanation', arg); break;
      case 'keywords':
        currentQ.keywords = arg.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        target = null;
        break;
      case 'problem': week.soc_problem.title = arg; target = null; break;
      case 'scenario': setTarget(week.soc_problem, 'scenario', arg); break;
      case 'task': week.soc_problem.tasks.push(arg); target = null; break;
      case 'deliverable': setTarget(week.soc_problem, 'deliverable', arg); break;
      case 'approach': setTarget(week.soc_problem, 'approach', arg); break;
      default:
        throw new Error(`${file}: unknown directive @@${dir}`);
    }
  }

  // Post-process: trim everything, split field notes into an array.
  const trim = s => (s || '').replace(/^\s+|\s+$/g, '');
  week.concepts.intro = trim(week.concepts.intro);
  week.concepts.topics.forEach(t => { t.content = trim(t.content); });
  if (week.concepts._fieldNotesRaw) {
    week.concepts.fieldNotes = week.concepts._fieldNotesRaw.text
      .split(/\n(?=- )/).map(s => trim(s.replace(/^- /, ''))).filter(Boolean);
    delete week.concepts._fieldNotesRaw;
  }
  week.lab.intro = trim(week.lab.intro);
  week.lab.tips = trim(week.lab.tips);
  week.lab.steps = week.lab.steps.map(trim);
  week.quiz.questions.forEach(q => {
    q.question = trim(q.question); q.answer = trim(q.answer); q.explanation = trim(q.explanation);
  });
  for (const k of ['scenario', 'deliverable', 'approach']) week.soc_problem[k] = trim(week.soc_problem[k]);

  validate(week, file);
  return week;
}

function validate(w, file) {
  const errs = [];
  if (!w.week) errs.push('missing @@week');
  if (!w.title) errs.push('missing @@title');
  if (!w.month || !w.monthTitle) errs.push('missing @@month');
  if (!w.concepts.topics.length) errs.push('no concept topics');
  if (!w.lab.title || !w.lab.steps.length) errs.push('lab needs a title and steps');
  if (w.lab.steps.some(s => !s)) errs.push('empty lab step');
  if (!w.quiz.questions.length) errs.push('no quiz questions');
  w.quiz.questions.forEach((q, i) => {
    if (!q.question || !q.answer || !q.explanation) errs.push(`question ${i + 1} incomplete`);
  });
  const p = w.soc_problem;
  if (!p.title || !p.scenario || !p.tasks.length || !p.deliverable) errs.push('soc problem incomplete');
  if (errs.length) throw new Error(`${file}: ${errs.join('; ')}`);
}

function loadCourse() {
  const files = fs.readdirSync(WEEKS_DIR).filter(f => /^week\d+\.md$/.test(f)).sort();
  const weeks = files.map(f => parseWeek(fs.readFileSync(path.join(WEEKS_DIR, f), 'utf8'), f));
  weeks.sort((a, b) => a.week - b.week);
  weeks.forEach((w, i) => {
    if (w.week !== i + 1) throw new Error(`Week numbering gap: expected ${i + 1}, found ${w.week}`);
  });
  return weeks;
}

module.exports = loadCourse();
module.exports.parseWeek = parseWeek;
