@@week 3
@@month 1 FOUNDATIONS
@@title Security Fundamentals & MITRE ATT&CK

@@concepts
This is the theoretical backbone. Every SOC interview will test it, and every alert you triage maps back to these frameworks. The goal is not to memorise definitions but to **use them as a shared language**: "this is T1059.001 in the Execution tactic, stage 4 of the kill chain, impacting confidentiality."

@@topic CIA Triad
- **Confidentiality** — only authorised people can read data. Violated by: data exfiltration, credential theft, misconfigured S3 bucket, shoulder surfing.
- **Integrity** — data is accurate and unaltered. Violated by: tampered logs, defaced websites, modified payment details (BEC), malicious code injection.
- **Availability** — systems and data are usable when needed. Violated by: ransomware, DDoS, wiper malware, deleted backups.

Practise mapping every incident: modern **double-extortion ransomware** hits **availability** (encryption) *and* **confidentiality** (data stolen before encryption).

@@topic AAA, Least Privilege, Defense in Depth
- **Authentication** — prove who you are (password, MFA, certificate).
- **Authorization** — what you're allowed to do (RBAC, group membership, ACLs).
- **Accounting** — record what you did (logs, audit trails). The SOC lives on accounting.
- **Least Privilege** — give users and services only the access they need, only for as long as they need it (JIT/JEA, PIM). Limits blast radius when an account is compromised.
- **Defense in Depth** — layered controls so one failure isn't fatal: email gateway → user training → EDR → application allow-listing → network segmentation → MFA → backups → SOC monitoring.
- **Zero Trust** — "never trust, always verify": every request is authenticated and authorised regardless of network location.

@@topic Threat actor types
| Actor | Motivation | Typical behaviour | SOC impact |
|---|---|---|---|
| Opportunistic / commodity | Money, volume | Mass phishing, scanning, off-the-shelf malware | High volume, usually caught by signatures |
| Cybercriminal / ransomware groups | Money | Initial access brokers → hands-on-keyboard → encryption | Fast escalation, hours not weeks |
| APT / nation-state | Espionage, sabotage | Stealthy, custom tooling, long dwell time, living off the land | Low-and-slow, needs hunting |
| Hacktivists | Ideology | DDoS, defacement, leaks | Public-facing assets |
| Insiders | Money, revenge, negligence | Legitimate access misused | Hard to detect — behaviour analytics, DLP |

@@topic The Cyber Kill Chain (Lockheed Martin)
1. **Reconnaissance** — harvesting emails, scanning, LinkedIn research.
2. **Weaponization** — building the payload (macro doc + implant). Happens on attacker side — you can't see it.
3. **Delivery** — email attachment, link, USB, watering hole, exposed service.
4. **Exploitation** — code runs: macro executes, vulnerability exploited, user enters creds.
5. **Installation** — persistence: implant, scheduled task, web shell.
6. **Command & Control (C2)** — beaconing to attacker infrastructure.
7. **Actions on Objectives** — exfiltration, encryption, destruction, lateral movement toward the goal.

Key insight: **break any link and you break the chain.** The earlier you detect, the cheaper the incident. The kill chain is linear and perimeter-focused — ATT&CK is the more granular, behaviour-based model used day to day.

@@topic MITRE ATT&CK — structure
- **Tactics** = the attacker's *goal* (the WHY) — 14 in the Enterprise matrix.
- **Techniques** = *how* they achieve it (T1059 Command and Scripting Interpreter).
- **Sub-techniques** = specific variants (T1059.001 PowerShell).
- **Procedures** = how a specific group actually did it.
- Also: **Groups** (APT29 = G0016), **Software** (Mimikatz = S0002), **Mitigations**, **Data Sources**.

**The 14 tactics in order:** Reconnaissance → Resource Development → Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Command and Control → Exfiltration → Impact.

Mnemonic help: group them into **Before** (Recon, Resource Dev), **Get in** (Initial Access, Execution), **Stay & grow** (Persistence, PrivEsc, Defense Evasion, Credential Access), **Explore & move** (Discovery, Lateral Movement), **Achieve** (Collection, C2, Exfiltration, Impact).

@@topic Two techniques per tactic — with detections
| Tactic | Example techniques | How you'd detect |
|---|---|---|
| Initial Access | T1566 Phishing, T1078 Valid Accounts | Email gateway verdicts, risky sign-ins |
| Execution | T1059.001 PowerShell, T1204 User Execution | 4104, Sysmon 1 parent/child |
| Persistence | T1053.005 Scheduled Task, T1547.001 Run Keys | 4698, Sysmon 13 |
| Privilege Escalation | T1068 Exploitation, T1548.002 UAC Bypass | EDR, unusual elevated processes |
| Defense Evasion | T1562.001 Disable AV, T1070.001 Clear Logs | Defender 5001, Event 1102 |
| Credential Access | T1003.001 LSASS dumping, T1110 Brute Force | Sysmon 10 on lsass, 4625 bursts |
| Discovery | T1087 Account Discovery, T1018 Remote System Discovery | `net user /domain`, `nltest` in 4688 |
| Lateral Movement | T1021.001 RDP, T1021.002 SMB/Admin Shares | 4624 type 10/3 across many hosts |
| Collection | T1560 Archive Data, T1114 Email Collection | 7z/rar creation, mailbox export |
| Command and Control | T1071.001 Web Protocols, T1071.004 DNS | Beaconing, rare domains |
| Exfiltration | T1567.002 Exfil to Cloud Storage, T1048 | Proxy bytes-out spikes |
| Impact | T1486 Data Encrypted for Impact, T1490 Inhibit Recovery | Mass file renames, `vssadmin delete shadows` |

**ATT&CK in the SIEM:** every detection rule should be tagged with its tactic/technique. Sentinel and Splunk ES both show coverage heatmaps from those tags — that's how a SOC finds its blind spots (Week 5's SOC problem).

@@topic Common attack patterns to recognise
1. **Phishing → macro → PowerShell → persistence → C2**
   `outlook.exe → winword.exe → cmd.exe → powershell -enc ... → schtasks /create → beacon to rare domain`
2. **Credential stuffing → account takeover → lateral movement**
   Many failed sign-ins across many users from rotating IPs → one success → mailbox rules / OAuth app consent → VPN → RDP to servers.
3. **Exploit public-facing app → web shell → privilege escalation**
   Scanning (`404` burst) → exploit (e.g. a CVE in a VPN appliance or web app) → `w3wp.exe` spawning `cmd.exe` → local privesc → domain compromise.

@@fieldnotes
- Use **The DFIR Report** (thedfirreport.com) weekly — real intrusions written up as timelines with ATT&CK mappings. It is the best free way to learn what attacks actually look like.
- In tickets, always write the technique ID *and* the name: "T1053.005 Scheduled Task". It makes your work searchable and reportable.
- Don't force-map. If you're unsure, map to the tactic and say "technique TBD" — wrong mappings mislead the people reading your report.
- MITRE ATT&CK Navigator (mitre-attack.github.io/attack-navigator) lets you build coverage heatmaps — great portfolio material.

@@lab Map a Real Attack to MITRE ATT&CK
Turn the framework into a working tool you can use on any incident.

@@step
Read the ATT&CK page for **APT29 (Cozy Bear)**: attack.mitre.org/groups/G0016. Note their known campaigns (SolarWinds/SUNBURST, phishing with ISO/LNK files).

@@step
Pick **3 techniques** APT29 uses. For each, write: (a) what it does in plain English (2 sentences), (b) which log source would show it, (c) a detection idea — what would the alert look for?

@@step
Open the **ATT&CK Navigator**, create a layer, and highlight APT29's techniques. Export a screenshot for your notes.

@@step
Complete the free **TryHackMe "MITRE" room**.

@@step
Take this attack chain: *Phishing email → user opens macro-enabled Word doc → PowerShell runs encoded command → downloads payload from external IP → creates scheduled task for persistence → connects to C2 server.* Map **each step** to a Tactic + Technique ID.

@@step
For each step of the chain, write the **Event ID or log source** you'd check (e.g. email gateway logs, Sysmon 1, 4104, Sysmon 3, 4698, proxy/firewall).

@@step
Identify the **earliest point you could have detected** the attack and the earliest point you could have **blocked** it. Explain the difference.

@@tips
**Model mapping for the chain in step 5**
| Step | Tactic | Technique | Evidence |
|---|---|---|---|
| Phishing email | Initial Access | T1566.001 Spearphishing Attachment | Email gateway, M365 message trace |
| User opens doc / macro | Execution | T1204.002 Malicious File | Sysmon 1: winword.exe |
| Encoded PowerShell | Execution / Defense Evasion | T1059.001, T1027 | 4104, Sysmon 1 (parent winword) |
| Downloads payload | Command and Control | T1105 Ingress Tool Transfer | Sysmon 3, proxy logs, Sysmon 11 |
| Scheduled task | Persistence | T1053.005 | 4698, Sysmon 1 schtasks.exe |
| C2 connection | Command and Control | T1071.001 | Proxy/firewall, beaconing analytics |

Earliest *detection*: email gateway verdict or "Office spawning PowerShell" (Sysmon 1). Earliest *block*: email attachment policies, or ASR rule "Block Office applications from creating child processes".

@@q
A ransomware group encrypts your company's file server. Which pillar of the CIA triad is primarily impacted?
@@answer
**Availability** — the files exist but can't be used. If the group also stole data before encrypting (double extortion, now the norm), **Confidentiality** is also impacted; and encryption modifies the data, so integrity is arguably affected too.
@@why
Interviewers like the nuance: say "primarily availability, and with modern double-extortion ransomware confidentiality too — so we'd investigate for exfiltration before assuming it's only an availability incident." That affects breach-notification obligations.
@@keywords availability

@@q
What's the difference between a Tactic and a Technique in MITRE ATT&CK?
@@answer
A **Tactic** is the attacker's tactical *goal* — the **why** (e.g. Persistence, Credential Access). A **Technique** is *how* they achieve it (e.g. T1053 Scheduled Task/Job achieves Persistence). Sub-techniques are more specific variants (T1053.005 Scheduled Task). One technique can serve several tactics (scheduled tasks also appear under Execution and Privilege Escalation).
@@why
Detections are built at the technique/sub-technique level; reporting and coverage are often summarised at the tactic level.
@@keywords why, how, goal

@@q
An attacker sends a phishing email with a malicious PDF. Map this to the Cyber Kill Chain stage.
@@answer
**Delivery** (stage 3). Building the malicious PDF was **Weaponization** (stage 2); when the user opens it and the exploit or embedded script runs, that's **Exploitation** (stage 4). In ATT&CK this is Initial Access — T1566.001 Spearphishing Attachment.
@@why
Delivery is the first stage the defender can actually see in their own logs (email gateway), which is why email security is such a high-value control.
@@keywords delivery

@@q
Name 3 different Persistence techniques from MITRE ATT&CK.
@@answer
1. **T1053.005 Scheduled Task/Job: Scheduled Task**
2. **T1547.001 Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder**
3. **T1543.003 Create or Modify System Process: Windows Service**

Others: T1136 Create Account, T1546.003 WMI Event Subscription, T1505.003 Web Shell, T1098 Account Manipulation (e.g. adding SSH keys), T1053.003 Cron.
@@why
Bonus points in interviews for naming the detection for each: 4698, Sysmon 13, 7045.
@@keywords scheduled task, run key, service, account, web shell, wmi, cron

@@q
What MITRE ATT&CK tactic covers an attacker running "whoami" and "net user /domain" on a compromised host?
@@answer
**Discovery (TA0007)** — `whoami` is T1033 System Owner/User Discovery and `net user /domain` is T1087.002 Account Discovery: Domain Account.
@@why
Discovery commands are noisy and cluster together in time — a great detection opportunity: "more than 3 distinct discovery binaries (whoami, net, nltest, ipconfig, systeminfo) from the same parent within 5 minutes".
@@keywords discovery

@@q
Explain Defense in Depth using a real example with at least 3 layers.
@@answer
Defense in Depth = multiple independent layers of control so a single failure doesn't lead to compromise. Example — stopping a phishing attack: (1) **Email gateway** strips the malicious attachment; if it slips through, (2) **user awareness training** helps the user report it; if they open it, (3) **ASR rules / macro blocking** stop Office spawning PowerShell; if that fails, (4) **EDR** detects and kills the payload; if C2 starts, (5) **egress filtering / proxy** blocks the unknown domain; and (6) **MFA** stops stolen passwords being reused, while (7) the **SOC** monitors all layers and (8) **offline backups** ensure recovery.
@@why
Mix control types: preventive, detective, corrective; technical and administrative.
@@keywords layer, email, edr, mfa, firewall, backup

@@q
An attacker uses stolen VPN credentials to access the network. Which kill chain stage is this, and which MITRE tactic?
@@answer
Kill chain: **Delivery/Exploitation** — the attacker is using the stolen credentials to gain entry (some analysts map it to Exploitation since no malware is "delivered"). MITRE: **Initial Access** via **T1078 Valid Accounts** (and T1133 External Remote Services). Once inside, the same valid accounts also provide **Persistence** and **Defense Evasion** because the activity looks legitimate.
@@why
This is why MFA on VPN is critical and why detections focus on sign-in anomalies: new country/ASN, impossible travel, first-time device, off-hours.
@@keywords initial access, valid accounts, t1078, delivery, exploitation

@@q
What is the difference between an APT and an opportunistic attacker? How does this change your SOC response?
@@answer
An **APT** is a well-resourced (often state-sponsored) group targeting *your* organisation specifically, with stealth, custom tools and long-term goals (espionage) — dwell time can be months. An **opportunistic attacker** goes after whoever is vulnerable, using commodity tools and mass campaigns, usually for quick profit. Response changes: for opportunistic threats you contain and eradicate quickly. For APTs you **scope carefully before acting** (they'll have multiple footholds and will notice), may observe to understand their access, involve senior IR/threat intel and possibly law enforcement, assume credentials are compromised widely, and coordinate a simultaneous eviction.
@@why
Premature containment against an APT tips them off and they burrow deeper; slow containment against ransomware means encryption. Know which you're facing.
@@keywords targeted, stealth, commodity, scope, dwell

@@q
You detect PowerShell running Invoke-Mimikatz. What MITRE ATT&CK tactic and technique is this?
@@answer
**Credential Access (TA0006)** — **T1003.001 OS Credential Dumping: LSASS Memory**. It also involves Execution via T1059.001 PowerShell (and often T1620 Reflective Code Loading).
@@why
Treat as P1: credentials on that host are compromised. Next steps: isolate the host, identify all accounts that had sessions on it (they're burned — reset them, including service and admin accounts), hunt for lateral movement using those accounts, and check for Kerberos ticket abuse.
@@keywords credential access, credential dumping, t1003, lsass

@@q
Why is "Actions on Objectives" the most dangerous kill chain stage, and what SOC controls can still help at this point?
@@answer
It's where the attacker **achieves their goal** — data is stolen, encrypted or destroyed — so actual business damage occurs. All earlier defences have already failed. Controls that still help: **DLP and egress monitoring** to catch/block exfiltration; **EDR ransomware behaviour detection** and automatic isolation; **network segmentation** to limit blast radius; **canary files/honeytokens**; **immutable, offline backups** for recovery; fast SOC response with **SOAR playbooks**; and a practised IR plan.
@@why
The SOC goal is to shift detection left (earlier stages), but you must still have controls that limit damage when prevention fails.
@@keywords damage, dlp, backup, segmentation, edr, exfil

@@problem The Phishing Campaign
@@scenario
Your email gateway flags **23 emails** sent to different employees in the last 30 minutes. Subject: *"Urgent: Review Updated Benefits Package."* All from `benefits-update@hr-portal-secure.com` (not your domain). **5 users clicked** the link, which led to a page asking for corporate credentials. **2 users entered their passwords.**
@@task Map this entire attack to the Cyber Kill Chain — which stages have occurred?
@@task Map each attacker action to a MITRE ATT&CK Tactic + Technique.
@@task Write your containment plan: what do you do in the first 15 minutes?
@@task For the 2 users who entered credentials: list every system and log you need to check.
@@task Draft a company-wide notification email (5 sentences) warning about this campaign without causing panic.
@@task What proactive detection rule would you create to catch similar attacks in the future?
@@deliverable
A full incident response write-up (1 page) with kill chain mapping, actions taken, and preventive recommendations.
@@approach
**Kill chain:** Reconnaissance (employee emails harvested) → Weaponization (look-alike domain + credential harvesting page) → Delivery (23 emails) → Exploitation (5 clicks, 2 credential submissions). Not yet confirmed: Installation, C2, Actions on Objectives — you must check.

**ATT&CK:** T1589.002 Gather Victim Identity Info: Email Addresses; T1583.001 Acquire Infrastructure: Domains; T1566.002 Spearphishing Link; T1204.001 User Execution: Malicious Link; T1056.003 / T1598.003 credential phishing via web portal; next likely T1078.004 Valid Accounts: Cloud Accounts.

**First 15 minutes:**
1. **Reset passwords + revoke sessions/refresh tokens** for the 2 users (Entra: *Revoke sessions*), confirm MFA methods weren't changed.
2. **Purge** all 23 emails from mailboxes (M365 Threat Explorer / `New-ComplianceSearchAction -Purge`).
3. **Block** the sender domain, the URL and the hosting IP at the email gateway, proxy and DNS.
4. Check sign-in logs for the 2 users since the click — any successful sign-ins from unfamiliar IPs?
5. Contact the 5 clickers; check for any attachment/download.

**Logs for the 2 users:** Entra ID sign-in logs (IPs, MFA result, user agent, location), Entra audit logs (MFA method added, app consent, role changes), M365 unified audit log (mailbox access, **inbox rules** created — forwarding/deletion rules are the classic BEC sign), Exchange message trace (did they send phishing internally?), SharePoint/OneDrive file access and sharing, VPN logs, EDR on their devices, any SaaS using SSO.

**Notification email (example):**
> Subject: Phishing alert — "Review Updated Benefits Package"
> This morning some colleagues received an email titled "Urgent: Review Updated Benefits Package" from hr-portal-secure.com, which is not a company domain. The email links to a fake login page designed to steal passwords. If you received it, please do not click the link and report it using the Report Phish button. If you already clicked or entered your password, contact the IT Service Desk at ext. 1234 immediately so we can secure your account. Our security team has already blocked the sender and removed the messages it could find — thank you for staying vigilant.

**Proactive detections:** inbound mail from domains **registered < 30 days** or look-alikes of your brand/HR terms; "email click followed by successful sign-in from a new IP/ASN within 60 minutes"; new inbox rule with forwarding to an external address; mass identical subject lines to many recipients from an external sender.
