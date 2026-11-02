@@week 10
@@month 3 IR & JOB READINESS
@@title Malware Analysis & Forensics Basics

@@concepts
As a SOC analyst you won't do deep reverse engineering, but you must perform **malware triage**: what is this file, what does it do, how far has it spread, and should I be worried? You'll also do **basic forensics** to support IR. **Safety first**: only handle live malware in an isolated VM with no shared folders/clipboard, host-only or no networking, and snapshots.

@@topic Types of malware
| Type | What it does | Typical SOC signal |
|---|---|---|
| Ransomware | Encrypts (and usually steals) data, demands payment | Mass file renames, shadow-copy deletion |
| Trojan / loader | Disguised as legit software; delivers other payloads | Unsigned binary from a download/email |
| RAT | Remote control (keylogging, screen, shell) | Persistent beaconing, odd parent processes |
| Worm | Self-propagates across networks | Many hosts infected quickly, SMB/RDP scans |
| Rootkit / bootkit | Hides presence at kernel/boot level | Hard to see from the OS — memory/offline analysis |
| Fileless | Lives in memory, abuses PowerShell/WMI/LOLBins | 4104 script blocks, WMI persistence, no file on disk |
| Cryptominer | Steals CPU/GPU to mine crypto | High CPU, connections to mining pools (:3333, :4444, :5555, stratum+tcp) |
| Infostealer | Harvests browser creds, cookies, wallets, tokens | Browser credential file access, small exfil POSTs, Telegram/Discord C2 |
| Backdoor / web shell | Remote access via a server-side script | `w3wp.exe`/`httpd` spawning shells |

@@topic Static analysis — without running the file
1. **Hash it** — `Get-FileHash file -Algorithm SHA256` / `sha256sum file`. Look it up on VirusTotal, MalwareBazaar, Hybrid Analysis, your EDR. **Search the hash — don't upload sensitive files** (uploads become available to others).
2. **File type / magic bytes** — `file sample` (Linux), TrID, a hex editor: `MZ` (4D 5A) = Windows PE executable; `%PDF`; `PK` = ZIP/Office XML; `D0 CF 11 E0` = old Office OLE. A ".pdf" starting with `MZ` is an executable.
3. **Strings** — `strings -n 6 sample` / FLOSS (decodes obfuscated strings): URLs, IPs, domains, registry paths, file paths, user agents, commands, API names, PDB paths, mutex names.
4. **PE header analysis** (PEStudio, PE-bear, `pefile`): **imports** (`VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread` = injection; `InternetOpenUrl` = download; `CryptEncrypt` = maybe ransomware), **compile timestamp**, sections (high entropy `.text` or odd names like `UPX0` = packed), resources, digital signature.
5. **YARA** — scan with rules for known families.
6. **Metadata** — Office/PDF metadata, author, embedded macros (`olevba`), `exiftool`.

@@topic Dynamic analysis — sandboxing
Run in an isolated sandbox: **ANY.RUN** (interactive), **Joe Sandbox**, **Hybrid Analysis**, **Triage (tria.ge)**, or your own (FLARE VM / REMnux + INetSim). Observe:
- **Processes** — the full tree (Process Monitor, Process Explorer, Process Hacker).
- **Files** — written, modified, deleted (dropped payloads).
- **Registry** — Run keys, services, disabled security settings (Regshot before/after).
- **Network** — DNS, HTTP(S) URLs, IPs, ports, user agents (Wireshark, FakeNet-NG).
- **Persistence** — tasks, services, startup entries.

Limits: malware may detect VMs/sandboxes, wait out the timer ("sleep 10 minutes"), or need user interaction — a "clean" sandbox result is **not** proof of safety.

@@topic Indicators of Compromise (IOCs) — and the Pyramid of Pain
IOCs: **file hashes**, **IPs**, **domains/URLs**, **file names & paths**, **registry keys**, **mutexes**, **user agents**, **email** senders/subjects, certificate/JA3 fingerprints.

**Pyramid of Pain (David Bianco)** — how much it hurts the attacker when you detect/block each:
```
          TTPs            ← hardest for attackers to change (behaviour)
         Tools
   Network/Host Artifacts
     Domain Names
     IP Addresses
    Hash Values           ← trivial to change
```
IOCs are great for quick blocking and scoping; **TTP-based detections** (behaviour) last far longer.

Share IOCs in structured form (STIX/TAXII, MISP) with context: type, value, first seen, confidence, source, related malware.

@@topic Forensic basics for SOC
- **Order of volatility** (RFC 3227): CPU/cache → **memory** → network state → running processes → disk → logs/backups. Collect most volatile first.
- **Memory acquisition:** WinPmem, Magnet RAM Capture, FTK Imager, `avml` (Linux), or the EDR's live-response.
- **Memory analysis with Volatility 3:** `vol -f mem.raw windows.info`, `windows.pslist` / `windows.pstree` / `windows.psscan` (hidden processes), `windows.cmdline`, `windows.netscan`, `windows.malfind` (injected code), `windows.dlllist`, `windows.handles`, `windows.svcscan`, `windows.dumpfiles`. (Volatility 2 syntax: `volatility -f mem.raw --profile=Win10x64 pslist`.)
- **Disk imaging:** FTK Imager (E01/raw), with hashing and write blocking.
- **Triage collection:** **KAPE** or Velociraptor collect key artifacts (event logs, registry hives, Prefetch, Amcache, ShimCache, $MFT, browser history) in minutes.
- **Timeline analysis:** **MACB** timestamps (Modified, Accessed, Changed [metadata], Born/created), $MFT, Prefetch run times; tools: Plaso/log2timeline, Timeline Explorer (Eric Zimmerman tools).
- **Execution artifacts (Windows):** Prefetch, Amcache, ShimCache, UserAssist, BAM, SRUM.
- **Chain of custody** — who handled the evidence, when, where, what they did, and hash verification at each step.

@@fieldnotes
- Real SOC triage is usually: hash → EDR "prevalence" (how many devices have this file?) → TI lookup → sandbox report → scope query → contain. You'll rarely open a disassembler.
- Prevalence is a superpower: a file on **1** device in a 10,000-device estate that's unsigned and in `AppData` is far more interesting than one on 9,000 devices.
- Never upload a company-confidential document to public sandboxes — search the hash, or use a private/enterprise sandbox.
- Useful free tooling: REMnux, FLARE VM, CyberChef, PEStudio, Eric Zimmerman's tools, KAPE, Volatility 3, YARA, capa (identifies capabilities in binaries).

@@lab Analyze 3 Malware Samples
**Safety rules:** do this only inside an isolated analysis VM (REMnux/FLARE VM), never on your host. Samples from MalwareBazaar are zipped with password `infected` — keep them zipped until inside the VM. Take a snapshot first and revert afterwards.

@@step
**Sample 1 — Suspicious Email Attachment.** On ANY.RUN's public submissions, find a recent malicious Word/Excel document (macro dropper). Don't run anything locally — analyse the public report.

@@step
**Sample 1:** describe what happened when the document was opened: the process tree (e.g. `winword.exe → cmd.exe → powershell.exe → rundll32.exe`), files dropped, registry changes, network connections.

@@step
**Sample 1:** extract IOCs (hashes of document and payloads, contacted domains/IPs/URLs, dropped file paths) and write the attack chain with MITRE mapping plus a block list.

@@step
**Sample 2 — Static Analysis.** From MalwareBazaar (bazaar.abuse.ch), download a recent infostealer sample inside your VM. **Do not execute it.** Calculate the SHA-256.

@@step
**Sample 2:** look up the hash on VirusTotal: detection names, family, first-seen date, contacted infrastructure, community comments.

@@step
**Sample 2:** run `strings`/FLOSS and record hardcoded IPs, domains, URLs, registry paths, file paths and interesting API names.

@@step
**Sample 2:** open it in PEStudio/PE-bear: compile timestamp, imported DLLs and functions, section entropy (packed?), signature, resources. Optionally run `capa` to list capabilities.

@@step
**Sample 2:** write a **YARA rule** from 3 unique strings and test it with `yara myrule.yar sample.bin`.

@@step
**Sample 3 — Memory Forensics.** Download a practice memory image (Volatility Foundation samples, MemLabs on GitHub, CyberDefenders or DFIR.training lists). Identify the OS: `vol -f mem.raw windows.info` (Vol2: `imageinfo`).

@@step
**Sample 3:** list processes with `windows.pslist` and `windows.pstree` — find anything suspicious (wrong parent, odd names, odd paths via `windows.cmdline`). Compare with `windows.psscan` for hidden processes.

@@step
**Sample 3:** check network connections with `windows.netscan` — any external IPs? Which process owns them?

@@step
**Sample 3:** look for injected code with `windows.malfind`, then dump suspicious processes (`windows.memmap --dump --pid <pid>` or `windows.dumpfiles --pid <pid>`) and hash/scan the dumps.

@@step
**Write a 1-page forensic findings report** covering all three samples: findings, IOCs, MITRE mapping, recommended detections.

@@tips
**YARA rule template**
```yara
rule Infostealer_Example_2026
{
    meta:
        author = "Recon"
        description = "Detects sample X based on unique strings"
        date = "2026-11-02"
        hash = "<sha256>"
    strings:
        $s1 = "unique_mutex_name_123" ascii wide
        $s2 = "/gate.php?id=" ascii
        $s3 = "Login Data" ascii wide          // Chrome credential DB
        $mz = { 4D 5A }
    condition:
        $mz at 0 and filesize < 2MB and 2 of ($s*)
}
```
**Quick static triage on REMnux**
```bash
sha256sum sample.bin
file sample.bin
floss sample.bin | tee strings.txt | grep -Ei "http|\.exe|\.dll|HKEY|\\\\AppData"
pecheck sample.bin       # or: python3 -c "import pefile; ..."
capa sample.bin
```

@@q
You receive a suspicious file. What's the FIRST thing you do before any analysis?
@@answer
**Make sure it's handled safely and preserved**: move it only into an **isolated analysis environment** (never open it on your workstation), and **calculate its hash (SHA-256)** to identify it uniquely and check it against threat intel/EDR without executing it. Also record where it came from (chain of custody: source, time, who provided it) and keep the original unchanged (store zipped and password-protected, e.g. `infected`).
@@why
The hash lets you search VirusTotal, MalwareBazaar and your EDR's prevalence without anyone running anything — and it's how you'll reference the file in every ticket.
@@keywords hash, sha256, isolat, sandbox, vm, do not open, preserve

@@q
What's the difference between static analysis and dynamic analysis? When do you use each?
@@answer
**Static analysis** examines the file **without executing it** — hashes, file type, strings, PE headers/imports, signatures, YARA, metadata. It's safe and fast, good for initial triage, but defeated by packing/obfuscation. **Dynamic analysis** **executes the file in a controlled sandbox** and observes behaviour — processes, file/registry changes, network traffic, persistence. It reveals what the malware actually does and gives network IOCs, but carries risk if isolation fails and can be evaded (sandbox detection, delays). Typical flow: static triage first → dynamic in a sandbox if more detail is needed → (advanced) reverse engineering.
@@why
They're complementary: static tells you what it *could* do, dynamic what it *did* in that environment.
@@keywords without executing, execut, sandbox, behaviour, strings, pe, safe

@@q
You find a file called "invoice.pdf.exe" — what social engineering technique is this, and why does it work on Windows?
@@answer
It's **double extension masquerading** (MITRE **T1036.007 Masquerading: Double File Extension**). Windows Explorer **hides known file extensions by default**, so the user sees `invoice.pdf` — often with a PDF-looking icon embedded in the executable — and believes it's a document. Double-clicking runs the executable. Related tricks: right-to-left override characters (`invoice‮fdp.exe`), long filenames padded with spaces, `.scr`/`.com`/`.lnk` files.
@@why
Mitigations: show file extensions via GPO, block executables in email attachments/downloads, ASR rules, application allow-listing.
@@keywords double extension, masquerad, hide, extension, t1036

@@q
You upload a file hash to VirusTotal and 0/70 vendors flag it. Does this mean it's safe? Why or why not?
@@answer
**No.** 0/70 means no engine currently recognises it — not that it's benign. It could be **new or targeted malware** (never seen before), **recompiled/repacked** to change the hash, a custom tool, or simply not uploaded yet (VT is a lookup — "not found" and "0 detections" both happen). Signatures lag behind attackers. Use other evidence: **context** (where it came from, path, parent process), **prevalence** in your estate, **signature/publisher**, behaviour (sandbox, EDR telemetry), network connections, and file age. Re-check later — detections often appear days afterwards.
@@why
Also remember: uploading the *file* (not just the hash) makes it available to others — including the attacker monitoring VT for their samples.
@@keywords not safe, new, targeted, hash change, context, behaviour, sandbox

@@q
What is fileless malware and why is it harder for traditional antivirus to detect?
@@answer
Fileless malware **runs in memory and abuses legitimate, trusted system tools** (PowerShell, WMI, `mshta`, `rundll32`, .NET reflection) rather than dropping a traditional executable on disk. Persistence may live in the registry or WMI subscriptions. It's harder for traditional AV because AV mostly **scans files on disk against signatures** — here there's no malicious file to scan, and the processes involved are signed Microsoft binaries. Detection requires **behavioural** monitoring: EDR, AMSI, PowerShell Script Block Logging (4104), command-line auditing, memory scanning, and WMI event monitoring (Sysmon 19–21).
@@why
"Living off the land" is the broader concept; LOLBAS (lolbas-project.github.io) catalogues abused binaries.
@@keywords memory, legitimate, powershell, wmi, no file, signature, behaviour

@@q
Name 3 things you'd look for when analyzing a suspicious process in Volatility.
@@answer
1. **Process tree anomalies** — wrong parent (`svchost.exe` not under `services.exe`, `lsass.exe` with children), duplicates of single-instance processes, misspelled names, processes with odd paths/command lines (`windows.pstree`, `windows.cmdline`), hidden processes seen in `psscan` but not `pslist`.
2. **Network connections** — `windows.netscan`: external IPs/ports owned by unexpected processes (e.g. `notepad.exe` connecting out).
3. **Injected code** — `windows.malfind`: memory regions with `PAGE_EXECUTE_READWRITE` and an `MZ` header or shellcode in a legitimate process.
Also: loaded DLLs from unusual paths (`windows.dlllist`), handles/mutexes, services (`windows.svcscan`), and dumping the process for hashing/YARA.
@@why
Knowing the normal Windows process hierarchy (Week 2) is what makes Volatility output readable.
@@keywords parent, pstree, netscan, malfind, inject, cmdline, hidden, dll

@@q
What is a YARA rule and how would a SOC use it?
@@answer
YARA is a **pattern-matching tool** for identifying and classifying files (or memory) based on **rules** made of **strings** (text, hex, regex) and a **condition** (e.g. "MZ header at offset 0 and 2 of these 3 strings"). SOC uses: **scan endpoints, file shares or email attachments** for a malware family during scoping; hunt across memory dumps; classify samples; enrich sandbox/EDR pipelines (many EDRs, Velociraptor and THOR support YARA); and **share detection logic** with other teams. Rules are more resilient than hashes because they match characteristics shared across variants.
@@why
Good rules avoid generic strings that cause FPs; always test against a clean-file corpus.
@@keywords pattern, strings, condition, scan, family, hunt

@@q
An endpoint protection tool quarantined a file. Your SOC lead wants the SHA256 hash to check against threat intel. How do you get it without releasing the file from quarantine?
@@answer
Get it from the **security tool's telemetry**, not the file: the EDR/AV **alert details** (Defender for Endpoint shows SHA1/SHA256 in the alert/file page), advanced hunting (`DeviceFileEvents` / `AlertEvidence` `SHA256` column), Sysmon Event ID 1/11/15 hashes, or the Defender event log (Event 1116/1117 contain path and often hash details). Many EDRs also let you **"collect/download file"** to a protected location (password-protected zip) for analysis without restoring it to the host. As a last resort, quarantined items can be exported in their encrypted quarantine format for offline handling on an analysis machine.
@@why
Never "restore" a quarantined file to get its hash — you'd re-arm the malware on the endpoint.
@@keywords edr, alert, telemetry, advanced hunting, sysmon, do not restore, collect

@@q
What is the difference between an IOC and a TTP? Which is more useful for long-term detection and why?
@@answer
An **IOC (Indicator of Compromise)** is a specific **artifact** of a known attack — hash, IP, domain, file name. A **TTP (Tactics, Techniques and Procedures)** describes the attacker's **behaviour** — e.g. "uses encoded PowerShell launched from Office to download a payload, persists via scheduled task". **TTPs are more useful long-term**: attackers can change hashes and infrastructure in minutes, but changing *how* they operate is costly (top of the Pyramid of Pain). IOCs are still valuable for fast blocking and retrospective scoping, but they go stale quickly.
@@why
Related: IOA (Indicator of Attack) — behaviour indicating an attack in progress, closer to TTP-based detection.
@@keywords artifact, behaviour, hash, pyramid of pain, change, long-term

@@q
Explain chain of custody and why breaking it could make forensic evidence useless in legal proceedings.
@@answer
Chain of custody is the **documented, unbroken record of who collected, handled, transferred, stored and analysed evidence** — with dates/times, locations, purpose and **hash values** verifying integrity at each step. Courts (and regulators/insurers) need assurance that evidence is **authentic and unaltered**. If there are gaps — unlogged transfers, missing hashes, analysis on the original, unsecured storage — the opposing side can argue the evidence **could have been tampered with or contaminated**, and it may be ruled inadmissible or given little weight, potentially collapsing a prosecution or HR/legal case.
@@why
Even if no legal action is expected, follow it — you don't know at the start which incidents will end up in court.
@@keywords documented, who, handled, hash, integrity, tamper, admissib

@@problem The Cryptominer
@@scenario
Multiple engineering users report slow machines and constantly running fans. EDR shows CPU on **8 machines spiking to 95%** during non-business hours (midnight–6 AM) and dropping when users log in. One machine shows a process **`svchost32.exe` running from `C:\Users\Public\Downloads\`** — the real `svchost.exe` lives in `C:\Windows\System32`.
@@task Perform static triage: what would you check about this file without running it? List 5 specific checks.
@@task You get the SHA256 hash — write up what you'd do with it (platforms, what you're looking for).
@@task The sandbox report shows it connects to a mining pool at xmr.pool.example.com:3333. What kind of malware is this? Map to MITRE ATT&CK.
@@task Scope the infection: write the KQL or SPL query to find ALL machines running svchost32.exe or connecting to that mining pool domain.
@@task Write the eradication plan: how do you remove this from all 8 machines?
@@task How did it get on 8 machines? List hypotheses and the evidence that would confirm each.
@@task Write the complete IOC list for sharing with your threat intel team.
@@task Draft the incident report.
@@deliverable
IOC list, eradication plan, and a full incident report (1.5 pages).
@@approach
**5 static checks:** (1) SHA-256/MD5 hash; (2) digital signature / publisher (real svchost is Microsoft-signed); (3) file type/magic bytes, size, compile timestamp, packer (UPX?) and entropy; (4) strings/FLOSS — pool URLs, wallet address (`4...` 95-char Monero address), `stratum+tcp`, XMRig config keys (`"donate-level"`, `"algo": "rx/0"`); (5) PE imports and version info (XMRig often keeps its original name in metadata), plus file creation time/MACB and the creating process (EDR).

**Hash workflow:** EDR **prevalence** (how many devices, first seen) → VirusTotal (detections, family names like `XMRig`/`CoinMiner`, relations: contacted domains, parent droppers) → MalwareBazaar/Hybrid Analysis/ANY.RUN for existing reports → internal TI/MISP. Looking for family, infrastructure, dropper and related hashes.

**Classification:** **cryptojacking** — XMRig-style Monero miner. MITRE: T1496 Resource Hijacking (Impact); T1036.005 Masquerading: Match Legitimate Name or Location; T1053.005 or T1543.003 for persistence (likely a task that starts at night — check); T1071 / T1095 for pool comms; plus whatever initial access is found.

**Scope query (KQL, Defender XDR):**
```kql
let ioc_domain = "xmr.pool.example.com";
let ioc_file = "svchost32.exe";
union
 (DeviceProcessEvents | where Timestamp > ago(30d) | where FileName =~ ioc_file or ProcessCommandLine has "stratum+tcp"
   | project Timestamp, DeviceName, Evidence = strcat("proc:", FolderPath)),
 (DeviceNetworkEvents | where Timestamp > ago(30d) | where RemoteUrl has ioc_domain or RemotePort == 3333
   | project Timestamp, DeviceName, Evidence = strcat("net:", RemoteUrl, ":", RemotePort))
| summarize FirstSeen = min(Timestamp), Evidence = make_set(Evidence) by DeviceName
```
SPL: `index=sysmon (EventCode=1 Image="*\\svchost32.exe") OR (EventCode=22 QueryName="xmr.pool.example.com") OR (EventCode=3 DestinationPort=3333) | stats min(_time) as first values(EventCode) by host`. Also DNS and proxy logs for the domain across **all** hosts, not just the 8.

**Eradication:** isolate/limit network on affected hosts; kill the process; remove persistence (find what launches it at midnight — scheduled task, service, Run key, WMI); delete binaries/config; block the pool domain/IP and ports 3333/5555/7777 + `stratum` at proxy/firewall/DNS; EDR custom IOC block on the hash; reset credentials if the vector was credential-based; patch the vector; re-scan, reimage if in doubt; monitor CPU/EDR for 7 days.

**Infection hypotheses & evidence:**
- *Trojanised software* (cracked tool, fake installer, malicious package from npm/PyPI — engineers install tools): download history, Sysmon 11 file creation parent, browser history, package manager logs.
- *Shared/deployment tooling abused* (compromised admin account pushing via PsExec/SCCM/GPO): 7045/4698 on all 8 at the same time, same creating account.
- *Exploited vulnerable service* (e.g. exposed Jenkins/Docker API): web/app logs, process parent being the service.
- *Worming via SMB/RDP/SSH with weak creds*: lateral 4624s between the 8 hosts, sequential infection times.
- *Malicious USB/shared drive*: device-control logs, file present on a share.

**IOC list format:** type | value | context | first seen | confidence — e.g. `sha256 | <hash> | svchost32.exe XMRig miner | 2026-10-28 | high`; `domain | xmr.pool.example.com | mining pool | high`; `port | 3333/tcp | stratum`; `path | C:\Users\Public\Downloads\svchost32.exe`; `task name | <name>`; wallet address; any dropper URL/hash.

**Report:** executive summary (8 engineering devices used for unauthorised crypto-mining; no evidence of data theft yet; contained & eradicated on date), timeline, scope, root cause, MITRE, actions, lessons (application control, block mining pools by category, alert on high-CPU unsigned processes in user-writable paths, restrict local admin for engineers).
