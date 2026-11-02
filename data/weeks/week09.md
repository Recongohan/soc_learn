@@week 9
@@month 3 IR & JOB READINESS
@@title Incident Response Workflow

@@concepts
Incident response is the structured process of handling a confirmed security incident from detection through recovery. This is where SOC work becomes real — decisions with business consequences, made under time pressure, that must be **documented and defensible**.

@@topic NIST Incident Response Lifecycle (SP 800-61)
The classic four phases (SP 800-61 Rev. 2) — still what interviewers expect:
1. **Preparation** — IR plan, policies, playbooks, tools (EDR, SIEM, forensic kits), trained team, contact lists, out-of-band comms, logging in place *before* you need it.
2. **Detection & Analysis** — identify the incident, validate it, determine scope, prioritise/severity, document, notify.
3. **Containment, Eradication & Recovery** — stop the damage, remove the threat, restore operations.
4. **Post-Incident Activity** — lessons learned, report, metrics, improve controls and playbooks.

It's a **cycle**: lessons learned feed back into preparation, and you'll loop between analysis and containment as you discover new scope.

> **Rev. 3 (2025)** re-frames IR around the NIST Cybersecurity Framework 2.0 functions (Govern, Identify, Protect, Detect, Respond, Recover). Know that it exists and that it maps onto the same four phases — mentioning it shows you're current. **SANS PICERL** (Preparation, Identification, Containment, Eradication, Recovery, Lessons learned) is the other common model.

@@topic Containment strategies
- **Short-term containment** — stop the bleeding fast: EDR network isolation, disable/lock accounts, revoke sessions/tokens, block IPs/domains, pull a VLAN, shut a firewall rule.
- **Long-term containment** — temporary fixes so the business can operate while you build a clean recovery: segment affected systems, apply patches/workarounds, move to clean jump hosts, increased monitoring.
- **Contain vs observe:** containing immediately stops damage but may tip off the attacker and lose intelligence about their access; observing gathers evidence but risks more damage. Default to **contain** for active destruction (ransomware, exfil in progress); consider **observing briefly** for stealthy, well-resourced actors only with IR lead/management approval and a full scope picture.
- **Evidence preservation:** capture **volatile data first** (memory, running processes, network connections), then **image disks** before wiping/rebuilding. Isolation via EDR (rather than powering off) keeps memory intact. Maintain **chain of custody**.
- **Containment decision checklist:** business impact of isolation, evidence needs, whether the attacker has other footholds, who must approve.

@@topic Eradication
- Remove malware and attacker tools from **all** affected systems (scope first — eradicating one host while three others remain infected just alerts the attacker).
- Remove **persistence**: scheduled tasks, services, Run keys, WMI subscriptions, web shells, cron jobs, SSH keys, new accounts, OAuth apps, mailbox rules, Golden-ticket risk (reset **krbtgt** twice if domain compromised).
- **Reset compromised credentials** — users, service accounts, admin accounts, API keys; revoke tokens.
- **Close the entry point** — patch the exploited vuln, enforce MFA, fix misconfiguration.
- **Verify** with scans, EDR sweeps (IOC hunt across the estate), and manual checks.
- Often the safest eradication is **rebuild from a known-good image** rather than "cleaning".

@@topic Recovery
- Restore from **clean backups** — verify the backup predates the compromise (attackers often sit for weeks) and scan it before restoring.
- Rebuild from **gold images**, then patch and harden before reconnecting.
- **Phased restoration** — critical services first, in a controlled order, with validation at each step.
- **Heightened monitoring** for 48–72 hours (or longer) on recovered systems and accounts — reinfection is common.
- Business sign-off that systems are working normally before closing.

@@topic Severity levels (typical)
| Level | Examples | Response |
|---|---|---|
| **P1 / Critical** | Active data breach, ransomware spreading, domain admin compromised, critical service down | All hands, CISO notified immediately, 24/7 until contained |
| **P2 / High** | Confirmed compromise of a single system, credential theft confirmed, malware executed | Same-day response, IR lead engaged |
| **P3 / Medium** | Suspicious activity not yet confirmed, policy violation, blocked malware | Investigate within business hours |
| **P4 / Low** | Failed attacks, recon/scanning, informational | Track, trend, tune |

Severity = **impact** (functional, information, recoverability) × **urgency/scope**. It can change as you learn more — re-assess and document.

@@topic Communication during incidents
- **Internal chain:** SOC lead → IR manager → CISO → Legal / Privacy / DPO → executives / comms — **need-to-know**, not broadcast.
- Use **out-of-band channels** (phone bridge, separate chat) if email/Teams/AD may be compromised.
- **Regulatory notification:**
  - **GDPR:** notify the supervisory authority **within 72 hours** of becoming aware of a personal-data breach (unless unlikely to result in risk); notify affected individuals **without undue delay** if high risk.
  - **UAE:** the Federal PDPL (Decree-Law 45/2021) and free-zone regimes (**DIFC** Data Protection Law, **ADGM** regulations) have their own breach-notification duties and timelines; sector regulators (e.g. the Central Bank for financial institutions, TDRA/NESA standards for critical sectors) may add requirements. Legal decides — your job is fast, accurate facts.
- **Never use the word "breach"** in writing until Legal approves — it has legal meaning.
- **Document everything:** timestamps (UTC), actions taken, who decided, evidence collected, what didn't work.

@@fieldnotes
- The first hour sets the tone: open the incident, start the timeline, assign roles (incident commander, scribe, investigators, comms) — even if "roles" is just you and one other person.
- Time-box analysis during an active incident. You can investigate root cause properly once the bleeding has stopped.
- Every action has a timestamp and an owner in the log. "Isolated host" is useless; "02:41 UTC — isolated WS-12 via Defender (A. Sadiq, approved by SOC lead)" is evidence.
- Tabletop exercises are how mature teams prepare. Running one (even with friends) is a strong interview story.

@@lab Full Incident Response Exercise — Ransomware Hits Finance
**Scenario:** you arrive Monday morning. **Three finance workstations** display ransom notes. File shares they access show encrypted files (`.encrypted` extension). The note demands **2 BTC** and gives a `.onion` address. Work through the NIST lifecycle with the time boxes below, using your lab (Sysmon/SIEM data from earlier weeks) to simulate evidence and writing down exactly what you'd query. Set a timer.

@@step
**Detection & Analysis (30 min) — scope:** which systems are affected? How many files are encrypted, on which shares? Write the queries (KQL/SPL) to find hosts creating `.encrypted` files or the ransom note filename.

@@step
**Find patient zero:** which system was infected first? Use the earliest Sysmon/EDR file-creation events and the earliest process executions of the encryptor.

@@step
**Identify the variant** from the note text, extension, `.onion` address, or hash (ID Ransomware, VirusTotal, ransomware.live / vendor reports). Note known TTPs and whether a decryptor exists (No More Ransom).

@@step
**Determine initial access:** email (phishing attachment), exploit (VPN/RDP/public app), drive-by, valid accounts, or insider? Check the patient-zero timeline backwards.

@@step
**Is it still spreading?** Look for lateral movement indicators (4624 type 3 storms, PsExec services, SMB writes to many shares, GPO changes, `vssadmin delete shadows`).

@@step
**Containment (20 min):** isolate affected systems (EDR), block C2 domains/IPs at the firewall/DNS, disable compromised accounts, check whether servers — especially **AD/DCs and backup servers** — are affected, and **preserve evidence**: memory + disk image of at least one host.

@@step
**Eradication (20 min):** identify all persistence (tasks, services, Run keys, GPOs, new accounts); remove malware or plan rebuilds; reset passwords for all accounts used on affected systems (and krbtgt if domain admin was compromised); patch/close the initial access vector.

@@step
**Recovery (20 min):** identify the last clean backup (before the earliest attacker activity, not just before encryption); plan restore order (critical finance systems first); restore to clean/rebuilt machines; verify and monitor 72h.

@@step
**Documentation:** write the incident report using the template below, including a timeline table, MITRE mapping, lessons learned and 3–5 recommendations.

@@tips
**Incident report template**
```
Incident ID: INC-2026-____        Detected: ____ (UTC)      Reported by: ____
Classification / Severity: Ransomware / P1                  Status: ____

1. Executive Summary (3 sentences — what, impact, current status; no jargon)
2. Incident Timeline
   | Time (UTC) | Event | Source | Action Taken |
3. Scope of Impact — systems, users, data (classification), business processes
4. Root Cause Analysis — initial access, why controls didn't stop it
5. MITRE ATT&CK Mapping — tactic | technique | evidence
6. Containment & Eradication Steps — what, when, who
7. Recovery Status — restored systems, outstanding work, monitoring
8. Lessons Learned — what went well / what didn't
9. Recommendations — 3–5 specific, owned, dated improvements
Appendix: IOCs, queries used, evidence register (chain of custody)
```
**Useful hunting query (KQL, Defender XDR):**
```kql
DeviceFileEvents
| where Timestamp > ago(3d) and FileName endswith ".encrypted"
| summarize Files = count(), First = min(Timestamp) by DeviceName, InitiatingProcessFileName
| sort by First asc   // earliest = likely patient zero
```

@@q
Name the 4 phases of the NIST Incident Response Lifecycle.
@@answer
1. **Preparation**
2. **Detection & Analysis**
3. **Containment, Eradication & Recovery**
4. **Post-Incident Activity** (lessons learned)

(From NIST SP 800-61 Rev. 2. Rev. 3, published in 2025, maps incident response onto the CSF 2.0 functions — Govern, Identify, Protect, Detect, Respond, Recover.)
@@why
Stress that it's cyclical — post-incident lessons feed preparation, and containment often loops back into analysis as new scope is found.
@@keywords preparation, detection, analysis, containment, eradication, recovery, post-incident

@@q
You've confirmed a host is compromised. It's a developer's machine with active SSH sessions to 3 production servers. Do you isolate it immediately? What are the risks of isolating vs not isolating?
@@answer
Generally **yes — isolate quickly**, but in a coordinated way. **Risks of not isolating:** the attacker can use those live SSH sessions/keys to pivot into production (data theft, ransomware, supply-chain tampering with code), and every minute increases blast radius. **Risks of isolating:** tipping off the attacker (they may switch to footholds you haven't found — possibly already on the prod servers), disrupting the developer and any running deployments, and losing visibility into their actions. Best approach: quickly check whether the attacker is already on the 3 servers, then **simultaneously** isolate the laptop via EDR (keeps memory for forensics), rotate the SSH keys/credentials used, review/kill sessions on the prod servers, and increase monitoring on them. Get IR lead approval and notify the server owners.
@@why
The key insight: the 3 production servers are **in scope** — treat them as potentially compromised, not as safe.
@@keywords isolate, pivot, production, ssh keys, tip off, evidence, simultaneous, scope

@@q
What's the difference between containment and eradication?
@@answer
**Containment** limits the damage and stops the spread — isolating hosts, blocking IPs, disabling accounts — *without necessarily removing the threat*. **Eradication** removes the threat and its root cause — deleting malware, removing persistence, resetting compromised credentials, patching the exploited vulnerability, rebuilding systems. Containment buys time; eradication ensures the attacker can't come back the same way.
@@why
Eradicate only after full scoping — partial eradication tells the attacker you've found them.
@@keywords limit, spread, stop, remove, root cause, persistence, patch

@@q
During a ransomware incident, your CEO asks "should we pay the ransom?" What factors should inform this decision?
@@answer
It's a **business/legal decision**, not the SOC's alone, but you supply the facts. Factors: **legal/sanctions risk** (paying sanctioned groups may be illegal — e.g. OFAC/UN/UAE sanctions lists — Legal must review); **recoverability** (do clean, tested backups exist? how long to restore?); **business impact** of downtime vs cost; **data exfiltration** (paying doesn't guarantee stolen data is deleted); **decryptor reliability** (often slow/buggy; check No More Ransom for a free decryptor); **threat actor reputation**; **insurance** policy requirements; **regulatory and law-enforcement** guidance (most advise against paying); **reputational** impact; and the fact that paying marks you as a payer and funds future attacks.
@@why
A strong answer: "My role is to give leadership accurate facts quickly — scope, backup status, restore time, exfil evidence — so Legal, insurers and execs can decide."
@@keywords backup, legal, sanction, insurance, exfil, guarantee, law enforcement, decryptor

@@q
You need to preserve a disk image for forensic analysis. Name the tool you'd use and the key steps to maintain chain of custody.
@@answer
Tool: **FTK Imager** (free) — or `dd`/`dc3dd`/`ewfacquire` on Linux, or EDR/KAPE triage collections. Steps: (1) capture volatile data first if needed (memory with FTK Imager/WinPmem/Magnet RAM Capture); (2) use a **write blocker** (hardware) for physical disks; (3) create a forensic image (E01 or raw/dd) to sterile media; (4) **hash the source and the image** (SHA-256/MD5) and confirm they match; (5) work only on **copies**, never the original; (6) record a **chain of custody form**: item description and serial, who collected it, date/time, location, hash values, and every transfer (from/to/when/why) with signatures; (7) store evidence securely with access control.
@@why
Hashes prove integrity; chain of custody proves who had it and that nobody tampered with it.
@@keywords ftk imager, hash, write blocker, copy, chain of custody, document, sha

@@q
After eradicating malware from a compromised host, what steps do you take before putting it back on the network?
@@answer
1. **Verify** eradication — full EDR/AV scan, IOC sweep (hashes, persistence locations, Autoruns), compare against baseline. Prefer **reimaging** from a gold image for high-confidence cleanliness.
2. **Patch and harden** — OS/app updates, close the vulnerability used, remove local admin rights, apply security baselines.
3. **Reset credentials** used on that host (user, local admin via LAPS, service accounts) and revoke tokens.
4. Restore user data from a **verified clean backup**.
5. Reconnect in a **monitored/segmented** state first, with **heightened monitoring** (EDR in strict mode, SIEM watchlist on the host) for 48–72 hours.
6. Get **owner sign-off** and document everything in the ticket.
@@why
Reinfection usually comes from missed persistence or unchanged credentials.
@@keywords verify, scan, reimage, patch, credential, monitor, backup

@@q
Your company discovers a breach that exposed customer PII. Under GDPR, what's the notification deadline and who must be notified?
@@answer
The **supervisory authority** (data protection authority of the lead EU member state) must be notified **within 72 hours of becoming aware** of the breach, unless it's unlikely to result in a risk to individuals' rights and freedoms (late notifications need reasons). **Affected data subjects** must be notified **without undue delay** if the breach is likely to result in a **high risk** to them. Processors must notify the controller without undue delay. The notification includes the nature of the breach, categories/approximate numbers affected, DPO contact, likely consequences and measures taken.
@@why
In the UAE, also consider the Federal PDPL and DIFC/ADGM data-protection laws, plus sector regulators. The SOC's role: fast, accurate scoping so the DPO/Legal can meet the deadline.
@@keywords 72 hours, supervisory authority, data subjects, undue delay, high risk

@@q
Why is it important to document everything during an incident, including actions that didn't work?
@@answer
- **Legal and regulatory evidence** — documentation may be used in court, insurance claims, regulator reviews; it must show what was done, when and by whom.
- **Accurate timeline and handover** — incidents span shifts and teams; good notes prevent repeated work and wrong assumptions.
- **Understanding side effects** — failed actions can still change the system (an attempted cleanup may alter evidence or alert the attacker).
- **Lessons learned** — what didn't work reveals gaps in tools, access, playbooks and training.
- **Accountability and decision tracking** — who approved containment, why a choice was made with the information available.
@@why
"If it isn't written down, it didn't happen" — applies doubly in IR.
@@keywords legal, evidence, timeline, handover, lessons, accountab

@@q
What is the difference between a "security event," a "security incident," and a "data breach"?
@@answer
- **Security event** — any observable occurrence relevant to security (a login, a firewall block, a failed password). Most are benign. Organisations see millions per day.
- **Security incident** — an event (or set) that **violates or imminently threatens** security policies or the confidentiality, integrity or availability of systems/data (malware execution, account compromise, DoS).
- **Data breach** — an incident in which **protected data (e.g. personal data) is confirmed to be accessed, disclosed, altered or lost** without authorisation. It's a **legal term** with notification obligations — declared by Legal/Privacy, not by the SOC.
@@why
Every breach is an incident; not every incident is a breach; every incident started as events.
@@keywords observable, violat, policy, confirmed, data, legal

@@q
Describe 3 things that should be covered in a post-incident lessons-learned meeting.
@@answer
1. **What happened and when** — the agreed timeline, root cause and how the attacker got in; how and when it was detected (and how long it went undetected — dwell time).
2. **What went well and what didn't** — detection, escalation, communication, tooling, playbook adherence, decision speed, access/permissions problems — in a **blameless** format.
3. **Actionable improvements** — specific owners and deadlines: new/tuned detections, control gaps (MFA, patching, segmentation), playbook updates, training, logging gaps; and **metrics** (MTTD, MTTR, cost/impact) to track.
@@why
Hold it within ~2 weeks while memories are fresh, and track the actions to completion — otherwise it's just a meeting.
@@keywords timeline, root cause, went well, improve, blameless, owner, metric

@@problem The Compromised Service Account
@@scenario
At **16:00 on a Friday**, your SIEM fires: service account `svc_sqlbackup` (runs automated DB backups) just **logged into 14 different servers via RDP in 8 minutes**. This account has **never used RDP** — it only authenticates to 2 specific database servers for scheduled backups. Its password **hasn't been rotated in 11 months**.
@@task Execute the Detection & Analysis phase: what do you check and in what order?
@@task Determine scope: what's the worst-case scenario and what evidence confirms or denies it?
@@task It's Friday at 16:00 — most of IT has left. Who do you contact and in what order?
@@task Write your containment plan — be specific about what you block and what you can't touch (the backup jobs are business-critical).
@@task The CISO asks for a situation report in 15 minutes. Write it (5 sentences: what happened, how bad, what you've done, what you need).
@@task Draft the post-incident actions assuming the account was used for reconnaissance across all 14 servers.
@@deliverable
A full incident response report (2 pages) following the NIST lifecycle.
@@approach
**Detection & Analysis order:**
1. Validate — 4624 Logon Type 10 events for svc_sqlbackup on 14 hosts; **source IP/host** of the RDP sessions (one jump point?).
2. Where did the credential come from? Check the source host: who's logged on, EDR alerts, credential dumping (Sysmon 10 on lsass), recent 4625s against svc_sqlbackup (spraying?), where the password is stored (scripts, config files, GPP, scheduled tasks).
3. What happened on the 14 servers: processes (4688/Sysmon 1), new services/tasks/accounts, file access, outbound connections, log clears.
4. Account privileges: is svc_sqlbackup a local admin/domain admin anywhere? Can it read the backups themselves? (ransomware actors target backups first).
5. Are other accounts behaving similarly from the same source (hunt)?

**Worst case:** an attacker (or ransomware affiliate) with a privileged credential doing **recon/staging** before a weekend ransomware deployment — Friday afternoon is classic timing — with access to **backups**. Evidence that confirms: discovery commands, AD enumeration, tools dropped (AdFind, Rclone, Cobalt Strike), shadow copy deletion, backup console access. Evidence that denies: an admin legitimately using the account (bad practice, but benign) — verify with named owner.

**Contact order (per IR plan):** SOC lead/IR on-call → the **DBA/backup owner** for svc_sqlbackup → infrastructure/AD on-call → CISO (P1 decision) → Legal/management if data impact. Phone, out-of-band.

**Containment (surgical):**
- Kill current RDP sessions; **block RDP for svc_sqlbackup** — add it to "Deny log on through Remote Desktop Services" by GPO and/or restrict *Log on to* workstations to the 2 DB servers (`userWorkstations` attribute).
- **Rotate the password** in coordination with the DBA so the backup jobs are updated at the same time (or temporarily pause the job with business approval); better, migrate to a **gMSA**.
- Isolate the source host via EDR; block lateral RDP at the firewall from that source.
- Do **not** disable the account outright without the DBA — or accept a missed backup knowingly and document the decision.
- Protect backups: verify immutability/offline copies exist now.

**Sitrep (example):**
> At 16:00, the backup service account svc_sqlbackup logged into 14 servers over RDP in eight minutes, which it has never done; this is very likely credential misuse by an attacker or an unauthorised insider. We're treating it as P1 because the account has administrative access and can reach our backups, and Friday-afternoon reconnaissance is a known ransomware precursor. So far we've killed the RDP sessions, blocked the account from interactive logons, isolated the source machine, and started forensic review of the 14 servers. Backup jobs are unaffected, and the password rotation is scheduled with the DBA for 17:00. I need authority to keep IR staff on through the weekend, approval to rotate all privileged service accounts, and an on-call contact from infrastructure.

**Post-incident actions:** rotate all service-account passwords and move to gMSAs/vaulted creds (PAM); enforce "deny interactive/RDP logon" for all service accounts; tiered admin model; alert on service accounts with Logon Type 2/10; review the 14 servers for persistence and rebuild any with evidence of tampering; verify backup integrity; segment RDP (jump hosts only); 90-day password rotation policy for non-gMSA accounts; detection for "account authenticating to > 5 new hosts in 1 hour".
