@@week 8
@@month 2 SIEM & DETECTION
@@title Threat Detection & Alert Triage

@@concepts
This is the day-to-day of SOC work. Alerts come in; you triage them; you decide: **close, investigate, or escalate**. Tools can be learned in days — this week is about **judgment**, which is what separates a good Tier 1 analyst from a ticket-closer.

@@topic The alert triage workflow
1. **Read the alert** — which rule fired, what logic, which entities (user/host/IP/hash), what time? Read the rule's description and query if unsure what it detects.
2. **Context** — who/what is the entity? Asset criticality (CMDB), user role (HR/AD), VIP status, normal behaviour (baseline), any open change requests or known maintenance.
3. **Correlate** — pull other logs for the same entities ±1 hour: sign-ins, process tree, network, email, other alerts on the same entity.
4. **Enrich** — threat intel for IPs/domains/hashes (VirusTotal, AbuseIPDB, URLScan, internal TI), WHOIS/domain age, geolocation/ASN.
5. **Assess** — TP / BTP / FP? Severity? Scope?
6. **Act & document** — close with notes, investigate further, or escalate with a clear summary. **Every closed alert needs a reason a reviewer could verify.**

Target times (typical SLAs): P1 acknowledge < 15 min, P2 < 1 h, P3 < 4 h, P4 < 24 h.

@@topic Classification
| Class | Meaning | Action |
|---|---|---|
| **True Positive (TP)** | Rule fired correctly on real malicious activity | Escalate / respond |
| **Benign True Positive (BTP)** | Rule fired correctly, activity is real but **authorised** (pentest, admin task, vuln scanner) | Close with evidence of authorisation; consider exclusion |
| **False Positive (FP)** | Rule fired but the activity isn't what the rule meant to detect (bad logic, parsing error) | Close; raise tuning request |
| **False Negative (FN)** | Malicious activity occurred, **no alert** | Found via hunting/IR — create or fix detection |
| *True Negative* | No alert, nothing happened | — |

Sentinel calls BTP "Benign Positive"; some SOCs use "Undetermined" when evidence is insufficient — use it honestly rather than guessing.

@@topic Triage decision factors
- **Asset criticality** — domain controller, payment server, CEO laptop > test VM.
- **Identity privilege** — Domain/Global Admin > service desk > standard user. Service accounts behaving interactively = red flag.
- **Time** — 03:00 on a 9–5 user's account vs 14:00.
- **Volume & pattern** — 1 failure ≠ 500 failures; one host vs 50 hosts.
- **Threat intel match** — known C2/malware hash = immediate escalation.
- **Kill chain position** — later stages (C2, lateral movement, exfil, impact) are more urgent than recon.
- **History** — has this entity triggered this before? How was it closed? (Watch for "always FP" bias.)
- **Correlation** — several medium alerts on one entity in a short window often add up to a high-severity incident.

@@topic Playbooks (runbooks)
A playbook is a **step-by-step guide for one alert type** so any analyst responds consistently. Structure:
1. **Alert description & trigger** — what fires it, MITRE mapping.
2. **Triage steps** — what to check first; quick FP/BTP checks.
3. **Investigation queries** — ready-to-run KQL/SPL.
4. **Decision criteria** — when it's TP/BTP/FP.
5. **Escalation criteria** — when Tier 1 hands to Tier 2/IR, and who to contact.
6. **Containment/response actions** — and who's authorised to do them.
7. **Closure criteria & documentation** — what the ticket must contain.
8. **References** — owners, tools, related playbooks.

Common playbooks: brute force, phishing, malware (EDR), impossible travel, suspicious PowerShell, data exfiltration, privileged account changes, ransomware, insider threat. Public references: the incident-playbook collections from CISA, AWS, Microsoft's IR playbooks, and the "IRM" (Incident Response Methodologies) by CERT Société Générale.

@@topic Writing good investigation notes
Use a consistent structure in every ticket:
```
Summary:     one sentence — what happened, to whom, when
Evidence:    bullet facts with timestamps (UTC) + the query/source for each
Analysis:    what the evidence means; why you classified it as X
Actions:     what you did (and when)
Next steps:  what remains / recommendation
```
Write as though the person reading it has never seen the alert and is reviewing your work at 9 AM.

@@fieldnotes
- **Alert fatigue** is the number one SOC problem. The cure is tuning plus correlation, not "work faster".
- Never close an alert with "FP" alone. Write *why*: "BTP — Qualys scanner 10.0.1.50, authenticated scan window CHG-1234, 02:00–04:00."
- If you're unsure, escalate with what you know. Tier 2 would much rather get a well-documented "unsure" than a missed incident.
- Look at the *whole* queue first before diving in — related alerts change priorities (see Week 11 Day 1).
- Practice platforms with live alert queues: **LetsDefend** (free tier), **TryHackMe SOC Simulator**, **Blue Team Labs Online**.

@@lab Write 5 SOC Playbooks
Write one complete playbook (about 1 page each) per alert type, using the structure from the Concepts section. Save them as Markdown — they're a core part of your Week 12 portfolio.

@@step
**Playbook 1 — Brute Force Detected.** Trigger: 20+ failed logins from a single IP within 5 minutes. Include triage steps, investigation queries (KQL **and** SPL), escalation criteria, containment actions and closure documentation.

@@step
**Playbook 2 — Phishing Email Reported.** Trigger: user reports suspicious email via the phish button. Cover header analysis (SPF/DKIM/DMARC, Return-Path, Received chain), link/attachment analysis (URLScan, sandbox, hash lookup), finding other recipients, finding clickers, and response (purge, block, reset).

@@step
**Playbook 3 — Malware Alert from EDR.** Trigger: endpoint protection detects a malicious file. Cover: blocked vs executed, process tree, persistence, network connections, lateral movement scoping, isolation and remediation.

@@step
**Playbook 4 — Impossible Travel.** Trigger: same user signs in from two locations > 500 km apart within 30 minutes. Cover VPN/proxy/cloud egress checks, device and MFA details, user verification via a known-good channel, and response if compromised.

@@step
**Playbook 5 — Suspicious PowerShell Execution.** Trigger: encoded command or PowerShell downloading from an external URL. Cover decoding (CyberChef), 4104 review, parent process, what it downloaded/executed, distinguishing admin tooling (SCCM/Intune scripts) from malicious use.

@@step
Peer-review your own playbooks: could someone who has never seen this alert follow them at 3 AM? Add a one-line "**If in doubt, escalate to:**" to each.

@@tips
**Example skeleton — Playbook 1: Brute Force**
```
Trigger:   ≥20 failed logins from one source IP within 5 min (T1110)
Severity:  Medium; High if target is privileged OR a success follows; Critical if success + privileged

Triage (10 min)
 1. Source IP internal or external? Internal → which host (DHCP/EDR)? Known scanner?
 2. Target accounts: one (guessing) vs many (spraying)? Any privileged/service accounts?
 3. Did ANY success follow from the same IP or for the same user within 30 min?
 4. Enrich IP: AbuseIPDB, VT, geo/ASN, previous incidents.

Queries
 KQL: SigninLogs | where IPAddress == "<ip>" | summarize count() by ResultType, UserPrincipalName
 SPL: index=wineventlog src_ip=<ip> (EventCode=4625 OR EventCode=4624) | stats count by EventCode user

Escalate to Tier 2 when: success after failures | privileged target | internal source host |
                         same IP hitting >10 accounts | TI match
Containment: block IP (external) | isolate source host (internal) | reset + revoke sessions on success
             | enforce MFA / lockout policy review
Close as BTP/FP when: confirmed scanner/service with stale password (raise ticket to owner)
Ticket must include: IP, accounts, counts, time window, success Y/N, enrichment, actions
```

@@q
An alert fires: "Multiple failed logins from 10.0.1.50." You check and find it's the IT team's vulnerability scanner running authenticated scans. What's your classification (TP/BTP/FP) and what do you do?
@@answer
**Benign True Positive (BTP)** — the rule correctly detected multiple failed logins, and they really happened, but the activity is authorised. Verify before closing: confirm 10.0.1.50 is the scanner (CMDB/asset owner), that a scan was scheduled at that time (change ticket/scan schedule), and that the targeted accounts match the scan credentials. Close with that evidence documented. Then raise a tuning request: exclude the scanner IP **for the scan window/accounts only** (watchlist), and ask the IT team why credentials are failing (expired scan credentials?).
@@why
Don't exclude the scanner IP from everything — scanners are high-value targets, and an attacker on that box would be invisible.
@@keywords benign true positive, btp, authoris, verify, document, tun

@@q
You see 3 alerts fire within 2 minutes for the same host: "New service installed," "PowerShell encoded command," and "Outbound connection to rare external IP." Do you investigate each separately or correlate? Why?
@@answer
**Correlate** — treat them as one potential incident. Same host, two minutes, and the alerts map to a classic chain: **Execution** (encoded PowerShell, T1059.001), **Persistence/Execution** (new service, T1543.003 / PsExec-style), **Command and Control** (rare outbound IP, T1071). Individually each might be medium or benign; together they strongly indicate compromise, which raises the priority (likely P1/P2). Build one timeline, check the process tree linking them (does the service binary make the outbound connection?), and escalate as one incident.
@@why
Correlating also avoids three analysts working the same incident in parallel — and avoids one alert being closed as FP while its siblings show the real story.
@@keywords correlate, same host, chain, priority, timeline

@@q
It's 11 PM. An alert fires: "User added to Domain Admins group." Account: the IT Director. What's your triage priority and first step?
@@answer
**High priority (P1/P2) — treat as urgent until verified.** Privileged group changes after hours are a top indicator of privilege escalation/persistence (T1098). First step: **identify who made the change and from where** — the 4728/4732/4756 event's *Subject* account, the logon session (4624) and source host/IP — and whether the IT Director's account was added *by itself or someone else*. Then verify out of band: check for a change request and contact the IT Director (or on-call IT manager) **via a known phone number**, not email/Teams which may be compromised. If unverified → escalate and remove the membership/disable the actor account per playbook.
@@why
Seniority doesn't equal legitimacy — executives' accounts are prime targets, and "the director did it" is exactly what an attacker wants you to assume.
@@keywords high, priority, who made the change, verify, change request, out of band, escalate

@@q
What's the difference between a playbook and an incident response plan?
@@answer
An **Incident Response Plan** is the organisation-level **strategic document**: IR policy, scope, roles and responsibilities (IR team, legal, comms, management), severity definitions, escalation and communication paths, regulatory obligations, and the overall lifecycle (NIST phases). A **playbook** is a **tactical, step-by-step procedure for a specific alert or incident type** (phishing, brute force, ransomware) that analysts follow. The IR plan says *who* and *when*; playbooks say *exactly how*.
@@why
One IR plan, many playbooks. Playbooks should reference the IR plan's severity and escalation definitions.
@@keywords strategic, organisation, roles, step-by-step, specific

@@q
Your SOC gets 500 alerts/day and your team of 3 can realistically investigate 50. How do you prioritize?
@@answer
Short term: **risk-based triage** — sort by severity × asset criticality × identity privilege × TI matches, **correlate/group** alerts by entity so one investigation covers many, and handle high-fidelity rules first. Use **automation (SOAR)** for enrichment and auto-closing well-understood BTPs with audit trails. Long term (the real fix): **measure each rule's TP rate**, tune or disable the noisiest low-value rules, move noisy signals to **risk-based alerting**, add exclusions via watchlists, and report the capacity gap to management with data (alerts/day vs analyst capacity).
@@why
"Just work faster" fails. The answer interviewers want: prioritise by risk, automate, tune, and measure.
@@keywords severity, asset, correlat, automat, soar, tune, risk

@@q
An alert fires for a known pentest engagement. The alert is legitimate but authorized. What classification do you use, and how do you document it?
@@answer
**Benign True Positive (BTP)** / "Benign Positive – suspicious but expected". Document: the pentest engagement reference (authorisation letter/SOW, ticket), the agreed **scope** (source IPs, target systems, time window), confirmation that the observed activity matches scope (IP, time, technique), who confirmed it (named contact on the pentest), and tag the alert/incident (e.g. `pentest-2026-Q4`). Report anything **out of scope** (different IPs, times or targets) as a potential real incident.
@@why
Real attackers have struck during pentests, counting on the SOC ignoring alerts. Also note which pentest actions were *not* detected — those are your false negatives to fix.
@@keywords benign true positive, btp, scope, authoris, document, tag

@@q
You triaged an alert as False Positive. Three weeks later, a breach investigation reveals that alert was a True Positive you missed. What went wrong in your triage and how would you prevent it?
@@answer
Typical root causes: **insufficient investigation** (only checked one data source), **confirmation bias / alert fatigue** ("this rule is always FP"), missing context (didn't check the baseline, user, or related alerts), **closing without verifying** a benign explanation, or a knowledge gap about the technique. Prevention: follow the playbook every time; require evidence for every FP/BTP closure; correlate with other sources before closing; **peer review / QA sampling** of closed alerts; tune noisy rules so real alerts aren't drowned; post-incident blameless review to update the playbook and training; and fix the detection so the same miss can't happen silently again.
@@why
Interviewers want ownership plus process improvement — not blame or excuses.
@@keywords fatigue, bias, context, verify, playbook, peer review, lessons

@@q
Write the escalation criteria for a brute force alert: under what conditions does Tier 1 escalate to Tier 2?
@@answer
Escalate when **any** of these is true:
1. A **successful authentication** follows the failures (same IP or same targeted account).
2. The targeted account is **privileged** (admin, service account, executive/VIP).
3. The source is an **internal host** (implies a compromised machine).
4. The source IP matches **threat intel** or is part of a wider campaign (many accounts targeted → spraying, or many source IPs → distributed attack).
5. The target is a **critical asset** (DC, VPN, payment system) or internet-exposed RDP/SSH.
6. **Account lockouts** are causing business impact.
7. Activity continues after initial containment (IP block), or Tier 1 cannot rule out compromise within the SLA.
@@why
Make criteria objective — "escalate if worried" leads to inconsistent handling.
@@keywords success, privileged, internal, threat intel, critical, lockout

@@q
A junior analyst asks: "Why can't we just tune all alerts to zero false positives?" What's your answer?
@@answer
Because there is a **trade-off between false positives and false negatives**. Tuning a rule until it never fires on benign activity usually means making it so narrow (or excluding so much) that it **misses real attacks** — and attackers deliberately imitate normal admin behaviour (living off the land). Many attacker techniques look identical to legitimate activity without context, so some human review is unavoidable. The goal is an **acceptable, measurable FP rate** for the value the detection provides, plus correlation/RBA so lower-fidelity signals still contribute without paging analysts. A missed breach (FN) costs far more than reviewing a few FPs.
@@why
Mention precision vs recall, and that FP tuning should always be validated against known TPs.
@@keywords false negative, trade-off, miss, attackers, legitimate, balance

@@q
You're writing a playbook for "Data exfiltration to cloud storage." What are the 5 most important investigation steps?
@@answer
1. **Identify the who/what/where** — user, device, destination service and account (corporate vs personal tenant), volume, time window.
2. **Determine what data** — file names/types, source locations (file server, SharePoint, DLP matches, sensitivity labels) and whether it's within the user's role.
3. **Establish context** — is the destination sanctioned? Is the user a leaver, on PIP, travelling, working on a project needing it? Normal baseline for this user?
4. **Check for compromise vs insider** — sign-in anomalies, MFA, device, EDR alerts, staging/compression, other affected accounts.
5. **Contain and preserve** — block the destination/session, disable the account or revoke tokens if malicious, preserve proxy/EDR/DLP/audit evidence, and engage HR/Legal/privacy for notification decisions.
@@why
Data classification determines regulatory impact — 2 GB of marketing images and 2 GB of customer PII are very different incidents.
@@keywords user, volume, destination, what data, sensitiv, context, insider, contain, preserve

@@problem The 3 AM Shift
@@scenario
You're working the overnight shift **alone**. Between 02:00 and 03:00 these 6 alerts fire in order:
1. **02:12** — "Failed VPN login" for `sarah.chen` from IP 91.215.xx.xx (Romania)
2. **02:14** — "Failed VPN login" for `sarah.chen` from 91.215.xx.xx (Romania)
3. **02:15** — "Successful VPN login" for `sarah.chen` from 91.215.xx.xx (Romania)
4. **02:18** — "New PowerShell process" on WORKSTATION-HR-12 (sarah.chen's assigned device)
5. **02:23** — "Outbound SMB traffic" from WORKSTATION-HR-12 to FILE-SERVER-01
6. **02:31** — "Large file download" from FILE-SERVER-01: **850 MB** transferred to WORKSTATION-HR-12

Sarah Chen is an **HR manager**. Normal hours 9 AM – 6 PM. She has **never connected from outside the country** before.
@@task Triage each alert: classify as TP, BTP, or FP with your reasoning.
@@task How do these 6 alerts connect? Tell the story.
@@task What is the likely attack chain? Map to MITRE ATT&CK.
@@task You're alone on shift. What do you do RIGHT NOW (immediate actions)?
@@task Write the escalation to your SOC lead: a 3-paragraph message covering what happened, severity, and what you've done so far.
@@task What containment actions would you take if authorised?
@@deliverable
A triage report covering all 6 alerts with classification, correlation narrative, MITRE mapping, and response actions taken.
@@approach
**Triage:** Alerts 1–2: TP (credential guessing/stuffing from a never-seen country). Alert 3: TP — successful login with likely stolen credentials (T1078). Alert 4: TP in context — PowerShell on her device during the attacker's VPN session. Alert 5: TP — SMB to file server at 02:23 by a user who isn't working. Alert 6: TP — 850 MB of probably sensitive HR data staged (collection). Any one alone might be BTP (e.g. Sarah travelling); the **sequence + timing + geography** makes it a single incident.

**Story:** an attacker with Sarah's password (phished or reused) tried twice, got in on the third attempt (MFA? — check: if no MFA on VPN, that's a root cause), used the VPN session to reach her workstation (RDP?) or her device is itself compromised, ran PowerShell, then pulled 850 MB from the HR file share — likely staging for exfiltration (or ransomware staging).

**ATT&CK:** T1110 Brute Force → T1078 Valid Accounts / T1133 External Remote Services → T1021.001 RDP (if remote session) → T1059.001 PowerShell → T1021.002 SMB/Windows Admin Shares → T1039 Data from Network Shared Drive → next likely T1560 archive and T1048/T1567 exfiltration.

**Right now (alone):**
1. Open a P1 incident and start a timeline (UTC).
2. Follow the escalation procedure — **call the SOC lead/on-call IR now** (phone, not just email).
3. If the playbook authorises Tier 1 containment: **disable sarah.chen / kill VPN session**, **isolate WORKSTATION-HR-12** via EDR (keep powered on), block 91.215.x.x at the VPN/firewall.
4. Check the outbound side — is data leaving now? (proxy/firewall from HR-12 and the VPN pool).
5. Preserve evidence (export logs/queries, don't reboot hosts).
6. Don't contact Sarah via her (compromised) email — her manager/HR on-call via phone in the morning, or per IR plan.

**Escalation message (3 paragraphs):**
> *What happened:* Between 02:12 and 02:31 UTC+4, sarah.chen's account had two failed VPN logins and then a successful login from 91.215.x.x (Romania) — she has never connected from abroad and normally works 09:00–18:00. Within minutes, PowerShell ran on her workstation WORKSTATION-HR-12, which then opened SMB to FILE-SERVER-01 and downloaded ~850 MB from the HR share.
>
> *Severity:* I'm treating this as **P1 — likely account compromise with collection of sensitive HR data**, possibly staging for exfiltration or ransomware. MITRE: T1110 → T1078 → T1059.001 → T1021.002 → T1039.
>
> *Actions so far:* At 02:40 I disabled the account and terminated the VPN session, isolated WORKSTATION-HR-12 via EDR, and blocked 91.215.x.x. I'm now checking for outbound transfers and any other accounts using that IP. I need a decision on resetting credentials for other HR users and on notifying the HR director and Legal. Incident INC-XXXX holds the timeline and queries.

**Further containment if authorised:** reset Sarah's password + revoke all tokens/MFA sessions, re-register MFA; block the IP range/ASN at VPN; restrict the HR share temporarily; hunt for the same IP/user agent across all VPN users; disk + memory capture of HR-12; enforce MFA/geo-restriction on VPN; review FILE-SERVER-01 access logs for what was read.
