@@week 12
@@month 3 IR & JOB READINESS
@@title Portfolio, CV & Interview Prep

@@concepts
Eleven weeks of work only counts if a hiring manager can **see** it. This week turns your labs into a portfolio, your experience into a SOC CV, and your knowledge into confident 2-minute interview answers. The quiz this week is the **Top 20 SOC interview questions** — answer each out loud before revealing the model answer.

@@topic Build your SOC portfolio on GitHub
Create a public repo **`SOC-Analyst-Portfolio`**:
```
SOC-Analyst-Portfolio/
├── README.md                 # 2-line bio, skills, table of contents
├── detection-rules/
│   ├── kql/                  # 10 rules, one .kql file each
│   └── spl/                  # 5 correlation searches, .spl
├── incident-reports/         # 3 polished reports (NIST format)
├── playbooks/                # 5 playbooks from Week 8 (.md)
├── lab-setup/                # architecture diagram + Sentinel/Splunk/Sysmon guides
├── yara-rules/
└── hunting/                  # optional: hunting queries + findings
```
**Each detection rule file should include a header:**
```kql
// Name:        Password spraying against Entra ID
// MITRE:       TA0006 Credential Access / T1110.003
// Data source: SigninLogs
// Description: One IP failing against ≥15 distinct users in 30 minutes
// Severity:    Medium (High if followed by a success)
// FP notes:    Corporate NAT/VPN egress → excluded via watchlist 'EgressIPs'
// Tested:      Lab tenant, 2026-11-01 — triggered on simulated spray of 20 users
SigninLogs
| ...
```
- Present it as a **professional's working toolkit**, not a student project: consistent formatting, no secrets, no real company names/IPs, sanitised screenshots.
- Pin it on your GitHub profile, link it from your CV and LinkedIn. Commit regularly — activity graphs get noticed.

@@topic Build your SOC CV
Keep two CVs: service desk/IT and **SOC/security**. The SOC CV frames everything through a security lens.

**Structure:**
1. Name, contact, LinkedIn, **GitHub portfolio link**.
2. **Professional summary** (3 lines): *"IT professional with hands-on SOC experience in Microsoft Sentinel, Splunk, KQL and incident response. SC-200 certified; MSc Cybersecurity. Built and tuned detection rules covering 25 MITRE ATT&CK techniques in a home SIEM lab."*
3. **Certifications:** SC-200, other Microsoft certs, MSc Cybersecurity (and any in-progress, with dates).
4. **Technical skills:** SIEM (Sentinel, Splunk ES), KQL, SPL, Defender XDR, incident response (NIST), MITRE ATT&CK, threat intelligence, Windows/Linux log analysis, Sysmon, Wireshark, PowerShell, Entra ID, YARA, Volatility.
5. **Experience — reframed for security:** every service-desk task has a security angle:
   - "Managed identity and access lifecycle (joiners/movers/leavers) for 1,200 users in Entra ID, enforcing least privilege and removing stale access."
   - "Triaged and escalated 40+ suspected phishing reports per month, resetting compromised credentials and coordinating with the security team."
   - "Administered MFA enrolment and Conditional Access exceptions, reducing MFA-related tickets by 30%."
6. **Projects:** the portfolio, with 2–3 specific detections/investigations (what, tool, result).
7. **Education:** MSc Cybersecurity, BTech CS.

**Rules:** no generic phrases ("detail-oriented team player"); **every bullet = verb + what + result/metric**; say "hands-on lab experience" if you haven't worked in a SOC — **never fabricate**; ATS-friendly (plain layout, keywords from the job ad: SIEM, KQL, Sentinel, incident response, MITRE ATT&CK).

@@topic Answering interview questions
- **Technical (2 minutes each):** define → explain how it works → give a **concrete example** from your lab or work → mention tools/queries → link to SOC impact.
- **Behavioural — STAR:** **S**ituation (1–2 sentences), **T**ask (your responsibility), **A**ction (what *you* did — the longest part), **R**esult (outcome + what you learned, with numbers where possible).
- If you don't know: say how you'd find out ("I'd check the ATT&CK page and our runbook, and test it in the lab"). Honesty beats bluffing — interviewers probe.
- Prepare a 60-second **"tell me about yourself"**: service desk → security-relevant work → MSc + SC-200 → the 12-week lab programme → why this SOC.
- **UAE/Gulf tips:** many SOCs are MSSPs serving multiple clients (rotating shifts are common — say you're comfortable with them); regulated sectors (banking, government) value knowledge of local frameworks (UAE IA/NESA standards, the Central Bank's requirements, DESC ISR in Dubai) — reading their summaries is a cheap differentiator.

@@topic Questions to ask your interviewer
- "What SIEM platform does your SOC use and what's your current detection coverage?"
- "What does a typical day look like for a Tier 1 analyst here — how many alerts per analyst per shift?"
- "How are analysts trained and how does career progression to Tier 2 / detection engineering work?"
- "What does success look like in the first 90 days?"

@@fieldnotes
- Hiring managers spend seconds on a CV — the GitHub link and the first 3 lines decide whether they read on.
- One great, well-documented detection with a test case beats twenty copied templates.
- Record yourself. Most people discover they say "basically" every sentence or answer for 4 minutes.
- Apply before you feel "ready" — interviews are practice too, and job ads list wishes, not hard requirements.

@@lab Mock Interview Day
Do this in one sitting if you can — it simulates interview-day pressure.

@@step
Set a timer and answer **all 20 questions** in this week's quiz **out loud**, recording yourself on your phone. Don't read the model answers first.

@@step
Listen back. Flag any answer **under 30 seconds** (too thin) or **over 3 minutes** (rambling). Note filler words.

@@step
For each **technical** question, verify your answer against your notes and the model answer. Rewrite weak answers as 5-bullet outlines.

@@step
For each **behavioural** question (16–20), write a STAR outline using a real story from your service-desk or lab experience.

@@step
Prepare your 60-second "tell me about yourself" and record it 3 times until it's natural.

@@step
Prepare **3 questions** to ask your interviewer (use the Concepts list as a start).

@@step
Do a second full recording a few days later and compare — note your improvement in the notes panel.

@@step
**Portfolio sprint:** create the `SOC-Analyst-Portfolio` repo with the folder structure, README, at least 5 detection rules, 2 playbooks and 1 incident report pushed.

@@tips
**STAR example (Q16 — "something that turned out to be nothing"):**
- *S:* On the service desk, several users reported their accounts locking out every morning.
- *T:* I needed to find out whether it was an attack or a configuration issue before escalating to security.
- *A:* I pulled the 4740 lockout events, identified the caller computer, and found the 4625 failures came from one shared PC where an old mapped drive used a cached password. I documented the evidence and checked no external IPs were involved.
- *R:* It was a stale credential, not an attack — fixing it stopped ~15 tickets a week. I learned to gather evidence before assuming the worst, and I still escalated with my evidence so security could confirm.

@@q
Walk me through how you'd investigate a phishing alert.
@@answer
1. **Read the alert / report** — who reported, when, how many recipients.
2. **Analyse the email** — sender and Return-Path, SPF/DKIM/DMARC results, Received headers (sending IP), reply-to mismatch, subject/urgency cues; **links** (expand, URLScan, domain age/reputation) and **attachments** (hash lookup, sandbox) — without clicking on my workstation.
3. **Scope** — message trace for the same sender/subject/URL/hash: how many received it.
4. **Impact** — who clicked (Safe Links/proxy logs), who submitted credentials or ran the attachment (sign-in logs from new IPs, EDR process events).
5. **Contain** — purge emails from all mailboxes, block sender/domain/URL/IP, reset passwords **and revoke sessions** for affected users, isolate any infected endpoint.
6. **Check post-compromise** — inbox rules, MFA changes, OAuth consents, internal phishing from the account.
7. **Document & improve** — ticket with IOCs and MITRE (T1566), notify users, tune detections.
@@why
Mention specific tools (Defender for Office 365 Threat Explorer, message trace, URLScan, VirusTotal) and a real example from your lab/Week 3.
@@keywords header, spf, dkim, link, attachment, scope, click, purge, reset, revoke

@@q
What's the difference between an IDS and an IPS?
@@answer
An **IDS (Intrusion Detection System)** monitors traffic (or host activity) and **alerts** on suspicious patterns — it's passive, usually deployed out-of-band on a SPAN/tap, so it can't stop traffic. An **IPS (Intrusion Prevention System)** sits **inline** and can **block/drop** malicious traffic in real time, in addition to alerting. Trade-off: IPS false positives can block legitimate business traffic and add latency/a failure point, so rules are tuned carefully; IDS has no impact on traffic but needs someone to respond. Both use signatures (e.g. Snort/Suricata rules) and/or anomaly detection; modern NGFWs include IPS functionality. Host-based versions: HIDS/HIPS.
@@why
Bonus: SOC analysts mostly consume IDS/IPS alerts in the SIEM — know that a "blocked" IPS alert still deserves a look at the source host.
@@keywords detect, alert, passive, inline, block, prevent

@@q
Explain the MITRE ATT&CK framework and how you use it.
@@answer
MITRE ATT&CK is a **globally used knowledge base of adversary behaviour** based on real-world observations, organised into **14 tactics** (the attacker's goals, from Reconnaissance to Impact), **techniques/sub-techniques** (how they achieve them, e.g. T1059.001 PowerShell), and procedures by known **groups** and **software**. How I use it: **map alerts and incidents** to techniques so everyone shares a language and reports are consistent; **assess detection coverage** (e.g. the Sentinel MITRE page / ATT&CK Navigator) to find gaps and prioritise new rules; **threat-informed defence** — look up the TTPs of groups targeting our sector and check we can detect them; and **hunting** — build hypotheses per technique. Example: in my lab I mapped a phishing → PowerShell → scheduled task → C2 chain to six techniques and wrote detections for the earliest ones.
@@why
Show you've used it practically, not just read about it.
@@keywords tactics, techniques, knowledge base, map, coverage, gap, hunt

@@q
What is the Cyber Kill Chain? At which stage is detection most effective?
@@answer
Lockheed Martin's model of an intrusion in **7 stages**: Reconnaissance → Weaponization → Delivery → Exploitation → Installation → Command & Control → Actions on Objectives. Breaking any link stops the attack. Detection is most **effective/cheapest as early as possible** — realistically at **Delivery** (email gateway, web filtering) and **Exploitation/Installation** (EDR behaviour, macro → PowerShell detections), before C2 is established and well before Actions on Objectives. However, "most effective" in practice also means layered: early stages are where you can *prevent*, while C2 and lateral-movement detections catch what slipped through.
@@why
Add that ATT&CK is more granular and better for detection engineering, while the Kill Chain is useful for explaining progression to non-technical stakeholders.
@@keywords seven, delivery, exploitation, installation, early, break

@@q
You see Event ID 4625 firing 100 times in a minute. Walk me through your triage.
@@answer
1. **Understand the pattern:** one account or many (brute force vs spraying)? One source or many? Check `Logon Type` (3 network, 10 RDP), `Status/SubStatus` (bad password vs unknown user), `Workstation Name` and `Source Network Address`.
2. **Source:** internal or external? If internal — which host and process (could be a misconfigured service with an old password)? If external — reputation, geo, is RDP/SMB exposed to the internet?
3. **Target:** privileged or service account? Critical server/DC?
4. **Outcome:** any **4624 success** from the same source/for the same account afterwards? Any **4740 lockouts**?
5. **Context:** other alerts for the source/target, change windows, known scanners.
6. **Act:** if benign (stale credentials) → fix with the owner and close as BTP; if malicious → block the source, isolate an internal source host, reset and revoke if any success, escalate (P1 if privileged success).
@@why
Show a structured approach and the "did it succeed?" question — that's what turns noise into an incident.
@@keywords logon type, source, account, success, 4624, lockout, internal, block, escalate

@@q
How does DNS work and how can attackers abuse it?
@@answer
**How:** a client asks its configured resolver for a name; the resolver (if not cached) queries a root server → the TLD server (.com) → the domain's authoritative server, returns the record (A, AAAA, CNAME, MX, TXT…) and caches it per TTL. Mostly UDP 53 (TCP for large responses/zone transfers); DoH/DoT encrypt it.
**Abuse:** **C2 over DNS** and **DNS tunneling/exfiltration** (data encoded in subdomains/TXT records); **DGAs** to find C2; **fast-flux** hosting; **DNS hijacking/poisoning** and malicious resolver changes; **typosquatting/look-alike domains** for phishing; **subdomain takeover**; **amplification DDoS**; **DoH** to bypass inspection.
**Detection:** queries to external resolvers, long/high-entropy names, high NXDOMAIN rates, newly registered domains, unusual TXT volume, one host with extreme query counts.
@@why
Tie it to Week 1's SOC problem as your example.
@@keywords resolver, root, tld, authoritative, cache, tunnel, dga, exfil, c2

@@q
What is lateral movement? How would you detect it?
@@answer
Lateral movement is when an attacker **moves from an initially compromised system to other systems** in the network to reach their objective (MITRE TA0008), typically using stolen credentials and admin protocols: RDP, SMB/admin shares + PsExec, WMI, WinRM/PowerShell remoting, SSH, pass-the-hash/ticket. **Detection:** one account logging into many hosts in a short window (4624 type 3/10), first-time account-to-host relationships, **workstation-to-workstation** SMB/RDP/WinRM traffic, remote service creation (7045 `PSEXESVC`), `wmiprvse.exe`/`wsmprovhost.exe` spawning shells, explicit credential use (4648), NTLM anomalies (pass-the-hash), Kerberos anomalies (4769 RC4), admin share access (5140/5145), and EDR/Defender for Identity alerts. Example KQL: `SecurityEvent | where EventID == 4624 and LogonType in (3,10) | summarize dcount(Computer) by Account, bin(TimeGenerated, 1h) | where dcount_Computer > 5`.
@@why
Prevention you can mention: tiered admin model, LAPS, restricted RDP, segmentation.
@@keywords move, other systems, credentials, rdp, smb, psexec, wmi, 4624, many hosts

@@q
Explain the difference between KQL and SPL. Give an example query in each.
@@answer
Both are pipeline query languages for security data. **KQL** (Kusto Query Language) is used in **Microsoft Sentinel, Defender XDR, Azure Data Explorer** — it queries **structured tables** with a defined schema (`SigninLogs`, `SecurityEvent`) and uses operators like `where`, `summarize`, `extend`, `project`, `join`. **SPL** (Search Processing Language) is **Splunk's** language — it searches **indexed events** (often semi-structured, with search-time field extraction via sourcetypes) using commands like `search`, `stats`, `eval`, `table`, `rex`, `transaction`.
Same question in both — failed logons per source IP in 24h:
```kql
SecurityEvent | where TimeGenerated > ago(24h) and EventID == 4625
| summarize Failures = count() by IpAddress | sort by Failures desc
```
```spl
index=wineventlog EventCode=4625 earliest=-24h
| stats count AS failures BY src_ip | sort - failures
```
@@why
Mapping: `summarize`↔`stats`, `extend`↔`eval`, `project`↔`table`, `where`↔`search/where`, watchlist↔lookup.
@@keywords sentinel, splunk, tables, index, summarize, stats, extend, eval

@@q
How would you handle a false positive that fires 200 times a day?
@@answer
1. **Don't just ignore or disable it** — first understand what the rule is meant to detect and why it matters.
2. **Analyse** 30 days of alerts: stack by entity, source, field values to find the recurring benign patterns; confirm there are no TPs hidden in it.
3. **Tune**: exclude known-good via a **maintained watchlist** with owners/expiry (not broad exclusions), tighten logic (thresholds, additional conditions, better fields), aggregate into one alert per entity/period, or convert to a risk-scoring signal (RBA).
4. **Validate** against historical TPs or a simulated attack so detection capability is retained.
5. **Document and get approval** (change control), then **measure** before/after (alerts/day, TP rate) and review in 2 weeks.
Example: my Week 6 tuning of a "foreign failed sign-in" rule cut ~150/day to ~9/day while keeping every past true positive.
@@why
Mention the risk: alert fatigue makes analysts miss real attacks — tuning is a security improvement, not just convenience.
@@keywords analyse, pattern, watchlist, exclude, threshold, validate, document, measure

@@q
What's the difference between vulnerability scanning and penetration testing?
@@answer
**Vulnerability scanning** is **automated**, broad and frequent (weekly/continuous) — tools like Nessus, Qualys, OpenVAS or Defender Vulnerability Management identify **known** vulnerabilities and misconfigurations and rate them (CVSS), but don't exploit them; output can include false positives. **Penetration testing** is a **manual, goal-driven, time-boxed** engagement by skilled testers who **actively exploit** vulnerabilities and chain weaknesses to show real impact (e.g. "from phishing to domain admin"), within an agreed scope and rules of engagement; done less often (annually/after major changes). Scanning answers "what's vulnerable?"; pentesting answers "what could an attacker actually achieve?"
@@why
SOC angle: both generate alerts — they must be scheduled and communicated (BTP handling), and pentests are a great test of your detections. Red teaming goes further (stealthy, objective-based, tests the SOC itself).
@@keywords automated, known, exploit, manual, scope, impact, frequency

@@q
Describe the NIST Incident Response Lifecycle.
@@answer
NIST SP 800-61 defines four phases: (1) **Preparation** — IR plan, team, tools, playbooks, logging, training; (2) **Detection & Analysis** — identify and validate incidents, scope, prioritise, document, notify; (3) **Containment, Eradication & Recovery** — limit damage (short- and long-term containment, evidence preservation), remove the threat and root cause (malware, persistence, credentials, vulnerability), restore from clean sources with monitoring; (4) **Post-Incident Activity** — lessons learned, report, metrics, improvements that feed back into preparation. It's iterative — new findings during containment send you back to analysis. The 2025 Rev. 3 aligns IR with the NIST CSF 2.0 functions. Example: walk through the Week 9 compromised-service-account scenario.
@@why
Concrete example + "it's a cycle" are what distinguish a strong answer.
@@keywords preparation, detection, analysis, containment, eradication, recovery, lessons, cycle

@@q
What is a SIEM and how does it work?
@@answer
A **SIEM (Security Information and Event Management)** platform **collects, normalises, stores, correlates and analyses** security data from across the organisation to detect threats and support investigations and compliance. How it works: (1) **collection** — agents, syslog, APIs and connectors ingest logs (endpoints, firewalls, identity, cloud, email); (2) **parsing/normalisation** — fields mapped to a common schema (CIM/ASIM); (3) **storage/indexing** for search and retention; (4) **detection** — correlation rules, thresholds, TI matching, UEBA/ML create alerts; (5) **incident management** — alerts grouped into incidents for triage; (6) **investigation and hunting** with a query language (KQL/SPL); (7) **dashboards/reporting**; often integrated with **SOAR** for automated response. Examples: Microsoft Sentinel, Splunk ES, QRadar, Google SecOps, Elastic.
@@why
Mention that a SIEM is only as good as its data sources and detection content — garbage in, garbage out.
@@keywords collect, normali, correlat, store, alert, rules, search, soar

@@q
How would you detect data exfiltration?
@@answer
Look across the exfil lifecycle — **collection → staging → transfer**:
- **Network:** unusual **bytes out** per host/user vs baseline (proxy/firewall/NetFlow), uploads to cloud storage/file-sharing/paste sites, new external destinations, long-lived connections, traffic at odd hours, DNS tunneling patterns, unusual protocols (FTP, SSH out).
- **Endpoint:** archiving tools (7z, rar, `Compress-Archive`), `rclone`/`MEGAcmd`/`curl` uploads, large file reads from shares, USB writes (device control).
- **Identity/SaaS:** mass downloads from SharePoint/OneDrive, external sharing links, mailbox forwarding rules, large emails to personal addresses.
- **DLP** policies and sensitivity-label matches; **UEBA** for leavers/high-risk users.
Example rule: `hosts sending >100 MB to non-corporate external IPs in 1 hour` (Week 6 #16), refined with exclusions for backup/cloud services.
@@why
Context (who, what data, sanctioned destination?) decides whether it's an incident.
@@keywords bytes out, baseline, proxy, cloud, archive, usb, dlp, dns, staging

@@q
What are indicators of compromise vs indicators of attack?
@@answer
**IOCs (Indicators of Compromise)** are **forensic artifacts showing a compromise has happened** — hashes, malicious IPs/domains, file names, registry keys. They're reactive, specific to a known threat, and easy for attackers to change. **IOAs (Indicators of Attack)** focus on **behaviour and intent — an attack in progress**, regardless of the specific tools: e.g. "Office application spawning PowerShell that downloads and executes code", "process accessing LSASS memory", "mass file encryption". IOAs are proactive, catch novel/unknown malware and map naturally to TTPs/ATT&CK. A mature SOC uses both: IOCs for fast blocking and scoping; IOAs for durable detection.
@@why
Connect to the Pyramid of Pain.
@@keywords artifact, happened, hash, ip, behaviour, intent, in progress, proactive

@@q
You find a suspicious process on a Windows host. Walk me through your analysis.
@@answer
1. **Process identity:** name, full **path** (System32 vs AppData/Temp/Public), **hash** (VirusTotal, EDR prevalence), **signature/publisher**, file creation time.
2. **Lineage:** **parent and children** (Sysmon 1 / EDR tree) — e.g. `winword.exe → powershell.exe` is bad; **command line** (encoded? download cradle?); user context and integrity level.
3. **Behaviour:** network connections (Sysmon 3 — destinations, reputation, beaconing), files written (Sysmon 11), registry/persistence (Sysmon 12–13, tasks, services), injection/LSASS access (Sysmon 8/10).
4. **Timeline:** what happened just before (email, download, logon) and after.
5. **Scope:** same hash/command line/destination on other hosts.
6. **Decide and act:** benign (document) or malicious → isolate host, kill process, collect evidence (memory first), block IOCs, escalate.
@@why
Mention tools: EDR, Sysinternals (Process Explorer, Autoruns, TCPView), Sysmon, and memory forensics (Volatility) if needed.
@@keywords path, hash, signature, parent, command line, network, persistence, scope, isolate

@@q
Tell me about a time you investigated something and it turned out to be nothing. What did you learn?
@@answer
Use **STAR** with a real story — e.g. from the service desk: *Situation:* recurring account lockouts that looked like an attack. *Task:* determine whether to escalate to security. *Action:* collected 4740/4625 events, identified the caller computer, found a stale cached credential on a shared PC/mapped drive, confirmed no external sources, documented it and still shared the evidence with security. *Result:* fixed the root cause (≈15 tickets/week eliminated); learned to **gather evidence before assuming**, to document even "nothing" findings, and that a well-documented benign result is still valuable — it can feed tuning and baselines.
@@why
Interviewers want: curiosity, method, no embarrassment about benign findings, and a lesson applied later.
@@keywords situation, task, action, result, evidence, document, learn

@@q
It's 3 AM, you're alone on shift, and a P1 alert fires. What do you do?
@@answer
1. **Acknowledge** and quickly validate it's real (not a duplicate/known BTP) — minutes, not an hour.
2. **Follow the playbook and escalation procedure** — **call** the on-call SOC lead/IR (phone, not just a ticket); a P1 alone at 3 AM is exactly what on-call exists for.
3. **Take authorised immediate containment** within my remit (e.g. EDR-isolate a host, disable an account, block an IP) — documenting time and justification.
4. **Start the incident record and timeline** (UTC): evidence, queries, actions.
5. **Scope quickly** — other affected hosts/accounts — while waiting for support.
6. Provide **regular updates**, and hand over cleanly. Stay calm; don't freeze, don't go rogue beyond my authority.
Example: Week 8's "3 AM Shift" scenario.
@@why
Balance urgency with process: act within authority, escalate early, document everything.
@@keywords validate, playbook, escalate, call, contain, document, timeline, scope

@@q
How do you stay current with the threat landscape?
@@answer
Be specific: **The DFIR Report** (real intrusions with TTPs), **CISA advisories/KEV catalogue**, **Microsoft Threat Intelligence** and **Mandiant/Unit 42/Talos** blogs, **SANS Internet Storm Center** daily podcast, **Krebs on Security**, **BleepingComputer** for news, the regional **UAE Cyber Security Council** advisories, MITRE ATT&CK updates; hands-on practice on **TryHackMe, LetsDefend, CyberDefenders**; following detection engineers on LinkedIn/Mastodon; **Sigma rules** repo for new detections. And — importantly — I **turn it into action**: when a new technique is published I try to reproduce it in my lab and write a detection (e.g. a rule in my GitHub portfolio).
@@why
The "turn it into action" bit is what impresses.
@@keywords dfir report, cisa, blog, podcast, lab, practice, detection

@@q
You disagree with a senior analyst's triage decision. How do you handle it?
@@answer
Respectfully, with **evidence**, in the right channel and with urgency proportional to risk. I'd ask questions first to understand their reasoning (they may have context I lack), then present the specific evidence behind my concern ("this IP also appears in the VPN logs for an account that logged in at 02:00"). If it's still unresolved and the risk is significant, I'd suggest a quick additional check or ask the SOC lead for a second opinion — framed as wanting to get it right, not proving them wrong. Whatever the outcome, I document my observations in the ticket and learn from it. If it's an active high-risk issue, I wouldn't stay silent just to avoid conflict.
@@why
Use STAR with a real example if you have one (e.g. from service desk escalations).
@@keywords respect, evidence, understand, ask, escalate, lead, document, learn

@@q
Why do you want to work in a SOC?
@@answer
Make it personal and specific: *"In my service-desk role, the most engaging part of my work was the security side — handling phishing reports, account compromises and access reviews — and I wanted to understand the whole picture behind those incidents. That led me to my MSc in Cybersecurity and SC-200, and over the last three months I've built a home SOC lab with Sentinel and Splunk, written detection rules, playbooks and incident reports, which are in my GitHub portfolio. I enjoy the investigative problem-solving and the fact that the work directly protects people and the business. A SOC role is where I can apply that hands-on and grow towards detection engineering/incident response — and your team's use of Sentinel and Splunk matches exactly what I've been building."*
@@why
Connect past → present preparation → future goal → this company. Avoid "it pays well" or generic "I love hacking".
@@keywords service desk, interest, lab, portfolio, investigat, protect, grow, company

@@problem The Job Application
@@scenario
You find a **junior SOC analyst** posting in Dubai. Requirements: 1–2 years in IT, basic SIEM experience, knowledge of MITRE ATT&CK, incident response fundamentals, and a relevant certification. The company uses **Microsoft Sentinel and Splunk**.
@@task Tailor your SOC CV to match this job description — highlight relevant experience and skills.
@@task Write a 4-paragraph cover letter (not generic — reference the company's stack and your specific skills).
@@task Prepare 3 talking points for the interview that connect your service-desk experience to SOC work.
@@task Identify the gap between the requirements and your current skills — write a plan to close each gap before the interview.
@@task Assemble a submission-ready application package.
@@deliverable
Tailored CV, cover letter, interview prep notes, and gap analysis.
@@approach
**Tailoring the CV:** mirror the ad's keywords in your summary and skills ("Microsoft Sentinel", "Splunk", "SIEM", "MITRE ATT&CK", "incident response"); move the **Projects/Portfolio** section above older experience; quantify service-desk bullets with a security angle; list SC-200 prominently.

**Cover letter structure:**
1. *Hook* — the role, where you found it, one line on why this company (their sector, their stack, something specific from their site/news).
2. *Evidence* — 2–3 concrete achievements: e.g. "Built a home SOC lab with Sentinel and Splunk; wrote and tuned 15 KQL/SPL detections mapped to MITRE ATT&CK — including reducing a noisy rule's alerts by 94% — published on GitHub."
3. *Transferable experience* — service-desk security work (identity lifecycle, phishing triage, MFA/Conditional Access, working to SLAs on shifts, clear communication with users).
4. *Close* — enthusiasm, availability (shift work, notice period), call to action.

**3 talking points (service desk → SOC):**
- *Identity & access:* joiners/movers/leavers, MFA and privileged access — the #1 attack surface (valid accounts, T1078).
- *Triage under SLAs:* prioritising a ticket queue by impact is the same skill as triaging an alert queue; documenting for the next shift.
- *User-facing incident handling:* phishing reports and compromised accounts — you've seen the human side of incidents and can communicate calmly with non-technical users.

**Gap analysis template:**
| Requirement | My evidence | Gap | Plan before interview |
|---|---|---|---|
| 1–2 yrs IT | Service desk X yrs | none | — |
| Basic SIEM | Lab: Sentinel + Splunk | no production SOC | Be explicit: "lab + training"; finish 2 more BOTS/LetsDefend cases to discuss |
| MITRE ATT&CK | Mapped 3 incidents, Navigator layer | depth on some tactics | Review 2 techniques per tactic with detections |
| IR fundamentals | 3 NIST reports | real-world incident | Prepare STAR from service desk compromise handling |
| Certification | SC-200 / MSc | Splunk cert (nice to have) | Splunk Core Certified User (free training) — mention in progress |

**Package checklist:** CV (PDF, named `Firstname-Lastname-SOC-Analyst.pdf`), cover letter, GitHub link working and README polished, LinkedIn headline updated ("SOC Analyst | Microsoft Sentinel | Splunk | KQL"), interview notes with the 20 answers, 3 questions for the interviewer.
