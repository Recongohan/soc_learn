## Free lab platforms
- **TryHackMe** (tryhackme.com) — SOC Level 1 path, MITRE, Splunk 101/201, Intro to SIEM, Windows Event Logs, Linux Fundamentals, Wireshark 101, SOC Simulator
- **LetsDefend** (letsdefend.io) — SOC analyst simulation with a live alert queue
- **CyberDefenders** (cyberdefenders.org) — blue-team CTF investigations (PCAP, memory, logs)
- **Blue Team Labs Online** (blueteamlabs.online) — investigations and challenges
- **KC7** (kc7cyber.com) — free KQL investigation game
- **Splunk BOTS** — Boss of the SOC datasets v1–v3 (github.com/splunk)
- **Microsoft KQL demo workspace** (aka.ms/lademo)

## Analysis & intel tools
- **VirusTotal**, **AbuseIPDB**, **URLScan.io**, **Shodan** — enrichment
- **ANY.RUN**, **Hybrid Analysis**, **Joe Sandbox**, **Triage** — sandboxes (free tiers)
- **MalwareBazaar**, **URLhaus**, **ThreatFox** (abuse.ch) — samples & IOCs
- **CyberChef** — decode / transform anything
- **MITRE ATT&CK Navigator** — coverage heatmaps
- **Sigma** (github.com/SigmaHQ/sigma) — vendor-neutral detection rules
- **LOLBAS** and **GTFOBins** — abused Windows / Linux binaries
- **Volatility 3**, **KAPE**, **Eric Zimmerman's tools**, **Velociraptor**, **FTK Imager** — forensics
- **REMnux** and **FLARE VM** — malware-analysis VMs
- **No More Ransom** (nomoreransom.org) — free decryptors

## Tool setup checklist
- VirtualBox or Hyper-V installed
- Windows 10/11 VM with Sysmon (SwiftOnSecurity config) + PowerShell Script Block Logging + command-line process auditing
- Ubuntu Server VM with auditd and rsyslog configured
- Azure free account with Log Analytics + Sentinel (daily cap set!)
- Splunk Enterprise trial / Free on the Linux VM with Universal Forwarder on Windows
- Wireshark, FTK Imager, CyberChef (offline copy)
- Python 3 (`pandas`, `requests`, `hashlib`) for scripting IOC lookups

## Recommended reading
- *Blue Team Handbook: SOC, SIEM, and Threat Hunting Use Cases* — Don Murdoch
- *The Practice of Network Security Monitoring* — Richard Bejtlich
- *Intelligence-Driven Incident Response* — Scott Roberts & Rebekah Brown
- **MITRE ATT&CK** documentation — attack.mitre.org (browse weekly)
- **The DFIR Report** — thedfirreport.com (real intrusions, full TTPs)
- **SANS reading room / Internet Storm Center** — sans.org, isc.sans.edu
- **CISA advisories & KEV catalogue** — cisa.gov
- **Krebs on Security**, **BleepingComputer** — current threat landscape

## Event ID quick reference
| ID | Meaning |
|---|---|
| 4624 / 4625 | Logon success / failure |
| 4648 | Logon with explicit credentials |
| 4672 | Special privileges assigned |
| 4688 | Process created |
| 4697 / 7045 | Service installed |
| 4698 | Scheduled task created |
| 4720 | User account created |
| 4728 / 4732 / 4756 | Added to global / local / universal group |
| 4740 | Account locked out |
| 4768 / 4769 / 4776 | Kerberos TGT / service ticket / NTLM validation |
| 1102 | Security log cleared |
| 4104 | PowerShell script block |
| Sysmon 1 / 3 / 10 / 11 / 13 / 22 | Process / network / process access / file create / registry value / DNS |
| Defender 1116 / 1117 / 5001 / 5007 | Detection / action / real-time protection off / config changed |
