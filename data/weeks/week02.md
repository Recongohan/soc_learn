@@week 2
@@month 1 FOUNDATIONS
@@title Windows & Linux Internals for SOC

@@concepts
Most SOC alerts point back to a Windows or Linux box. You need to know what **normal** looks like before you can spot **abnormal**. This week is about the logs, processes and persistence locations you'll touch on every shift.

@@topic Windows Event Log architecture
- **Security** — logons, privilege use, account management, process creation (if auditing enabled). Requires an *Audit Policy* — many events are off by default.
- **System** — services, drivers, shutdowns (7045 service installs live here).
- **Application** — app crashes, AV messages.
- **Microsoft-Windows-Sysmon/Operational** — rich process, network, file and registry telemetry (if Sysmon installed).
- **Microsoft-Windows-PowerShell/Operational** — Script Block Logging (4104).
- **Microsoft-Windows-Windows Defender/Operational** — detections (1116/1117), config changes (5001 real-time protection disabled, 5007 config/exclusion changed).

Files live in `C:\Windows\System32\winevt\Logs\*.evtx`. Event ID **1102** (Security log cleared) and **104** (System log cleared) are almost always worth an alert.

@@topic Critical Event IDs — know these cold
| Event ID | Meaning | Why it matters |
|---|---|---|
| 4624 | Successful logon | Check **Logon Type**: 2 interactive, 3 network, 4 batch, 5 service, 7 unlock, 10 RDP (RemoteInteractive), 11 cached |
| 4625 | Failed logon | Brute force / spraying. Check Status/SubStatus (0xC000006A bad password, 0xC0000064 no such user) |
| 4648 | Logon with explicit credentials | `runas`, PsExec — lateral movement |
| 4672 | Special privileges assigned | Admin-equivalent logon |
| 4688 | Process created | Needs "Audit Process Creation" + command line GPO |
| 4697 / 7045 | Service installed | Persistence, PsExec, malware |
| 4698 | Scheduled task created | Persistence |
| 4720 | User account created | Backdoor accounts |
| 4722 / 4724 | Account enabled / password reset | Account takeover |
| 4728 / 4732 / 4756 | Added to global / local / universal group | Privilege escalation |
| 4740 | Account locked out | Brute force side-effect |
| 4768 / 4769 | Kerberos TGT / service ticket | Kerberoasting (4769 with RC4 0x17) |
| 4776 | NTLM credential validation | Pass-the-hash, spraying on DCs |
| 1102 | Audit log cleared | Defense evasion |

**Sysmon IDs:** 1 process create (with hashes + parent), 3 network connection, 7 image loaded, 8 CreateRemoteThread, 10 process access (LSASS dumping), 11 file create, 12/13 registry, 22 DNS query.

@@topic Processes — normal vs suspicious
Learn the normal process tree:
```
System → smss.exe → csrss.exe / wininit.exe → services.exe → svchost.exe (many)
                                           → lsass.exe   (exactly ONE)
         winlogon.exe → userinit.exe → explorer.exe → user apps
```
Red flags:
- `svchost.exe` **not** spawned by `services.exe`, or running outside `C:\Windows\System32\`.
- Look-alikes: `scvhost.exe`, `svchost32.exe`, `lsas.exe`, `explore.exe`.
- Office apps (`winword.exe`, `excel.exe`, `outlook.exe`) spawning `cmd.exe`, `powershell.exe`, `wscript.exe`, `mshta.exe`.
- Anything running from `C:\Users\Public\`, `%TEMP%`, `AppData\Roaming`, `C:\ProgramData\` with a random name.
- **LOLBins** (Living off the Land binaries) used oddly: `certutil -urlcache -f`, `bitsadmin /transfer`, `regsvr32 /s /i:http`, `rundll32 javascript:`, `mshta http://`.

@@topic Windows persistence locations
- **Run keys:** `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and `RunOnce`, plus the `HKLM` equivalents (HKLM needs admin).
- **Scheduled tasks:** `schtasks /query /fo LIST /v`, Event 4698, files in `C:\Windows\System32\Tasks\`.
- **Services:** Event 7045/4697, `sc qc <name>`, `HKLM\SYSTEM\CurrentControlSet\Services`.
- **Startup folder:** `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`.
- **WMI event subscriptions** — fileless, stealthy (Sysmon 19/20/21).
- **Winlogon** `Userinit`/`Shell` values, **IFEO debugger** keys, DLL hijacking, new local admin accounts.

Tool to know: **Sysinternals Autoruns** — shows every autostart location on one screen.

@@topic PowerShell logging
- **Script Block Logging (4104)** — records the actual code executed, *after* de-obfuscation. The single most valuable PowerShell log.
- **Module Logging (4103)** — pipeline execution details.
- **Transcription** — full session text written to files.
- Enable via GPO: *Computer Configuration → Administrative Templates → Windows Components → Windows PowerShell*.

Suspicious strings: `-enc`/`-EncodedCommand`, `-nop -w hidden`, `IEX`, `Invoke-Expression`, `DownloadString`, `Net.WebClient`, `FromBase64String`, `Invoke-Mimikatz`, `bypass`. Attackers try `powershell -version 2` to dodge logging — alert on it.

@@topic Linux — logs, processes, persistence
**Logs:**
- `/var/log/auth.log` (Debian/Ubuntu) or `/var/log/secure` (RHEL) — SSH logins, `sudo`, `su`, user changes.
- `/var/log/syslog` or `/var/log/messages` — general system messages.
- `journalctl -u ssh --since "1 hour ago"` — systemd journal.
- `/var/log/audit/audit.log` — auditd (search with `ausearch -k <key>`).
- `last`, `lastb`, `who`, `w` — login history and failed logins.

**Processes & network:**
```bash
ps auxf                     # process tree
ls -l /proc/<pid>/exe       # real binary path (catches deleted binaries)
cat /proc/<pid>/cmdline | tr '\0' ' '
ss -tulnp                   # listening sockets + process
ss -tnp                     # established connections + process
lsof -i -p <pid>            # files/sockets for a pid
```

**Users:** `/etc/passwd` (look for new users, UID 0 besides root, login shells on service accounts), `/etc/shadow`, `/etc/group` and `/etc/sudoers` / `/etc/sudoers.d/`.

**Persistence:** cron (`/etc/crontab`, `/etc/cron.*`, `crontab -l -u <user>`, `/var/spool/cron/`), systemd units (`/etc/systemd/system/*.service`), `~/.bashrc` / `~/.profile`, `~/.ssh/authorized_keys` (attacker key!), `/etc/rc.local`, LD_PRELOAD.

**SUID:** `find / -perm -4000 -type f 2>/dev/null`. A SUID binary runs as its owner (often root) — an unexpected SUID copy of `bash`, `find` or `vim` is a privesc backdoor (check GTFOBins).

**History:** `~/.bash_history` — and note if it's empty, linked to `/dev/null`, or if `HISTFILE` was unset (anti-forensics).

@@fieldnotes
- In production you'll query these events in the SIEM, not Event Viewer — but building them yourself in a lab is how you learn what the fields mean.
- Logon Type is the most under-used field in junior triage. 4624 Type 10 from an unusual IP is RDP; Type 3 storms across many hosts suggest lateral movement.
- Always check the **parent process** and **command line**, not just the process name.
- Event ID 4688 without command-line auditing is half-blind — that GPO setting ("Include command line in process creation events") is one of the first things to check in a new environment.

@@lab Build a Windows + Linux Home Lab
Build the two machines you'll use for the rest of the course.

@@step
**Windows VM:** install Windows 10/11 Enterprise evaluation in VirtualBox or Hyper-V (4 GB RAM, 60 GB disk). Take a clean snapshot.

@@step
**Enable PowerShell Script Block Logging:** `gpedit.msc` → Computer Configuration → Administrative Templates → Windows Components → Windows PowerShell → *Turn on PowerShell Script Block Logging* = Enabled. Also enable "Include command line in process creation events" (Administrative Templates → System → Audit Process Creation) and Audit Process Creation in Advanced Audit Policy.

@@step
**Install Sysmon** with the SwiftOnSecurity config: download Sysmon from Sysinternals and `sysmonconfig-export.xml` from github.com/SwiftOnSecurity/sysmon-config, then run `Sysmon64.exe -accepteula -i sysmonconfig-export.xml`.

@@step
Verify Sysmon is logging: Event Viewer → Applications and Services Logs → Microsoft → Windows → **Sysmon → Operational**. Open Notepad and find its Event ID 1.

@@step
**Linux VM:** install Ubuntu Server 22.04/24.04 (2 GB RAM). Enable SSH. Snapshot.

@@step
**Enable auditd:** `sudo apt install auditd -y`, then add rules in `/etc/audit/rules.d/lab.rules`:
```
-w /etc/passwd -p wa -k user_mod
-w /etc/shadow -p wa -k user_mod
-w /etc/sudoers -p wa -k sudoers
-a always,exit -F arch=b64 -S execve -k exec
```
Load with `sudo augenrules --load`.

@@step
**Configure rsyslog forwarding** (you'll point this at Splunk in Week 7): add `*.* @@<collector-ip>:514` to `/etc/rsyslog.d/50-forward.conf` and `sudo systemctl restart rsyslog`.

@@step
**Generate suspicious activity on Windows** (admin PowerShell):
```powershell
Invoke-WebRequest -Uri "http://example.com/payload.exe"
net user hacker Password123! /add
net localgroup administrators hacker /add
schtasks /create /tn "Updater" /tr "notepad.exe" /sc onstart /ru SYSTEM
```

@@step
**Find ALL of these events** in Event Viewer (Security, Sysmon, PowerShell logs). For each record Event ID, timestamp, log source and key fields. Expect 4104, Sysmon 1/3/22, 4720, 4732, 4698.

@@step
**Generate suspicious activity on Linux:**
```bash
sudo useradd -m -s /bin/bash backdoor && sudo usermod -aG sudo backdoor
(crontab -l 2>/dev/null; echo "* * * * * /usr/bin/id > /tmp/cron.txt") | crontab -
curl http://example.com
find / -perm -4000 -type f 2>/dev/null
```
Find each one in `auth.log`, `syslog` and `ausearch -k user_mod` / `ausearch -k exec`.

@@step
Write a one-page "what I found where" table — this becomes the first doc in your GitHub portfolio's `/lab-setup` folder.

@@tips
**Handy Windows commands for finding your own events quickly**
```powershell
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4720,4732} -MaxEvents 10 | fl
Get-WinEvent -LogName 'Microsoft-Windows-Sysmon/Operational' -MaxEvents 20 |
  Where-Object Id -eq 1 | Select TimeCreated, Message
Get-WinEvent -LogName 'Microsoft-Windows-PowerShell/Operational' |
  Where-Object Id -eq 4104 | Select -First 5 -ExpandProperty Message
```
Revert to your clean snapshot after each lab so leftover "attacker" accounts don't confuse future exercises.

@@q
You see Event ID 4625 appearing 47 times in 2 minutes from the same source IP against a domain admin account. What's happening and what do you do?
@@answer
A **brute-force / password-guessing attack** against a high-value account (T1110). Steps: identify the source IP (internal or external? which host?), check for any **4624 success** from the same IP/account afterwards, check the Status/SubStatus codes, look for **4740 lockouts**, check whether the same IP is targeting other accounts (spraying), and enrich the IP. Because it's a domain admin, treat it as high priority: block the source, escalate, and confirm with the account owner. If a success followed, it becomes an incident — reset the password, revoke sessions and investigate everything that account did.
@@why
Account criticality drives severity. An internal source IP means a compromised machine is attacking — that host needs investigating too. Also question why a domain admin account is exposed to wherever the IP came from (e.g. RDP open to the internet).
@@keywords brute force, 4624, source ip, lockout, escalate

@@q
What is Sysmon and why is it better than default Windows logging for SOC work?
@@answer
**Sysmon (System Monitor)** is a free Microsoft Sysinternals driver/service that logs detailed endpoint activity to its own event log: process creation **with full command line, hashes and parent process** (EID 1), network connections per process (EID 3), file creation (11), registry changes (12–14), DNS queries (22), process access e.g. to LSASS (10), remote thread injection (8), WMI persistence (19–21). Default Windows logging lacks most of this or needs extra configuration, and doesn't tie network connections to processes.
@@why
It's configurable via XML (SwiftOnSecurity, Olaf Hartong's sysmon-modular) to keep noise down. Many SIEM detections — and most community Sigma rules — are written against Sysmon fields. In EDR-heavy environments the EDR provides similar telemetry, but Sysmon is the free baseline.
@@keywords process, command line, hash, network, parent

@@q
Name 3 places malware commonly persists on a Windows system.
@@answer
1. **Registry Run keys** — `HKCU\...\CurrentVersion\Run` / `RunOnce` (and HKLM). T1547.001
2. **Scheduled Tasks** — `schtasks`, Event 4698. T1053.005
3. **Services** — new service, Event 7045/4697. T1543.003

Also: the Startup folder, WMI event subscriptions (T1546.003), new local admin accounts (T1136), Winlogon keys, DLL hijacking.
@@why
Sysinternals Autoruns checks all of these at once. In a SIEM, alert on new Run key values (Sysmon 13), task creation and service installs pointing to user-writable paths.
@@keywords run key, scheduled task, service, startup, registry

@@q
You see Event ID 4688 showing cmd.exe spawning powershell.exe which then spawns whoami.exe. Is this normal? What attack stage might this be?
@@answer
Not normal for a typical user. `whoami` is a classic first command after gaining access — the attacker checking *who they are running as* and what privileges they have. This is **Discovery** (MITRE TA0007, T1033 System Owner/User Discovery), and the cmd → powershell chain indicates **Execution** (T1059.001 / T1059.003). Check the **parent of cmd.exe** — if it's `winword.exe`, `outlook.exe`, `w3wp.exe` or similar, it's very likely malicious.
@@why
Admins do run whoami, so context matters: user, host, time, parent process and what ran next (`net user`, `ipconfig`, `nltest /dclist`). A burst of discovery commands within seconds is a strong hands-on-keyboard signal.
@@keywords discovery, parent, execution, whoami, privileges

@@q
Where would you look on a Linux system to see if someone added a backdoor user?
@@answer
- `/etc/passwd` — new entries, **any account other than root with UID 0**, service accounts with a real shell (`/bin/bash`).
- `/etc/shadow` — accounts with passwords that shouldn't have them.
- `/etc/group` and `/etc/sudoers` / `/etc/sudoers.d/` — new sudo/wheel members.
- `/var/log/auth.log` or `/var/log/secure` — `useradd`, `usermod`, `passwd` entries.
- `~/.ssh/authorized_keys` for every user — an attacker key gives access without a password.
- auditd: `ausearch -k user_mod`. Also `last` / `lastlog` for logins by the new account.
@@why
`awk -F: '$3 == 0' /etc/passwd` lists every UID-0 account in one command. Compare against a known-good baseline or config management.
@@keywords /etc/passwd, uid 0, shadow, sudoers, auth.log, authorized_keys

@@q
What's the difference between /var/log/auth.log and /var/log/syslog?
@@answer
`/var/log/auth.log` contains **authentication and authorization events**: SSH logins (success/failure), `sudo` and `su` usage, PAM messages, user/group changes. `/var/log/syslog` is the **general system log**: kernel, services, cron, daemons, network, applications. On RHEL/CentOS the equivalents are `/var/log/secure` and `/var/log/messages`.
@@why
For "who logged in / who used sudo" go to auth.log first. For "what did the system or a service do" (cron execution, service crashes) use syslog. On systemd systems `journalctl` aggregates both.
@@keywords authentication, ssh, sudo, general, system

@@q
You see a PowerShell command with -EncodedCommand followed by a Base64 string. Why is this suspicious and how would you decode it?
@@answer
`-EncodedCommand` (`-enc`, `-e`) runs a Base64-encoded command — commonly used to **hide the real command** from casual inspection and simple string-based detections (T1027 Obfuscated Files or Information, T1059.001). Some legitimate tools use it, but it's a top malware indicator. Decode it — PowerShell expects **UTF-16LE**:
```powershell
[System.Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("<b64>"))
```
or in CyberChef: *From Base64 → Decode text (UTF-16LE)*. Also check Event ID **4104**, which logs the decoded script block.
@@why
Decoded payloads often contain a download cradle like `IEX (New-Object Net.WebClient).DownloadString('http://...')`. Extract the URL/IP as IOCs and check what the host downloaded next.
@@keywords base64, obfuscat, decode, utf-16, 4104, cyberchef

@@q
What is a SUID binary and why should a SOC analyst care about it?
@@answer
A SUID (Set User ID) binary **executes with the permissions of its owner** rather than the user running it — e.g. `/usr/bin/passwd` runs as root so users can change their password. If an attacker can abuse a SUID-root binary (or plant one, like a SUID copy of `/bin/bash`), they get **privilege escalation to root** (T1548.001). Find them with `find / -perm -4000 -type f 2>/dev/null` and compare against a baseline.
@@why
GTFOBins lists which binaries can be abused when SUID (find, vim, nmap, python…). A new SUID file in `/tmp` or a home directory is a near-certain backdoor.
@@keywords owner, root, privilege escalation, find / -perm

@@q
Event ID 7045 fires showing a new service installed called "WindowsUpdateHelper" that runs from C:\Users\Public. Red flag or normal?
@@answer
**Red flag.** Legitimate services run from `C:\Windows\System32\` or `C:\Program Files\`; `C:\Users\Public\` is world-writable and a favourite malware drop location. The name mimics a legitimate Windows component (masquerading, T1036). This looks like **service-based persistence** (T1543.003) or remote execution (PsExec-style). Check: who installed it (4697 / the logon session), the binary hash on VirusTotal, the service account it runs as, network connections from it, and whether the same service appears on other hosts.
@@why
Service installation needs admin rights — so the attacker already has elevated access. Scope immediately for the same service name or hash across the estate.
@@keywords persistence, masquerad, path, users\public, hash

@@q
How would you check what network connections a suspicious process on Linux is making?
@@answer
- `ss -tnp | grep <pid>` or `ss -tulnp` (listening + established, with process names).
- `netstat -antp` (older systems).
- `lsof -i -a -p <pid>` — network files for that PID.
- `ls -l /proc/<pid>/fd` and `cat /proc/net/tcp` for low-level checks.
- For live traffic: `tcpdump -nn -i any host <remote-ip>`.
- EDR / auditd (`-S connect` syscall rules) for historical data.
@@why
Also confirm the binary behind the PID (`ls -l /proc/<pid>/exe`) — if it shows `(deleted)` the malware deleted itself from disk while still running; copy it out from `/proc/<pid>/exe` before it's gone.
@@keywords ss, netstat, lsof, /proc

@@problem The New Admin Account
@@scenario
It's **2 AM** and an alert fires: *"New local administrator account created on SERVER-DB-03"* (Event ID **4720** followed by **4732** — user added to Administrators group). The account name is `svc_backup02`. **No change request** exists for this server tonight. The creating account is `DOMAIN\jsmith` — a help desk technician who **shouldn't have server admin rights**.
@@task List your first 5 investigation steps in order.
@@task What additional Event IDs would you look for on this server in the same time window?
@@task Check if jsmith's account shows signs of compromise — what would you look for?
@@task Write a severity assessment: is this P1, P2, P3, or P4? Justify it.
@@task Draft the incident ticket with: summary, affected assets, evidence collected, containment steps recommended.
@@task Should you disable jsmith's account immediately? What are the risks either way?
@@deliverable
A 1-page incident ticket ready for Tier 2 review.
@@approach
**First 5 steps:**
1. Confirm the alert — pull 4720/4732 raw events: exact time, `SubjectUserName` (jsmith), `SubjectLogonId`, target account.
2. Find **how jsmith logged on to SERVER-DB-03** — 4624 with the same Logon ID: logon type (10 = RDP, 3 = network), source IP/workstation.
3. Check how jsmith got admin rights — group changes (4728/4732/4756) on the DC for jsmith in the last days; 4672 at logon.
4. Everything else that session did — 4688/Sysmon 1 processes, 7045 services, 4698 tasks, 1102 log clears, outbound connections, database access.
5. Check jsmith's identity activity — Entra/AD sign-ins: time, IP, geo, MFA, impossible travel; whether jsmith is on shift; ask the help desk lead discreetly.

**Additional Event IDs:** 4624/4625/4648 (logons, explicit creds), 4672 (admin logon), 4688 (process creation), 4697/7045 (services), 4698 (scheduled tasks), 4724/4738 (password reset/account changed), 4732/4728 (more group changes), 1102 (log cleared), Sysmon 1/3/10/11.

**Signs jsmith is compromised:** logons at 2 AM vs normal shift; source IP not jsmith's workstation or from VPN/abroad; recent failed logons/lockouts; new MFA device registered; recent phishing click; mailbox rules; jsmith's workstation showing malware or credential dumping (Sysmon 10 on lsass).

**Severity: P1 (or high P2 at minimum).** An unauthorised privileged account on a **database server**, created by an account that shouldn't have that privilege, outside change control, at 2 AM = likely privilege escalation + persistence on a critical asset holding sensitive data. Insider misuse is also possible.

**Ticket skeleton:**
- *Summary:* At 02:03 an unauthorised local admin `svc_backup02` was created on SERVER-DB-03 by DOMAIN\jsmith via RDP from 10.0.5.44; no CR exists and jsmith is not authorised for server admin.
- *Affected assets:* SERVER-DB-03, DOMAIN\jsmith, svc_backup02, source host 10.0.5.44.
- *Evidence:* event IDs + timestamps, logon session details, process list, screenshots/queries.
- *Recommended containment:* disable svc_backup02, remove it from Administrators, disable/reset jsmith (after coordinating), isolate the source host if malicious, block lateral paths, preserve logs.

**Disable jsmith now?** *Yes, in most cases* — an attacker with a live privileged foothold on a DB server outweighs the cost. Risks of disabling: tipping off an attacker (they may switch to svc_backup02 — so disable **both** together), disrupting a legitimate emergency fix if someone forgot the CR, and losing observation. Risks of not disabling: data theft, ransomware staging, further accounts created. Best practice: get Tier 2/lead approval quickly, disable both accounts **simultaneously**, kill sessions, and document the decision.
