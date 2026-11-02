@@week 11
@@month 3 IR & JOB READINESS
@@title Real-World SOC Simulation

@@concepts
This week is a **5-day simulation**. Each day you work a "shift" (2–3 hours): you receive a queue of alerts and must triage, investigate, document and close them. It's as close to real SOC work as you can get without sitting in one. Days 1–4 are the **Lab** (one checklist step per shift); Day 5 — the live ransomware incident — is this week's **SOC Problem**.

@@topic Rules of the simulation
- Treat each day as a real shift. **Set a timer** and stop when it ends — handovers are part of the job.
- Use your Sentinel workspace, Splunk instance, VirusTotal and the playbooks you wrote in Week 8.
- Where you don't have the data, **write the exact query you would run and what result would change your decision**. That's what interviewers test.
- Write every investigation note as if a senior analyst will review it tomorrow morning.
- Track metrics: alerts triaged, time per alert, TP/FP rates.
- Optional realism: do Days 1–3 on **LetsDefend** or the **TryHackMe SOC Simulator** in parallel — both have live alert queues.

@@topic How to work a queue (not just an alert)
1. **Skim the entire queue first** (2–3 minutes). Sort mentally by severity and look for **shared entities** (same user, host, IP) and **time clusters**.
2. **Group** related alerts into one investigation.
3. **Prioritise**: active threats (C2, lateral movement, exfil, ransomware) > confirmed compromise > suspicious > policy/hygiene.
4. **Time-box** each alert (e.g. 15 min); if it needs more, note what's outstanding and escalate or park it consciously.
5. **Close loop**: every alert ends with a classification, a reason, and next steps.

@@topic Shift handover template
```
Shift: 2026-11-__  08:00–16:00   Analyst: ____
Open incidents:   INC-___ (P_, status, next action, owner)
Escalated:        ...
Closed:           N alerts (TP x / BTP y / FP z)
Watch items:      hosts/users to keep an eye on + why
Pending from others: approvals, replies, change windows
Tuning requests raised: rule name → issue
```

@@topic Metrics you'll track
- **Total alerts triaged**, **average triage time** (MTTT), **TP rate** (TP / total), **FP rate**, **incidents escalated**, **reports written**, **playbooks used**, **rules to tune**.
- SOC-level metrics to know for interviews: **MTTD** (mean time to detect), **MTTA** (acknowledge), **MTTR** (respond/resolve), dwell time, alert-to-incident ratio, detection coverage (% ATT&CK techniques).

@@fieldnotes
- On Day 1, the "key" is that alerts 1–4 are one incident. In real queues, the overnight analyst often closes those one by one as "medium" — **look across the queue**.
- Insider investigations (Day 4) are where analysts get into legal trouble by snooping. Stay within the written scope and keep the circle small.
- In a live incident (Day 5), your updates should be short, timestamped and regular (every 30 minutes) — even if the update is "no change".

@@lab The 5-Day Shift Queue
Work one step per day. For every alert/task: priority (P1–P4), classification (TP / BTP / FP / Needs Investigation), steps and queries, containment if TP, and investigation notes.

@@step
**Day 1 (Monday 08:00) — The Backlog.** The overnight analyst left 12 open alerts:
1. 01:15 — Failed login attempts (23x) on VPN gateway from 103.45.xx.xx (Vietnam)
2. 01:22 — Successful VPN login, same IP, user `david.park`
3. 02:40 — Suspicious PowerShell command on DESKTOP-FIN-04 — encoded Base64
4. 03:12 — Outbound connection to newly registered domain from DESKTOP-FIN-04
5. 06:30 — Malware detected and quarantined on LAPTOP-MKT-02 — Trojan.GenericKD
6. 06:45 — USB device connected on LAPTOP-MKT-02 — removable storage
7. 07:00 — Multiple login failures on Exchange server from internal IP 10.0.3.22
8. 07:05 — Account lockout for user `finance_svc`
9. 07:10 — Antivirus disabled on WORKSTATION-DEV-07
10. 07:15 — Large email attachment (45 MB) sent by `john.smith` to external Gmail
11. 07:30 — TOR exit node connection detected from DESKTOP-HR-01
12. 07:45 — Windows Defender exclusion added on SERVER-APP-02

Triage all 12. **Key:** alerts 1–4 are related — can you see it? Which other pairs relate?

@@step
**Day 2 (Tuesday 09:30) — The Phishing Wave.** 3 users report suspicious emails; phish-button logs show 8 more received the same email, linking to a cloned Microsoft 365 login page. Analyse the email (sender, headers, link, attachments); scope recipients/clickers/submitters; contain affected accounts; check post-compromise activity (inbox rules, MFA changes, sign-ins); block indicators (domain, URL, sending IP); write the all-clear communication; write the full incident ticket.

@@step
**Day 3 (Wednesday) — The False Positive Flood.** 89 alerts overnight; 18 of the first 20 are FPs from one misconfigured rule. Identify the noisy rule and why it misfires; build a **rapid triage method** for the remaining 69 (stack by rule, entity, and outliers); find the 2–3 alerts actually worth investigating; write a rule-modification proposal; calculate the analyst-hours wasted this week; brief your lead (problem, fix, resource impact).

@@step
**Day 4 (Thursday) — The Insider Threat.** HR confidentially asks whether `m.hassan` (finance, resigned yesterday, two-week notice) has been accessing or exfiltrating sensitive files. Decide the log sources (file access, email, USB, cloud uploads, printing); build a 30-day activity baseline; identify anomalies (after-hours, large transfers, unusual shares); you find **2,400 files copied from the finance share to USB last Thursday** — decide what to do; document for HR/Legal; write down the **ethical and legal boundaries** (stay within scope, need-to-know).

@@step
**Day 5 (Friday 14:00) — The Incident.** Work this week's **SOC Problem** (live ransomware on FILE-SERVER-02) under a strict 2-hour timer.

@@step
**Fill in the week's metrics:** total alerts triaged, average triage time, TP rate, FP rate, incidents escalated, reports written, playbooks used, rules you'd tune. Write a short reflection: where did you lose the most time, and which playbook needs changing?

@@tips
**Day 1 answer key (check after you've done it)**
- **Alerts 1–4 = one P1 incident:** VPN brute force from Vietnam (1) → success as `david.park` from the *same IP* 7 minutes later (2, T1110 → T1078) → encoded PowerShell on DESKTOP-FIN-04 (3 — is that david.park's machine, or did he RDP to it via the VPN?) → callback to a newly registered domain 32 minutes later (4, C2 T1071). Actions: disable david.park + revoke sessions, isolate FIN-04, block the IP and domain, decode the PowerShell, hunt for the domain across all hosts, escalate.
- **5 + 6 are related:** malware quarantined, then a USB connected 15 min later on the same laptop — was the USB the infection source (or exfil)? Check the quarantined file's path (E:\?). P3 → P2 if the file executed.
- **7 + 8 are related:** failures from internal 10.0.3.22 against Exchange followed by `finance_svc` lockout — likely a stale password in a script/app on 10.0.3.22 (BTP/hygiene) **or** password guessing from a compromised host. Identify the host and process.
- **9** Antivirus disabled on a dev workstation: P2 until explained — check who/what disabled it (Defender 5001, process), and anything that ran after.
- **10** 45 MB to personal Gmail: P3 — DLP-style check of content and context; policy violation vs exfiltration.
- **11** TOR from an HR desktop: P2 — TOR browser (policy) or malware using TOR for C2? Check the process.
- **12** Defender exclusion on a server: P2 — classic pre-ransomware defense evasion (T1562.001). Who added it, which path, and what lives in that path?

**Day 3 rapid-triage method:** `stack by rule → by entity → by outcome`; bulk-handle the noisy rule's alerts with one documented decision; then review every remaining alert that is (a) on a critical asset, (b) involves privileged identity, (c) has a TI match, or (d) involves an entity appearing in more than one rule.

@@q
On Day 1, alerts 1–4 occur over two hours. Why might an overnight analyst have missed that they're one incident, and what process prevents it?
@@answer
Because each alert looks "medium" on its own and they fire from **different rules/sources** (VPN, endpoint PowerShell, network/domain reputation) at different times, an analyst working alert-by-alert sees four separate low-context tickets. The connecting entities (the VPN IP, `david.park`, DESKTOP-FIN-04) are only obvious if you look **across the queue**. Prevention: skim the full queue first; **entity-based correlation** (group by user/host/IP), SIEM incident grouping (Sentinel alert grouping, Fusion, Splunk RBA), playbooks requiring "check other alerts for this entity in ±24h", and shift handovers that flag watch entities.
@@why
Correlation is the single biggest difference between a junior and a strong Tier 1.
@@keywords separate, different, entity, correlat, queue, group, rba

@@q
Alert 8 — "Account lockout for finance_svc" — follows failures from internal IP 10.0.3.22. Give a benign and a malicious explanation and how you'd tell them apart.
@@answer
**Benign:** the service account's password was changed but an application, scheduled task, mapped drive or script on 10.0.3.22 still uses the **old password** and keeps retrying → lockout. **Malicious:** a compromised host at 10.0.3.22 is **guessing/spraying** passwords (T1110) or replaying credentials. Tell apart by: identifying the host and **the process** making the authentications (EDR, 4625 `CallerProcessName`, `Workstation`), the failure SubStatus (0xC000006A wrong password vs 0xC0000064 unknown user), whether **other accounts** are also failing from that IP (spraying), the timing pattern (machine-regular retries vs bursts), recent password change on finance_svc (4724/4723), and the host owner's explanation.
@@why
Lockouts of service accounts can also be a deliberate DoS — and repeated lockouts of a service account usually break a business process, so involve its owner quickly.
@@keywords old password, script, application, spray, process, other accounts, substatus

@@q
Alert 12 — a Windows Defender exclusion added on SERVER-APP-02. Why is this a high-priority alert and what do you check?
@@answer
Adding AV exclusions is a classic **defense evasion** step (T1562.001 Impair Defenses) used right before dropping tools or **ransomware** — attackers exclude a folder, then stage payloads there. Check: **who added it** (Defender Event 5007 shows the change; correlate with 4688/PowerShell 4104 `Add-MpPreference -ExclusionPath`, the account and its logon source), **what was excluded** (path/extension/process) and **what exists in that path now**, any change request, other security changes (tamper protection, real-time protection off 5001), and whether the same exclusion appears on other servers (GPO/Intune vs. manual). If unauthorised → P1/P2: remove exclusion, scan the path, isolate if payloads found, investigate the account.
@@why
Tamper Protection and managing exclusions centrally (Intune/GPO only) mitigate this.
@@keywords defense evasion, ransomware, who, path, 5007, add-mppreference, change request

@@q
On Day 2, how do you find out which of the 11 recipients clicked the phishing link and which entered credentials?
@@answer
**Clicks:** email security click logs (Defender for Office 365 **Safe Links** `UrlClickEvents` / Threat Explorer, Proofpoint/Mimecast URL-click logs), proxy/DNS logs for the phishing domain from each user's device, and EDR browser network events. **Credential submission:** proxy logs showing **POST** requests to the phishing site (with TLS inspection), and — most reliably — **sign-in logs**: successful sign-ins to the users' accounts from **unfamiliar IPs/ASNs/user agents** shortly after the click (often hosting/VPS providers or AiTM proxy infrastructure), MFA prompts/approvals the user didn't initiate, and risky sign-in detections from Entra ID Protection. Finally, **ask** the clickers directly.
@@why
Assume anyone who clicked a credential page *may* have submitted — reset if in doubt, it's cheap compared to BEC.
@@keywords safe links, click, proxy, post, sign-in, unfamiliar ip, mfa

@@q
In an adversary-in-the-middle (AiTM) phishing attack, the victim completed MFA. Why doesn't a password reset alone fix it, and what does?
@@answer
AiTM kits (e.g. Evilginx-style reverse proxies) relay the real login and **steal the session cookie/token** after MFA succeeds. The attacker then replays that **session token** — which stays valid regardless of a password change until it expires or is revoked. Fix: **revoke all sessions and refresh tokens** (Entra: *Revoke sessions* / `Revoke-MgUserSignInSession`), reset the password, review and remove any **MFA methods** or devices the attacker registered, remove malicious **inbox rules**/OAuth app consents, and check for persistence (new app registrations, mail forwarding). Long-term: **phishing-resistant MFA** (FIDO2/passkeys, Windows Hello), Conditional Access with compliant-device requirements and token protection.
@@why
"We reset the password" is the most common incomplete phishing response.
@@keywords session, token, cookie, revoke, mfa method, fido2, phishing-resistant

@@q
On Day 3, 18 of the first 20 alerts are FPs from one rule. Give a quick method to triage the remaining 69 alerts without investigating each from scratch.
@@answer
1. **Stack by rule name** — separate the noisy rule's alerts from everything else.
2. For the noisy rule: confirm the FP pattern (same cause, e.g. a broken parser or a legitimate tool), then **bulk-close with one documented decision**, spot-checking a sample and any that **deviate** from the pattern (different entity, time or values).
3. For the rest: **stack by entity** (user/host/IP) — entities appearing in multiple rules go to the top.
4. Prioritise alerts touching **critical assets, privileged accounts, or TI matches**.
5. Time-box each; escalate the 2–3 real ones.
6. Raise the tuning request so tomorrow isn't the same.
@@why
Bulk actions are fine *if documented and sampled* — they're how real SOCs survive floods.
@@keywords stack, rule, bulk, sample, entity, critical, privileged, tun

@@q
On Day 4, you find m.hassan copied 2,400 finance files to USB last Thursday. What do you do next — and what do you NOT do?
@@answer
**Do:** preserve the evidence immediately (export device-control/EDR/file-audit logs with hashes, take screenshots, record queries) — logs roll over; establish **facts without interpretation** (time, device serial/ID, file names/paths, data classification, volume, whether it's within job role); check for other exfil channels; report **only to the authorised requesters** (HR/Legal/your manager) in a factual, timestamped report; recommend containment options for them to decide (block USB for the user, restrict share access, preserve the laptop, plan for the exit interview/device return).
**Don't:** confront or tip off the employee, discuss it with colleagues or the user's team, expand the investigation **beyond the written scope** (e.g. reading personal emails/chats out of curiosity), make accusations or conclusions about intent ("he stole"), or wipe/modify the device.
@@why
Insider cases often end in legal action — evidence handling and scope discipline matter as much as the finding.
@@keywords preserve, evidence, fact, scope, hr, legal, do not confront, tip off, need-to-know

@@q
What are the ethical and legal boundaries of an insider-threat investigation like Day 4?
@@answer
- Act only on a **documented, authorised request** (HR/Legal) with a defined **scope** (user, systems, period, question).
- **Proportionality and necessity** — collect only what's needed to answer the question; avoid personal/private data unrelated to the allegation.
- Follow company **acceptable-use and monitoring policies** and local law (privacy/data-protection law, employment law — e.g. UAE PDPL / DIFC DPL considerations); Legal confirms what's permissible.
- **Confidentiality / need-to-know** — small circle, secure case notes.
- **Objectivity** — report facts, not conclusions about intent; be prepared for an innocent explanation.
- **Chain of custody** for evidence.
- Don't conduct covert surveillance or access accounts in ways not authorised.
@@why
Analysts who over-reach can expose the company to legal risk and lose their own credibility — and the evidence may become unusable.
@@keywords scope, authoris, proportional, privacy, policy, need-to-know, facts, legal

@@q
During the Day 5 ransomware incident, the file server is actively encrypting. Which first actions matter most in the first 10 minutes?
@@answer
1. **Isolate FILE-SERVER-02** from the network immediately (EDR isolation or switch port/vSwitch disconnect) — **don't power it off** (memory evidence, and some encryptors damage files mid-write).
2. **Identify the encrypting process and the account/host driving it** — if encryption is happening over SMB from a client, isolate *that* client and disable the account.
3. **Escalate** — P1 to SOC lead/IR, open a bridge; start the timeline.
4. **Protect backups and domain controllers** — check they're unaffected; disconnect/lock backup repositories if needed.
5. **Block known IOCs** (C2, ransom-note domains) and look for the same process/behaviour on other hosts (EDR hunt for mass file modifications).
@@why
Speed of isolation determines the blast radius. Investigation of root cause can wait 30 minutes; containment can't.
@@keywords isolate, don't power off, process, account, escalate, backup, domain controller

@@q
Write a good 30-minute status update for the CISO during an active incident. What must it contain?
@@answer
Short, factual, timestamped. Structure:
- **Time & status:** "15:00 update #2 — incident contained / ongoing / escalating."
- **What we know:** scope (systems, users, data), what changed since the last update.
- **Impact:** business services affected, data at risk.
- **Actions taken** since last update (with times).
- **Next actions & ETA**, and the **next update time**.
- **Decisions/support needed** (approvals, people, budget, external IR, comms).
- **Unknowns** stated explicitly.
Example: *"15:00 #2 — Encryption on FILE-SERVER-02 stopped at 14:22 after isolation; ~31% of the Finance share affected. Source identified as WS-ACC-07 via compromised account j.ortiz (disabled 14:25). No evidence of spread to other servers; backups verified intact at 14:50. Next: forensic capture of WS-ACC-07 and restore planning; ETA 17:00. Need approval to force-reset all Finance accounts. Next update 15:30."*
@@why
Executives need impact and decisions, not raw IOCs — keep technical details in the incident record.
@@keywords time, scope, impact, actions, next, decision, unknown, update

@@problem Day 5 — The Incident: Live Ransomware on FILE-SERVER-02
@@scenario
Friday **14:00**. EDR fires a **high-severity alert: ransomware behaviour detected on FILE-SERVER-02** — file encryption is happening in real time. You have the playbooks from Week 8, the IR process from Week 9, and 2 hours until end of shift. A weekend team takes over at 18:00.
@@task Execute your ransomware playbook from Week 8 (write each step and the time you'd do it).
@@task Make containment decisions under time pressure — and justify them.
@@task Communicate with your lead and the CISO in real time (write the actual updates you'd send).
@@task Scope the blast radius: what's affected, what's safe — and how you know.
@@task By end of shift, produce the initial incident report.
@@task List what the weekend team needs to know for handover.
@@deliverable
All investigation notes, the initial incident report, real-time updates, the weekend handover, and your Week 11 metrics summary.
@@approach
**Timeline of actions (example):**
- 14:02 acknowledge, open P1, call SOC lead. 14:04 **EDR-isolate FILE-SERVER-02** (don't power off). 14:06 identify encrypting process — local (malware on the server) or remote via SMB (encryption from a client: look for SMB writes/renames from one source IP — the classic case). 14:08 isolate that client + disable its account. 14:10 block IOCs (process hash, C2) org-wide via EDR custom indicators; hunt for the same behaviour on other hosts (`DeviceFileEvents` mass renames / ransom note name).
- 14:15 verify **backups** (immutable/offline copy intact? backup server not reachable from the compromised account) and **DCs** (GPO changes, new scheduled tasks, krbtgt risk). 14:20 first update to CISO.
- 14:30–16:00 scope: list encrypted shares/folders and data classification; earliest malicious activity (patient zero) — work backwards from the encryptor's parent and the account's sign-ins; check for **exfiltration before encryption** (proxy/firewall bytes out, rclone/MEGA). Preserve memory + disk of the server and source client.
- 16:00–17:30 initial report; recovery plan draft (restore order, clean backup point); weekend roster.

**Containment decisions to justify:** isolate rather than shut down (evidence, file corruption); disable the account even if it's an admin (accept impact); temporarily make other file shares read-only or disconnect them if spread can't be ruled out; block SMB between workstation subnets; don't contact the attacker or pay — escalate that decision.

**Blast radius — affected vs safe:** affected = hosts with the encryptor, the ransom note, mass renames, or logons by the compromised account after the earliest malicious time; safe = no IOC hits **and** EDR healthy/reporting **and** no logons from the compromised account (absence of telemetry ≠ safe).

**Initial report skeleton:** use the Week 9 template; mark unknowns clearly ("initial access vector: under investigation — leading hypothesis phishing on 10/30, see evidence E3").

**Weekend handover must include:** incident status and severity; affected/isolated hosts and disabled accounts (don't re-enable!); IOCs and active blocks; hunting queries to re-run every 2 hours; backup status and restore plan/approvals; open questions (exfil? initial access?); contacts (IR lead, CISO, Legal, vendor IR retainer, backup admin) with phone numbers; decision log; next update times; what *not* to do (don't reboot isolated hosts, don't restore before root cause is known).
