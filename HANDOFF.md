# SOC Analyst Boot Camp — Full-Stack Training Platform

## HANDOFF BRIEF

Build a localhost web application that serves as a complete 12-week SOC analyst training platform. The user (Recon) is an IT Analyst transitioning into cybersecurity/SOC. This app is his personal training hub — dashboard, course content, labs, quizzes, progress tracking, streaks, calendar, notes, the works.

Everything runs on localhost. Database is local (SQLite). No external auth providers. No cloud services.

---

## TECH STACK

- **Backend:** Node.js + Express
- **Database:** SQLite via better-sqlite3
- **Auth:** bcryptjs for password hashing, express-session for sessions
- **Frontend:** Single-page app — vanilla HTML/CSS/JS (no React, no build step, keep it simple)
- **No external CDNs needed** — self-contained

---

## PROJECT STRUCTURE

```
soc-bootcamp/
├── package.json
├── server.js              # Express server, all API routes
├── database.js            # SQLite setup, schema, all DB operations
├── data/
│   ├── bootcamp.db        # SQLite database (auto-created)
│   └── course-content.js  # All 12 weeks of course content as structured data
├── public/
│   ├── index.html         # SPA shell
│   ├── css/
│   │   └── style.css      # Dark theme, SOC/cyber aesthetic
│   └── js/
│       ├── app.js          # Router, state management, API calls
│       ├── components.js   # Reusable UI components (cards, progress bars, modals)
│       └── views.js        # Each view/page renderer
└── HANDOFF.md
```

---

## DATABASE SCHEMA

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  weekly_goal_hours INTEGER DEFAULT 12,
  start_date DATE
);

-- Section-level progress (4 sections per week: concepts, lab, quiz, soc_problem)
CREATE TABLE progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week INTEGER NOT NULL,
  section TEXT NOT NULL,       -- 'concepts' | 'lab' | 'quiz' | 'soc_problem'
  completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  time_spent_minutes INTEGER DEFAULT 0,
  UNIQUE(user_id, week, section)
);

-- Quiz attempts with answers and scoring
CREATE TABLE quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week INTEGER NOT NULL,
  answers TEXT,                -- JSON array of user answers
  score INTEGER,
  total INTEGER,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Streak tracking
CREATE TABLE streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE
);

-- Activity feed
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,        -- 'completed', 'quiz_completed', 'note_saved', 'lab_checked', 'daily_log'
  detail TEXT,
  week INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lab step-by-step checklist
CREATE TABLE lab_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week INTEGER NOT NULL,
  item_index INTEGER NOT NULL,
  checked INTEGER DEFAULT 0,
  checked_at DATETIME,
  UNIQUE(user_id, week, item_index)
);

-- Personal notes per section
CREATE TABLE user_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  week INTEGER NOT NULL,
  section TEXT NOT NULL,
  content TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week, section)
);

-- Daily study log
CREATE TABLE daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  log_date DATE NOT NULL,
  hours_studied REAL DEFAULT 0,
  topics_covered TEXT,
  mood TEXT,                   -- 'great' | 'good' | 'okay' | 'rough'
  notes TEXT,
  UNIQUE(user_id, log_date)
);
```

---

## API ROUTES

### Auth
- `POST /api/register` — { username, email, password, displayName }
- `POST /api/login` — { username, password }
- `POST /api/logout`
- `GET /api/me` — current user info

### Dashboard
- `GET /api/dashboard` — overall stats, weekly progress array, streak, recent activity

### Course
- `GET /api/course` — list of all 12 weeks (title, month, week number)
- `GET /api/course/:week` — full week content + user's progress for that week + lab checklist + notes + quiz best score

### Progress
- `POST /api/progress` — { week, section, completed (bool), timeSpent (minutes) }

### Quizzes
- `GET /api/quiz/:week` — quiz questions for a week
- `POST /api/quiz/:week` — { answers: [] } → returns score + results with explanations
- `GET /api/quiz/:week/history` — past attempts

### Lab Checklist
- `POST /api/lab/check` — { week, itemIndex, checked (bool) }

### Notes
- `POST /api/notes` — { week, section, content }
- `GET /api/notes/:week`

### Daily Log
- `POST /api/daily-log` — { date, hours, topics, mood, notes }
- `GET /api/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Calendar
- `GET /api/calendar?month=M&year=Y` — calendar heatmap data (days with activity, hours studied)

### Streak
- `GET /api/streak`

### Activity Feed
- `GET /api/activity?limit=20`

---

## FRONTEND VIEWS

### 1. Login / Register Page
- Clean form, toggle between login and register
- Dark theme from the start
- After login → redirect to dashboard

### 2. Dashboard (main landing after login)
This is the most important view. When Recon opens the site, he should immediately know:
- **Where he is** in the course (overall % complete, current week)
- **Streak counter** — current streak (days), longest streak, with a fire emoji or similar
- **Weekly progress grid** — 12 cards (one per week), each showing 4 section dots (concepts/lab/quiz/problem), colored by completion. Click a card → go to that week.
- **This week's focus** — highlight the current recommended week (based on progress)
- **Time spent** — total hours studied
- **Recent activity feed** — last 10 actions
- **Calendar heatmap** — GitHub-style contribution grid showing study days (darker = more hours)
- **Quick actions** — "Continue where you left off" button, "Log today's study" button
- **Quiz scores** — best score per week attempted

### 3. Week View (course content)
When the user clicks into a week, they see:
- **Week header** — "Week 3: Security Fundamentals & MITRE ATT&CK" with month label
- **4 expandable sections**, each with a completion checkbox:
  1. **Concepts** — rendered markdown-like content (headers, bullets, bold)
  2. **Lab** — step-by-step instructions with individual checkboxes per step
  3. **Quiz** — 10 questions, interactive (show one at a time or all at once, user types answers, submit → score + review)
  4. **SOC Problem** — scenario + tasks + expected deliverable description
- **Notes panel** — collapsible sidebar or section where the user can write notes per section (auto-saves)
- **Mark Complete** buttons per section
- **Navigation** — previous week / next week arrows

### 4. Quiz View (interactive)
- Show question number and text
- Text input for answer (these are open-ended questions, not multiple choice)
- Submit all → show results with correct answers and explanations
- Score summary
- Option to retry
- History of past attempts

### 5. Calendar View
- Monthly calendar grid
- Each day shows: hours studied (color intensity), mood emoji if logged, number of completions
- Click a day → see what was done that day
- Daily log form: hours studied, topics covered, mood selector, notes

### 6. Profile / Settings
- Display name, email, start date
- Weekly goal (hours)
- Reset progress option (with confirmation)
- Export progress as JSON

### 7. Sidebar Navigation (always visible)
- Dashboard
- Weeks 1–12 (grouped by month: Foundations / SIEM & Detection / IR & Job Readiness)
- Calendar
- Profile
- Logout
- Current streak badge

---

## UI/UX REQUIREMENTS

### Theme: Dark, SOC/Cyber aesthetic
- Background: near-black (#0a0a0f or similar)
- Cards/panels: dark gray (#1a1a2e)
- Accent color: electric blue (#00d4ff) or green (#00ff88) — pick one, use it for progress, active states, CTAs
- Text: white (#e0e0e0) for body, brighter white for headings
- Code blocks: slightly different dark bg with monospace font
- Subtle borders, no harsh contrasts
- Clean, minimal — think security operations center UI, not a colorful learning platform

### Progress visualization
- Week cards: 4 dots per card (one per section), hollow when incomplete, filled when done
- Overall progress bar at top of dashboard
- Section completion: checkbox + subtle color change when marked complete
- Streak: prominent number with "🔥" or similar, shown in sidebar and dashboard

### Responsive
- Works on desktop (primary) and tablet
- Sidebar collapses on smaller screens

### Typography
- System font stack or Inter/JetBrains Mono for code
- Content sections should be comfortable to read (max-width ~800px for text)

---

## COURSE CONTENT (ALL 12 WEEKS)

The course content lives in `data/course-content.js` as a structured array. Each week has this shape:

```js
module.exports = [
  {
    week: 1,
    title: "Networking Fundamentals for SOC",
    month: 1,
    monthTitle: "FOUNDATIONS",
    concepts: {
      intro: "You can't triage alerts if you don't understand what's moving across the wire.",
      topics: [
        { heading: "OSI Model", content: "Focus on Layers 3 (Network), 4 (Transport), 7 (Application)" },
        // ...
      ]
    },
    lab: {
      title: "Build a Packet Capture Station",
      steps: [
        "Install Wireshark on your machine",
        "Capture 5 minutes of your own network traffic",
        // ...
      ]
    },
    quiz: {
      questions: [
        {
          question: "A user reports a website isn't loading. You see DNS queries going out but no responses. What layer of the OSI model is the problem most likely at, and what would you check first?",
          answer: "Layer 3 (Network) or Layer 7 (Application). Check DNS server reachability, verify DNS resolution with nslookup/dig, check firewall rules blocking port 53.",
          explanation: "DNS operates at the Application layer but relies on network connectivity. No DNS responses could mean the DNS server is unreachable (network) or the DNS service itself is down (application)."
        },
        // ...
      ]
    },
    soc_problem: {
      title: "The Suspicious DNS Traffic",
      scenario: "You're a Tier 1 SOC analyst on the morning shift. An automated alert fires: 'High volume DNS queries from endpoint WORKSTATION-47 to non-standard DNS servers.' ...",
      tasks: [
        "Write down your first 3 investigation steps",
        // ...
      ],
      deliverable: "A written investigation note (half a page) covering steps taken, findings, assessment, and recommendation."
    }
  },
  // ... weeks 2-12
];
```

### FULL CONTENT FOR ALL 12 WEEKS — copy from the doc at this link, which has the complete content:
**Claude Doc:** https://claude.ai/artifact/YXnxbtXzRp57vXaog6V4VX

Here's a summary of what each week covers so you can structure the data:

#### MONTH 1 — FOUNDATIONS

**Week 1: Networking Fundamentals for SOC**
- Concepts: OSI model (focus L3/L4/L7), TCP/IP, DNS (tunneling, DGA), HTTP/HTTPS, common ports (22/25/53/80/443/3389/445), DHCP/ARP, subnetting/CIDR
- Lab: Build a Packet Capture Station — install Wireshark, capture traffic, filter DNS/HTTP/TCP handshake, export .pcap, bonus tcpdump on Linux
- Quiz: 10 questions — DNS troubleshooting, TCP vs UDP, suspicious port 4444, 3-way handshake, DGA domains, private vs public IP, port 445 traffic, ARP abuse, CIDR /24, Wireshark filters
- SOC Problem: "The Suspicious DNS Traffic" — 3200 DNS queries/hr from WORKSTATION-47 to non-standard DNS server, investigate and write escalation note

**Week 2: Windows & Linux Internals for SOC**
- Concepts: Windows Event Logs (Security/System/Sysmon), critical Event IDs (4624/4625/4648/4672/4688/4720/7045), services/processes, registry run keys, scheduled tasks, PowerShell logging (4104), Defender logs. Linux: auth.log, syslog, ps/top/proc, cron, netstat/ss, SUID, bash_history
- Lab: Build Windows+Linux home lab — Win VM with Sysmon (SwiftOnSecurity config) + PS logging, Ubuntu Server with auditd, generate suspicious activity on both, find all events in logs
- Quiz: 10 questions — 47 failed logins in 2 min, what is Sysmon, malware persistence locations, process chains, backdoor user detection, auth.log vs syslog, encoded PowerShell, SUID, suspicious service, Linux network inspection
- SOC Problem: "The New Admin Account" — 2AM alert, new admin account on SERVER-DB-03, created by help desk user who shouldn't have server access

**Week 3: Security Fundamentals & MITRE ATT&CK**
- Concepts: CIA Triad, AAA, Least Privilege, Defense in Depth, threat types. Cyber Kill Chain (7 stages). MITRE ATT&CK (14 tactics, techniques, sub-techniques, mapping to SIEM detection). Common attack patterns (phishing→macro→PS→persistence→C2, credential stuffing→lateral movement, exploit→webshell→privesc)
- Lab: Map APT29 to ATT&CK, complete TryHackMe MITRE room, map a 6-step phishing attack chain to ATT&CK with Event IDs
- Quiz: 10 questions — ransomware CIA impact, tactic vs technique, phishing kill chain stage, 3 persistence techniques, Discovery tactic (whoami/net user), Defense in Depth example, stolen VPN creds mapping, APT vs opportunistic, Invoke-Mimikatz mapping, Actions on Objectives controls
- SOC Problem: "The Phishing Campaign" — 23 emails, 5 clicked, 2 entered creds, map to kill chain + ATT&CK, containment plan, notification email

**Week 4: Log Analysis & Event Correlation**
- Concepts: Log sources (Windows/firewall/proxy/email/EDR/cloud audit/VPN/DNS), event correlation (time-based, entity-based), analysis techniques (baselining, stacking, timelining, pattern matching)
- Lab: Generate attack chain on Windows VM (browser→PS→scheduled task→new user→recon commands), then investigate own attack, build timeline, write investigation summary
- Quiz: 10 questions — firewall outbound traffic next check, email hack 3 log sources, log vs alert, SSH brute force correlation rule, log baselining, data exfiltration log sources, real-time vs retrospective, PowerShell alert context from other sources, recurring 03:00 HTTPS pattern, lateral movement logs
- SOC Problem: "The After-Hours Data Transfer" — 2.3GB upload from intern's laptop at 01:00-03:00, intern left building at 18:30, VPN from different city, correlate 4+ log sources

#### MONTH 2 — SIEM & DETECTION

**Week 5: Microsoft Sentinel Deep Dive**
- Concepts: Sentinel architecture (Log Analytics Workspace, data connectors, tables), key components (analytics rules types: Scheduled/Microsoft Security/Fusion/NRT, workbooks, playbooks/Logic Apps, hunting queries, watchlists, entity mapping, MITRE coverage). SC-200 vs job requirements gap.
- Lab: Deploy Sentinel — Azure free account, Log Analytics Workspace, connect Azure AD + M365, ingest custom data from home lab VM, create "Multiple Failed Sign-ins Followed by Success" analytics rule with KQL + entity mapping, trigger and investigate
- Quiz: 10 questions — Log Analytics Workspace relationship, 4 analytics rule types, Palo Alto log ingestion, alert vs incident, entity mapping purpose, cost reduction (3 ways), playbooks/Logic Apps, watchlists for IOC lists, Scheduled vs NRT, troubleshooting empty data connector
- SOC Problem: "The Sentinel Deployment Gap" — only 3 default rules enabled, 4/14 ATT&CK tactics covered, pick 5 uncovered techniques, write detection rules including 2 in KQL, prioritize deployment

**Week 6: KQL Mastery**
- Concepts: Fundamentals (where, project, extend, summarize, sort, top, join, let, render, ago), intermediate (make_set/make_list, mv-expand, parse, bin, arg_max/arg_min, iff, has vs contains, externaldata), advanced (make-series, prev/next, TI lookups, detection rule pattern)
- Lab: 20 KQL challenges — Beginner (1-7): failed sign-ins, top users, foreign sign-ins, VPN IPs, Event 4720, timechart, PS from Sysmon. Intermediate (8-14): multi-country sign-ins, impossible travel, failed→success correlation, watchlist join, Syslog parsing, unusual process paths, top DNS domains. Advanced (15-20): brute force detection, data exfil >100MB, lateral movement 5+ hosts, time-series anomaly, Azure AD group change rule, Base64 PowerShell decode
- Quiz: 10 questions — has vs contains, top 5 firewall deny IPs, make_set output, watchlist join, inner vs leftouter join, prev() for consecutive failures, bin(1h) in detection, noisy rule tuning, arg_max purpose, after-hours sign-in query
- SOC Problem: "The Noisy Alert" — "Failed sign-in from foreign IP" fires 150+/day, analyze 30 days, identify FP patterns, rewrite KQL with watchlist exclusions, before/after metrics

**Week 7: Splunk Fundamentals**
- Concepts: Architecture (forwarders→indexers→search heads, events, indexes, sourcetypes), SPL essentials (stats, eval, where, table, timechart, transaction, lookup, rex, dedup, eventstats), Splunk for SOC (correlation searches, notable events, RBA, CIM, dashboards)
- Lab: Install Splunk Free, ingest Windows events + BOTS v1 dataset, write 10 SPL queries, build 4-panel SOC dashboard (failed logins timechart, top attacking IPs, new accounts, suspicious processes)
- Quiz: 10 questions — stats vs eventstats, top 5 failed login SPL, sourcetype purpose, CIM importance, transaction SPL, RBA vs threshold alerting, threat intel in Splunk, eval business hours, Splunk editions, search optimization (3 ways)
- SOC Problem: "The BOTS Challenge" — 10 investigation questions using BOTS v1 dataset (target company, web server IP, attacker IP, scanning tool, web shell, commands, exfiltration, timeline, ATT&CK mapping, incident report)

**Week 8: Threat Detection & Alert Triage**
- Concepts: Triage workflow (6 steps), classification (TP/BTP/FP/FN), triage decision factors (asset criticality, user context, time, volume, TI match, history), playbooks (definition, common types, structure)
- Lab: Write 5 complete playbooks — Brute Force, Phishing Email, Malware from EDR, Impossible Travel, Suspicious PowerShell
- Quiz: 10 questions — vuln scanner BTP classification, correlating 3 related alerts, 11PM domain admin add, playbook vs IR plan, 500 alerts/day prioritization, pentest classification, missed TP postmortem, brute force escalation criteria, "zero FP" fallacy, data exfil playbook steps
- SOC Problem: "The 3 AM Shift" — 6 sequential alerts over 20 minutes (failed VPN→success→PowerShell→SMB→850MB download), all tied to HR manager who never works after hours, triage all 6, tell the story, MITRE map, immediate actions, escalation message

#### MONTH 3 — IR & JOB READINESS

**Week 9: Incident Response Workflow**
- Concepts: NIST SP 800-61 (4 phases), containment strategies (short-term/long-term, observe vs contain tradeoff, evidence preservation), eradication (remove malware/persistence/vulns/credentials), recovery (clean backups, gold images, phased restoration), severity levels (P1-P4), communication (internal chain, regulatory: GDPR 72hr / DIFC, "breach" word control, documentation)
- Lab: Full IR exercise — Ransomware on 3 finance workstations, execute all 4 NIST phases with time boxes, write full incident report using provided template (Incident ID, Executive Summary, Timeline table, Scope, RCA, ATT&CK mapping, containment/eradication steps, recovery status, lessons learned, recommendations)
- Quiz: 10 questions — 4 NIST phases, isolating developer machine with SSH to prod, containment vs eradication, ransom payment factors, disk imaging + chain of custody, post-eradication steps, GDPR notification, documentation importance, event vs incident vs breach, lessons-learned meeting topics
- SOC Problem: "The Compromised Service Account" — svc_sqlbackup RDP'd to 14 servers in 8 minutes (never uses RDP, password 11 months old), Friday 16:00 most IT gone, full NIST lifecycle response

**Week 10: Malware Analysis & Forensics Basics**
- Concepts: Malware types (ransomware, trojan, RAT, worm, rootkit, fileless, cryptominer, infostealer), static analysis (hashes, file type/magic bytes, strings, PE headers, YARA, metadata), dynamic analysis (sandbox: ANY.RUN/Joe/Hybrid Analysis, observe processes/files/registry/network/persistence), IOCs (hashes, IPs, domains, file paths, registry, mutex, user agents, email indicators), forensics (disk imaging with FTK Imager, memory analysis with Volatility, timeline analysis with MACB, chain of custody)
- Lab: 3 samples — (1) analyze ANY.RUN public report of Word macro dropper, extract IOCs, ATT&CK mapping; (2) static analysis of infostealer from MalwareBazaar (hash, VirusTotal, strings, PE headers, write YARA rule); (3) Volatility memory forensics on practice dump (imageinfo, pslist, netscan, malfind, dump suspicious processes, write findings report)
- Quiz: 10 questions — first step before analysis, static vs dynamic, invoice.pdf.exe social engineering, 0/70 VT detection, fileless malware, Volatility process analysis, YARA rules, getting hash without releasing quarantine, IOC vs TTP, chain of custody
- SOC Problem: "The Cryptominer" — 8 engineering machines at 95% CPU overnight, svchost32.exe from C:\Users\Public\Downloads\, connects to xmr mining pool. Static triage, hash analysis, ATT&CK mapping, scope query (KQL/SPL), eradication plan, infection vector hypotheses, IOC list, incident report

**Week 11: Real-World SOC Simulation**
- 5-day simulation, 2-3 hours per "shift" each day
- Day 1 (Monday): 12-alert backlog queue (failed VPN logins, PS encoded command, malware quarantined, USB, Exchange failures, account lockout, AV disabled, large email attachment, TOR connection, Defender exclusion). Alerts 1-4 are related — can the user see it?
- Day 2 (Tuesday): Phishing wave — 3 reports + 8 more received same email, cloned M365 login page. Full phishing response.
- Day 3 (Wednesday): False positive flood — 89 alerts, 18 of first 20 are FP from misconfigured rule. Find the real threats buried in noise. Propose rule fix.
- Day 4 (Thursday): Insider threat — departing finance employee, HR requests investigation. Build 30-day activity profile, find 2400-file USB download, navigate ethical/legal boundaries.
- Day 5 (Friday): Live ransomware on FILE-SERVER-02 at 14:00. Execute playbook under time pressure, real-time comms, scope blast radius, initial IR report, weekend handover.
- End-of-week metrics tracking (total alerts, avg triage time, TP rate, FP rate, incidents escalated, reports written, playbooks used, rules to tune)

**Week 12: Portfolio, CV & Interview Prep**
- GitHub portfolio structure: /detection-rules (10 KQL + 5 SPL), /incident-reports (3 polished), /playbooks (5 from Week 8), /lab-setup (architecture diagram + guides), /yara-rules, README.md
- SOC CV: structure (summary, certs, skills, experience reframed for security, projects with GitHub links, education), rules (no generic phrases, verb+result bullets, honest about lab vs production experience)
- Top 20 interview questions: 15 technical (phishing investigation walkthrough, IDS vs IPS, MITRE ATT&CK, Kill Chain, Event ID 4625 triage, DNS abuse, lateral movement, KQL vs SPL, false positive handling, vuln scan vs pentest, NIST IR, SIEM explained, data exfil detection, IOC vs IOA, suspicious process analysis) + 5 behavioral (FP that was nothing, 3AM P1 alone, staying current, disagreeing with senior, why SOC)
- Lab: Mock interview day — record yourself answering all 20, review, STAR method for behavioral
- SOC Problem: "The Job Application" — tailor CV to a real Dubai SOC posting, cover letter, 3 talking points connecting service desk to SOC, gap analysis

---

## QUIZ IMPLEMENTATION NOTES

Quizzes are open-ended (not multiple choice). The user types their answer. Since these can't be auto-graded perfectly, the approach is:
1. User types their answer for each question
2. On submit, show the model answer + explanation alongside the user's answer
3. User self-grades each question (correct / partially correct / incorrect)
4. Score is recorded based on self-assessment
5. This teaches more than auto-grading — they compare their thinking to the expected answer

Alternative: for some questions, add keyword-based partial matching (if answer contains "lateral movement" AND "RDP" → likely correct) as a hint, but always show the model answer.

---

## STREAK LOGIC

- A "study day" counts when the user either: marks any section complete, submits a quiz, checks a lab item, or logs daily study time
- Streak increments by 1 for each consecutive day with activity
- Missing a day resets streak to 0 (next activity starts at 1)
- Show: current streak, longest streak ever, total study days

---

## CALENDAR HEATMAP

- GitHub-style grid showing the last 90 days (or current month view)
- Color intensity based on hours studied that day (0h = empty, 1h = light, 2h = medium, 3h+ = full)
- Days with completions get a small dot indicator
- Click a day → shows activity for that day

---

## KEY UX DETAILS

1. **"Continue where I left off"** — dashboard button that takes user to the first incomplete section of their current week
2. **Auto-save notes** — debounced (save 1 second after typing stops)
3. **Week locking** — weeks are NOT locked. User can jump to any week. But the dashboard highlights the recommended next week.
4. **Time tracking** — optional per-section timer. User can start/stop. Time is saved to progress.
5. **SOC Problem deliverables** — the user writes their response in a text area within the app. It saves as a note. They can also mark the problem as "complete" when they're satisfied with their work.
6. **Lab steps** — each numbered step has its own checkbox. Checking all steps auto-marks the lab section as complete.

---

## FILES ALREADY STARTED

I've already created these files in the project directory (you can use, modify, or rewrite them):
- `package.json` — dependencies defined
- `server.js` — Express server with all API routes defined
- `database.js` — full SQLite schema + all DB operations

These are functional and tested. The missing pieces:
1. `data/course-content.js` — needs ALL 12 weeks of content structured as the schema above
2. `public/index.html` — SPA shell
3. `public/css/style.css` — full dark theme
4. `public/js/app.js` — frontend router + state + API
5. `public/js/views.js` — all view renderers
6. `public/js/components.js` — reusable UI pieces

---

## INSTALL & RUN

```bash
cd soc-bootcamp
npm install
npm start
# → http://localhost:3000
```

---

## PRIORITY ORDER FOR BUILDING

1. Course content data file (the backbone — everything depends on this)
2. HTML shell + CSS theme
3. Auth views (login/register)
4. Dashboard view
5. Week/course view with section rendering
6. Quiz interactive view
7. Lab checklist
8. Progress tracking + streak display
9. Calendar heatmap
10. Notes system
11. Daily log
12. Profile/settings
13. Polish and testing
