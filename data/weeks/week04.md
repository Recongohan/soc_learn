@@week 4
@@month 1 FOUNDATIONS
@@title Log Analysis & Event Correlation

@@concepts
SOC work is log work. Around **80% of a shift** is reading, filtering and correlating logs from different sources to piece together what happened. A single log tells you **what**; correlation tells you the **story**.

@@topic Log sources SOC analysts use daily
| Source | Key fields | Answers the question… |
|---|---|---|
| Windows Security / Sysmon / PowerShell | EventID, Account, LogonType, Process, CommandLine, ParentProcess | What ran, who logged on, how |
| Firewall | src/dst IP, port, action, bytes, rule | Who talked to whom, was it allowed |
| Web proxy | user, URL, category, method, bytes out/in, user agent | What sites, what was uploaded |
| Email gateway | sender, recipient, subject, attachment hash, URL, verdict | Who got what, who clicked |
| EDR | process tree, file/registry/network per process, detections | What happened on the endpoint |
| Cloud audit (Entra ID, M365, AWS CloudTrail) | user, IP, app, result, MFA, operation | Identity & SaaS activity |
| VPN | user, source IP, assigned IP, duration, bytes | Who connected remotely, from where |
| DNS | client IP, query, response, type | What domains a host resolved |
| DHCP | IP, MAC, hostname, lease time | Which device had this IP at this time |
| Badge / physical access | badge ID, door, time | Was the person physically present |

**Timestamps:** always check the **timezone** of each source (UTC vs local). Normalise everything to UTC in your timeline, or you'll build a story that's off by hours.

@@topic Event correlation — connecting the dots
- **Time-based correlation:** events from different sources within the same window (e.g. ±5 minutes around the alert).
- **Entity-based correlation:** the same **user, IP, hostname, hash, or domain** across logs. Entities are the joins of your investigation.
- **Sequence correlation:** A then B then C in order (failed logins → success → new process).

**Worked example:**
1. VPN log: 6 failed logins for `a.khan` from 91.215.x.x (Romania), then success at 02:15.
2. VPN log: assigned internal IP 10.8.0.23.
3. DHCP/VPN: 10.8.0.23 → session on `WS-FIN-07` via RDP (4624 type 10).
4. Sysmon 1 on WS-FIN-07: `powershell.exe -enc ...` at 02:19.
5. Firewall: WS-FIN-07 → 45.33.x.x:443 (known C2 in TI) at 02:20.

Individually each is "medium". Together: **compromised account doing post-exploitation** — P1.

@@topic Analysis techniques
- **Baselining** — know normal first: how many logons per day does this user have? Which countries? Which processes run on this server? Without a baseline, everything or nothing looks suspicious.
- **Stacking (frequency analysis)** — count occurrences and sort; the rare items are interesting. "Which parent processes spawned PowerShell across 5,000 hosts?" — the one seen on 2 hosts is your lead.
- **Time-lining** — arrange events chronologically across sources. Build the table: `Time (UTC) | Source | Entity | Event | Notes`.
- **Pattern matching** — regex for IPs `\b\d{1,3}(\.\d{1,3}){3}\b`, Base64 blobs `[A-Za-z0-9+/]{40,}={0,2}`, hashes `\b[a-fA-F0-9]{64}\b`, domains.
- **Pivoting** — from one finding to the next: alert → host → user → other hosts that user touched → processes there → IPs contacted → other hosts contacting those IPs.
- **Long-tail / outlier analysis** — bytes out per host per day, sorted descending.

@@topic Logs vs events vs alerts
- **Log** — a raw record that something happened.
- **Event** — an observable occurrence (often one log line).
- **Alert** — a log/event (or combination) that **matched a detection rule** and needs human attention.
- **Incident** — one or more alerts confirmed (or highly likely) to be a security problem, grouped for response.

@@topic Beaconing — the C2 fingerprint
Malware calls home on a schedule: every 60s, every 5 min, with jitter. Signals:
- Regular intervals between connections (low standard deviation).
- Consistent small byte sizes.
- Rare destination (few hosts in the org talk to it).
- Long-running: continues outside business hours.

RITA (Real Intelligence Threat Analytics) and SIEM queries using `bin()` + `stdev()` find this.

@@fieldnotes
- The most common junior mistake: escalating a single log line without context. The second most common: closing an alert because one source looked clean while another source showed the compromise.
- Write down every query you ran in the ticket. Senior analysts (and auditors) need to see *how* you reached the conclusion, not just the conclusion.
- Clock skew and timezone mismatches have ruined many timelines. State the timezone in every timeline header.
- "Absence of evidence" — check whether the log source was actually *collecting* during the window before concluding "nothing happened".

@@lab Correlate a Multi-Source Attack
Use your Week 2 Windows VM (Sysmon + PowerShell logging enabled). You'll attack yourself, then investigate your own attack like a stranger did it. Note the exact time you start.

@@step
**Simulate the phishing click:** open a browser and visit `http://example.com`.

@@step
**Simulate the payload drop:** in PowerShell run `New-Item -Path C:\Users\Public\update.txt -Value "simulated payload"`.

@@step
**Simulate persistence:** `schtasks /create /tn "SystemUpdate" /tr "C:\Users\Public\update.txt" /sc onlogon` (admin prompt).

@@step
**Simulate a backdoor account:** `net user backdoor Pass123! /add`.

@@step
**Simulate discovery:** run `whoami`, `ipconfig /all`, `net user`, `net localgroup administrators`.

@@step
**Investigate:** in Event Viewer (or PowerShell `Get-WinEvent`), find EVERY event related to the above across Security, Sysmon and PowerShell logs. For each, record Timestamp, Event ID, Log Source, Details.

@@step
**Build the timeline** in a table: `Time | Source | Event ID | What Happened` in chronological order.

@@step
**Correlate:** mark which events belong to the same chain — what common fields (Logon ID, ProcessGuid, ParentProcessId, user) link them?

@@step
**Write the investigation summary:** a 5-sentence attack narrative, the MITRE mapping for each step, and the detection rule that would have caught this earliest.

@@tips
**Pull everything in one go with PowerShell**
```powershell
$start = (Get-Date).AddHours(-1)
$logs = 'Security','Microsoft-Windows-Sysmon/Operational','Microsoft-Windows-PowerShell/Operational'
Get-WinEvent -FilterHashtable @{LogName=$logs; StartTime=$start} |
  Where-Object { $_.Id -in 1,3,11,22,4104,4688,4698,4720,4732 } |
  Sort-Object TimeCreated |
  Select-Object TimeCreated, LogName, Id, @{n='Msg';e={($_.Message -split "`n")[0..3] -join ' | '}} |
  Export-Csv timeline.csv -NoTypeInformation
```
Sysmon's **ProcessGuid** and **ParentProcessGuid** are the best fields for stitching a process chain together — better than PIDs, which get reused.

@@q
You have firewall logs showing outbound traffic to IP 45.33.xx.xx on port 443 from host 10.0.1.15. What other log source would you check to find out WHAT was sent?
@@answer
The **web proxy logs** (URL, domain/SNI, HTTP method, bytes sent/received, user agent, user) and the **EDR/Sysmon network telemetry** (which *process* made the connection — Sysmon Event ID 3). If TLS inspection is in place, the proxy can show full URLs; otherwise use SNI, certificate details and bytes out. DNS logs show which domain resolved to that IP. Full packet capture/NDR (Zeek) if available. DHCP to confirm which device was 10.0.1.15 at that time.
@@why
Firewall logs are L3/L4 — they tell you *who talked to whom*, not *what*. Bytes-out vs bytes-in ratio is the quickest exfil indicator.
@@keywords proxy, edr, sysmon, process, dns, bytes

@@q
A user reports their email was hacked. What 3 log sources would you check first and what would you look for in each?
@@answer
1. **Identity sign-in logs (Entra ID / AD FS)** — sign-ins from unusual IPs, countries, ASNs, impossible travel, legacy auth (IMAP/POP bypassing MFA), MFA failures/prompts, new devices.
2. **Mailbox audit / M365 Unified Audit Log** — new **inbox rules** (forward to external, delete/move to RSS folder), mail forwarding settings, `MailItemsAccessed`, `Send` events, delegated access, OAuth app consents.
3. **Message trace / email gateway logs** — emails sent by the account (internal phishing, invoice fraud), and the phishing email they may have received that started it.
@@why
Also check audit logs for MFA method changes and password resets. The fix is: reset password, revoke sessions, remove malicious rules/apps, review MFA, and check whether the account was used to phish others.
@@keywords sign-in, inbox rule, forward, audit, message trace, mfa

@@q
Explain the difference between a log and an alert. When does a log become an alert?
@@answer
A **log** is a raw record of an event (e.g. a 4625 failed logon). An **alert** is generated when one or more logs **match a detection rule or condition** that indicates potentially malicious activity requiring human attention (e.g. "20+ 4625s from one IP in 5 minutes"). A log becomes an alert when the SIEM/EDR evaluates it against analytics — thresholds, signatures, correlations, anomaly models, or threat-intel matches — and the condition is met.
@@why
Most logs never become alerts — and that's correct. A good detection engineer decides *which patterns* justify waking up an analyst.
@@keywords rule, condition, threshold, detection, match

@@q
You see 500 failed SSH login attempts from IP 203.0.113.45 in 10 minutes, then one successful login. Write the correlation rule in plain English that would catch this.
@@answer
"Alert when a **single source IP** generates **more than N (e.g. 20) failed SSH authentications** within **10 minutes**, **followed by a successful SSH authentication from the same source IP** within 10 minutes of the last failure. Include the target username(s), host, counts and timestamps; severity High (Critical if the account is privileged/root or the host is internet-facing production)."
@@why
The success after failures is what turns noise into an incident. Variants: success for *any* user from that IP (password spraying), or success from a different IP for the same user shortly after.
@@keywords failed, same ip, followed by, success, threshold, window

@@q
What is log baselining and why is it important? Give an example.
@@answer
Baselining is **establishing what normal activity looks like** for a user, host, application or network over time (volumes, times, locations, processes, destinations) so that **deviations stand out**. Example: a finance server normally sends ~200 MB/day outbound to two backup IPs; a day with 8 GB to a new external IP is an obvious anomaly. Or: user X always signs in from Dubai between 08:00–18:00 — a 03:00 sign-in from another country deviates from baseline.
@@why
Without baselines, you can't tune rules or judge whether a value is high. UEBA tools automate per-entity baselines; analysts should still know the baselines of critical systems.
@@keywords normal, deviation, anomaly

@@q
You're investigating a potential data exfiltration. The suspect host is 10.0.2.30. List the log sources you'd query and what you'd look for in each.
@@answer
- **Proxy:** large uploads (bytes out), POST/PUT to cloud storage, file-sharing, paste sites; unusual categories.
- **Firewall/NetFlow:** high outbound volume, unusual ports/protocols, long sessions, new external destinations.
- **DNS:** tunneling patterns (long subdomains, high volume to one domain), queries for file-sharing services.
- **EDR/Sysmon:** which process sent data; archive tools (7z, rar, `Compress-Archive`), `rclone`, `curl`, `scp`; files staged in temp dirs.
- **File server / SharePoint audit logs:** mass file access or downloads before the upload.
- **Email gateway:** large attachments to external/personal addresses.
- **DLP:** sensitive-data matches. **USB/device control logs:** removable media writes.
- **Identity/VPN:** who was logged in, from where; **DHCP** to confirm the host had that IP.
@@why
Exfil usually has three phases — collection, staging (compression), transfer. Look for all three.
@@keywords proxy, firewall, dns, edr, file, dlp, usb, bytes

@@q
What's the difference between real-time alerting and retrospective log analysis? When would you use each?
@@answer
**Real-time alerting** evaluates events as they arrive (or within minutes) to trigger immediate response — used for known-bad patterns where speed matters: ransomware behaviour, brute force, TI matches, privileged group changes. **Retrospective analysis** searches historical logs after the fact — used for investigations (scoping an incident), **threat hunting**, newly published IOCs ("did we ever talk to this IP in the past 90 days?"), and building baselines.
@@why
Both depend on retention — if you only keep 30 days of logs, a 90-day-old intrusion is invisible. That's why log retention policy is a security decision, not just a cost one.
@@keywords immediate, historical, hunting, investigation, ioc

@@q
An EDR alert says "Suspicious PowerShell execution" on HOST-FIN-01 at 14:32. What logs from OTHER sources would you pull to build context?
@@answer
Around 14:32 (±30–60 min): **Identity logs** — who was logged on, logon type, from where (4624, Entra sign-ins). **Email logs** — did that user receive/open an attachment or link just before? **Proxy/DNS** — downloads and domains contacted before and after. **Firewall** — outbound connections/C2, internal SMB/RDP to other hosts. **PowerShell 4104** — the decoded script. **Other EDR alerts** on the same host/user. **Asset inventory/CMDB** — what HOST-FIN-01 is and who owns it. **Change management** — any scheduled admin work? **Threat intel** — enrich any URLs/hashes.
@@why
You're answering: how did it start, what did it do, did it spread, and is it legitimate admin activity?
@@keywords email, proxy, dns, firewall, sign-in, 4104, user

@@q
You notice a pattern: every weekday at 03:00, a workstation makes HTTPS connections to a single external IP for exactly 60 seconds. Normal or suspicious? What's your investigation plan?
@@answer
**Suspicious until proven otherwise** — it looks like **beaconing / scheduled C2 check-in**, though it could be a legitimate scheduled job (backup agent, updater, telemetry). Plan: (1) identify the process making the connection (EDR/Sysmon 3); (2) check scheduled tasks/services on the host for a 03:00 trigger; (3) enrich the IP/domain — reputation, WHOIS, certificate, ASN, domain age; (4) stack: how many other hosts talk to this IP? (a vendor update server will be hit by many, C2 by few); (5) check bytes in/out; (6) verify the binary's signature/hash; (7) confirm with the asset owner/IT whether a job is expected.
@@why
Regularity + rarity + off-hours is the classic beacon signature. If the process is unsigned and lives in a user-writable path, escalate.
@@keywords beacon, process, scheduled, reputation, other hosts

@@q
Explain "lateral movement" in terms of the logs you'd see across multiple hosts.
@@answer
Lateral movement is an attacker moving from one compromised host to others (MITRE TA0008). In logs: **4624 Logon Type 3 (network) or 10 (RDP)** on many destination hosts from one source host/account in a short window; **4648** explicit credential use on the source; **7045/4697** new services on destinations (PsExec — `PSEXESVC`); **4698** remote scheduled tasks; **WMI/WinRM** (`wmiprvse.exe` or `wsmprovhost.exe` spawning processes); **SMB 445 / RDP 3389 / WinRM 5985** connections between workstations in firewall/NetFlow; admin share access `\\host\ADMIN$`, `C$` (5140/5145); NTLM 4776 or Kerberos 4769 spikes on the DC.
@@why
Key detection: one account authenticating to many hosts it has never touched before, or workstation-to-workstation admin protocols (workstations rarely need to talk to each other).
@@keywords 4624, logon type, rdp, smb, psexec, many hosts, 4648

@@problem The After-Hours Data Transfer
@@scenario
The proxy log dashboard shows a spike: endpoint **LAPTOP-MKT-09** (assigned to a marketing intern) **uploaded 2.3 GB** to an external cloud storage service **between 01:00 and 03:00** last night. The intern's **badge log shows they left the building at 18:30**. **VPN logs** show a connection from their account starting at **00:45** from an IP geolocated to a **different city**.
@@task Map out every log source you need to query and write the specific query/filter for each.
@@task Build a timeline of events from all available logs.
@@task Determine: is this the intern working remotely, or is this a compromised account?
@@task What additional evidence would definitively answer that question?
@@task Write the correlation rule that would have caught this proactively.
@@task Draft the complete incident report: Executive Summary (3 sentences), Timeline, Evidence, Assessment (compromised vs legitimate), Recommended Actions.
@@deliverable
A 1.5-page incident report with correlated timeline from at least 4 log sources.
@@approach
**Sources + filters:**
- *Proxy:* `src_host=LAPTOP-MKT-09 earliest=-24h | stats sum(bytes_out) by dest_domain, url, user` — what service, which account on the service, file names if visible.
- *VPN:* user=intern, last 30 days — normal source IPs/cities/times vs. last night; device posture / client hostname.
- *Identity (Entra/AD):* sign-ins for the intern 00:00–04:00 — MFA result, device, user agent; any sign-ins from the other city before.
- *EDR on LAPTOP-MKT-09:* processes 00:45–03:00 — browser vs `rclone.exe`/sync client, archiving (7z), RDP/remote tools (AnyDesk, TeamViewer).
- *File server / SharePoint audit:* files accessed or downloaded by the intern in the 24h before the upload.
- *Badge:* left 18:30 — did the laptop leave too? *DHCP/Wi-Fi:* was the laptop on the office network or at home?
- *Email/HR:* is the intern travelling, leaving, under PIP? Was the laptop reported lost?

**Timeline example (UTC+4):** 18:30 badge out → 00:45 VPN connect from City B → 00:52 SharePoint mass download of 1,800 files from /Marketing/Campaigns → 01:00–03:00 2.3 GB upload to personal Dropbox → 03:05 VPN disconnect.

**Assessment logic:** *Legitimate* if the intern is known to be in City B (travel, home town), uses their managed laptop (device ID matches), MFA was satisfied on their usual phone, and the data is their own working files going to a sanctioned service. *Compromised/insider* if MFA was via a new device, the user agent/device doesn't match, the cloud account isn't corporate, the files are sensitive and outside their role, or the intern denies it.

**Definitive evidence:** MFA device and method used; device compliance/hostname of the VPN client; the destination cloud account identity; file names/classification; a **verified out-of-band conversation** with the intern and their manager (call their known phone, not via email).

**Correlation rule:** "Alert when a user uploads > 500 MB to cloud storage within 2 hours **AND** the session originates from a VPN sign-in from a location not seen for that user in 30 days **OR** occurs outside the user's normal working hours." Bonus: weight higher for interns/contractors/leavers (watchlist).

**Recommended actions:** suspend the cloud-storage destination (block the domain/instance), disable VPN for the account pending verification, reset credentials and revoke sessions if compromise is suspected, preserve proxy/EDR/audit logs, notify HR/Legal if insider, and assess data classification for notification obligations.
