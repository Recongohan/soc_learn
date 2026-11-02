@@week 5
@@month 2 SIEM & DETECTION
@@title Microsoft Sentinel Deep Dive

@@concepts
Sentinel is Microsoft's cloud-native SIEM (with built-in SOAR). It's where your **SC-200** lives and where a huge share of SOC jobs in Dubai and the wider Gulf are. This week you go deep on architecture and operations — the KQL deep-dive is next week.

> **Portal note:** Microsoft is consolidating Sentinel into the **Microsoft Defender portal** (security.microsoft.com) as part of its unified SecOps platform. The concepts below are identical in either portal; menu locations differ slightly. Learn both names for things — job ads use both.

@@topic Architecture
```
 Data sources ──► Data connectors ──► Log Analytics Workspace (tables)
                                            │
                     Analytics rules (KQL) ─┤──► Alerts ──► Incidents ──► Analysts
                     Hunting queries ───────┤                   │
                     Workbooks ─────────────┘          Automation rules / Playbooks (Logic Apps)
```
- Sentinel is a **solution enabled on top of a Log Analytics Workspace (LAW)**. The LAW stores the data; Sentinel adds the security features.
- Data lands in **tables**: `SecurityEvent` (Windows via AMA), `SigninLogs` / `AADNonInteractiveUserSignInLogs`, `AuditLogs`, `OfficeActivity`, `Syslog`, `CommonSecurityLog` (CEF), `DeviceProcessEvents`/`DeviceNetworkEvents` (Defender XDR), `SecurityAlert`, `SecurityIncident`, custom `*_CL` tables.
- **Incident lifecycle:** New → Active (assigned) → Closed with classification: *True Positive*, *Benign Positive*, *False Positive*, *Undetermined*.

@@topic Data connectors and ingestion
- **Service-to-service** — Entra ID, M365, Defender XDR, Azure Activity: a few clicks.
- **Azure Monitor Agent (AMA)** + **Data Collection Rules (DCR)** — Windows Security Events, Syslog, custom text logs from VMs/servers (on-prem via Azure Arc).
- **CEF/Syslog via AMA** — firewalls/appliances (Palo Alto, Fortinet, Cisco) send to a Linux log forwarder → `CommonSecurityLog` / `Syslog`.
- **Codeless Connector Platform / API** connectors — SaaS (Okta, AWS, GCP, etc.).
- **Logs Ingestion API** — push your own JSON into a custom table.
- **Content Hub** — install "solutions" bundling connectors + rules + workbooks for a product.

@@topic Analytics rules — the four you must know
| Type | How it works | Use it for |
|---|---|---|
| **Scheduled** | Your KQL runs every X minutes over the last Y period; threshold → alert | Most custom detections |
| **NRT (Near-Real-Time)** | Runs every minute on newly ingested data, fewer features | Time-critical detections (e.g. break-glass account sign-in) |
| **Microsoft Security** | Creates incidents from alerts of other Microsoft products (Defender, Entra ID Protection) | Bringing product alerts into the queue |
| **Fusion** (advanced multistage) | ML correlation of low-fidelity signals into high-fidelity multistage incidents | Catching kill chains across products |

Also: **Anomaly** rules (ML baselines) and **Threat Intelligence** matching rules.

Key rule settings: query frequency & lookback, threshold, **entity mapping**, **custom details**, **alert grouping** into incidents, **MITRE tactics/techniques**, suppression, and **automation rules**.

@@topic Workbooks, hunting, watchlists, automation
- **Workbooks** — dashboards built on KQL (SOC overview, identity, MITRE coverage).
- **Hunting** — library of proactive KQL queries; **bookmarks** save interesting results into incidents; **livestream** watches a query live.
- **Watchlists** — CSV reference data queried via `_GetWatchlist('Name')`: VIPs, IOC lists, approved admin IPs, service accounts, leavers.
- **Automation rules** — lightweight triggers on incident create/update: assign owner, change severity, add tags, run a playbook, auto-close known BTPs.
- **Playbooks** — **Azure Logic Apps** workflows (SOAR): enrich with VirusTotal, post to Teams, disable user in Entra ID, isolate device via Defender, block IP on firewall.
- **Entity mapping & UEBA** — alerts are linked to Account, Host, IP, URL, File, Process entities; entity pages show history; UEBA builds behavioural baselines.
- **MITRE ATT&CK page** — visualises coverage from active rules' tactic/technique tags.

@@topic Cost and data management
Sentinel is billed mostly on **GB ingested** and retention. Levers:
- Collect only needed events (DCR filters, e.g. Windows "Common" instead of "All"; drop noisy EventIDs).
- **Transform at ingestion** (DCR transformations) to drop columns/rows.
- Use the cheaper **Basic/Auxiliary** log tiers (or data lake tier) for high-volume, low-value logs (firewall allow, verbose proxy).
- **Commitment tiers** for predictable volume; free ingestion for some Microsoft sources (e.g. Azure Activity, Office 365 audit, Defender alerts).
- Archive/long-term retention instead of hot retention.
- In your lab: set a **daily cap** on the workspace so a misconfiguration can't surprise you.

@@topic SC-200 vs what jobs want
SC-200 gives you configuration and operation of Sentinel + Defender XDR. Employers also want:
- Writing **custom KQL from scratch** (not just enabling templates).
- **Tuning** noisy rules and documenting why.
- Building detections for **specific threats** from TI or incident lessons.
- Understanding **ingestion costs** and data quality ("is this connector actually sending data?").
- Clear **incident notes**.

@@fieldnotes
- The first thing to check in any new Sentinel tenant: `Usage | summarize sum(Quantity) by DataType` — what's actually being ingested, and what's missing.
- A rule with no entity mapping produces incidents that are painful to investigate. Map at least Account/Host/IP.
- Automation rules that auto-close alerts must be documented and reviewed — they're a common source of false negatives.
- Treat analytics rules as code: export them (ARM/Bicep/YAML) and keep them in Git — portfolio material for Week 12.

@@lab Deploy Sentinel and Ingest Your First Logs
Build a working Sentinel instance you'll use for the rest of the course. **Set a daily cap** to avoid surprise costs and delete resources when done.

@@step
Create an **Azure free account** (or use an existing subscription). Create a resource group `rg-soc-lab`.

@@step
Create a **Log Analytics Workspace** (`law-soc-lab`) in a region near you. Set a **daily cap** (e.g. 1 GB) under Usage and estimated costs.

@@step
Add **Microsoft Sentinel** to the workspace (31-day free trial covers a modest ingestion volume — check current terms).

@@step
**Connect identity data:** install the Microsoft Entra ID solution from Content Hub and enable Sign-in logs + Audit logs. Use a free Entra tenant / M365 developer or trial tenant if your org account can't be used.

@@step
**Connect the Microsoft 365 / Office 365 connector** if you have a trial tenant (Exchange, SharePoint, Teams activity).

@@step
**Ingest from your home lab:** install Azure Arc on the Week 2 Windows VM (or use an Azure VM), then use the *Windows Security Events via AMA* connector with a DCR collecting "Common" events. Optionally add Sysmon via a custom XPath (`Microsoft-Windows-Sysmon/Operational!*`).

@@step
Verify data: run `SigninLogs | take 10`, `SecurityEvent | summarize count() by EventID`, and `Usage | summarize sum(Quantity) by DataType`.

@@step
**Create your first Scheduled analytics rule** — "Multiple Failed Sign-ins Followed by Success": 5+ failures for one user followed by a success within 10 minutes. Severity Medium, runs every 5 minutes, lookback 15 minutes, MITRE T1110. Map **Account** (UserPrincipalName) and **IP** (IPAddress) entities.

@@step
**Trigger it:** sign in to your test tenant with a wrong password 5–6 times, then correctly.

@@step
**Investigate the incident:** open it, assign it to yourself, open the investigation graph, review entity pages, add a comment with your findings, and close it as *Benign Positive – suspicious but expected*.

@@tips
**Starter KQL for the rule in step 8**
```kql
let failThreshold = 5;
let window = 10m;
let fails = SigninLogs
  | where TimeGenerated > ago(15m)
  | where ResultType != "0"
  | summarize FailCount = count(), FirstFail = min(TimeGenerated), LastFail = max(TimeGenerated),
              FailIPs = make_set(IPAddress) by UserPrincipalName
  | where FailCount >= failThreshold;
let success = SigninLogs
  | where TimeGenerated > ago(15m)
  | where ResultType == "0"
  | project SuccessTime = TimeGenerated, UserPrincipalName, IPAddress, Location;
fails
| join kind=inner success on UserPrincipalName
| where SuccessTime between (LastFail .. (LastFail + window))
| project UserPrincipalName, IPAddress, Location, FailCount, FirstFail, LastFail, SuccessTime, FailIPs
```
`ResultType` `0` = success; `50126` = bad username/password; `50053` = locked; `50074/50076` = MFA required.

@@q
What is the relationship between a Log Analytics Workspace and Microsoft Sentinel?
@@answer
Sentinel is **deployed on top of a Log Analytics Workspace**. The workspace is the data store — it ingests, stores and indexes the logs in tables and executes KQL. Sentinel is a solution enabled on that workspace that adds the SIEM/SOAR layer: data connectors, analytics rules, incidents, hunting, workbooks, watchlists, UEBA, automation and playbooks. One workspace has at most one Sentinel instance; retention, access control (RBAC) and much of the cost are set at the workspace/table level.
@@why
Design questions (one central workspace vs several for data residency or business units) come up in interviews — know that cross-workspace queries are possible with `workspace()` and that Sentinel supports multi-workspace views.
@@keywords on top of, store, tables, kql, solution

@@q
Name 4 types of Analytics Rules in Sentinel and when you'd use each.
@@answer
1. **Scheduled** — your KQL runs on a schedule with a lookback and threshold. Use for most custom detections (brute force, impossible travel, privileged group changes).
2. **NRT (Near-Real-Time)** — runs every minute on new data. Use for few, high-urgency detections where minutes matter (break-glass account used, audit log cleared).
3. **Microsoft Security** — turns alerts from Defender for Endpoint/Office/Identity/Cloud Apps or Entra ID Protection into Sentinel incidents. Use to bring product alerts into one queue (often superseded by the Defender XDR connector's incident sync).
4. **Fusion** — ML-based multistage correlation of low-fidelity signals into high-confidence incidents. Use to catch attack chains that span products.

Also: **Anomaly** (ML baselines) and **Threat Intelligence** rules (IOC matching).
@@why
Know the trade-offs: NRT has limitations (fewer features, limited number of rules), Scheduled is the workhorse.
@@keywords scheduled, nrt, near-real-time, microsoft security, fusion, anomaly

@@q
You need to ingest Palo Alto firewall logs into Sentinel. What connector type would you use and what format would the logs be in?
@@answer
Use the **Common Event Format (CEF) via AMA** connector (Palo Alto Networks solution from Content Hub). The firewall sends **CEF-formatted syslog** to a **Linux log forwarder** (VM running the Azure Monitor Agent, listening on 514), which forwards to the workspace. Data lands in the **`CommonSecurityLog`** table (fields like `DeviceVendor`, `SourceIP`, `DestinationIP`, `DeviceAction`).
@@why
Size the forwarder for EPS volume, filter at the DCR to control cost, and validate with `CommonSecurityLog | where DeviceVendor == "Palo Alto Networks" | take 10`.
@@keywords cef, syslog, commonsecuritylog, forwarder, ama

@@q
What's the difference between an Alert and an Incident in Sentinel?
@@answer
An **alert** is produced when an analytics rule's query conditions are met — one detection result with its entities. An **incident** is the **case** analysts work: it groups one or more related alerts (via alert grouping or Fusion/XDR correlation) with their entities, evidence, owner, status, severity, comments, tasks and closing classification. Analysts triage incidents; alerts are the evidence inside them.
@@why
Good alert grouping (e.g. group by Account within 5 hours) reduces queue noise dramatically.
@@keywords group, case, triage, related, analytics rule

@@q
Explain what Entity Mapping does and why it matters for investigation.
@@answer
Entity mapping tells Sentinel which **columns in the rule's query results represent entities** — Account, Host, IP, URL, File/FileHash, Process, Mailbox, Cloud App, etc. Sentinel then attaches those entities to the alert/incident, enabling the **investigation graph**, **entity pages** (full history across all data), **UEBA** insights, alert grouping by entity, correlation across incidents ("this IP appears in 3 other incidents"), and playbooks that act on entities (disable user, isolate host, block IP).
@@why
Without entity mapping an incident is just text — the analyst has to copy-paste values into queries manually.
@@keywords account, host, ip, investigation graph, entity page, correlat

@@q
Your Sentinel workspace is costing too much. What are 3 ways to reduce data ingestion costs?
@@answer
1. **Filter at the source/DCR** — collect only needed Windows events (Common/Minimal sets or XPath), drop noisy event IDs, drop firewall "allow" logs you don't use.
2. **DCR ingestion-time transformations** — remove unneeded columns or rows before they're billed for analytics.
3. **Use cheaper tiers** — Basic/Auxiliary logs (or the data lake tier) for high-volume, low-investigation-value data; long-term archive instead of hot retention.
4. **Commitment tiers** for predictable volume discounts, and use **free data sources** (Azure Activity, Office 365 audit, Defender alerts).
5. Find top tables with `Usage | summarize GB=sum(Quantity)/1024 by DataType | sort by GB desc` and review duplicates (e.g. the same logs from two connectors).
@@why
Always weigh cost against detection value — never drop a log source your critical detections depend on.
@@keywords filter, dcr, transform, basic, commitment, retention

@@q
What is a Sentinel Playbook and what Azure service powers it?
@@answer
A playbook is an **automated response workflow** triggered by an incident, alert or entity (manually or from an automation rule) — Sentinel's SOAR capability. It's powered by **Azure Logic Apps**. Examples: enrich IPs with VirusTotal and add a comment, post the incident to a Teams channel, disable a user in Entra ID and revoke sessions, isolate a device in Defender for Endpoint, create a ServiceNow ticket.
@@why
Automation rules (simpler, no-code triggers inside Sentinel) often *call* playbooks. Use managed identities for permissions.
@@keywords logic apps, automat, soar

@@q
You want to create a list of 500 known malicious IPs that your analytics rules can reference. What Sentinel feature do you use?
@@answer
A **Watchlist** — upload a CSV (e.g. `MaliciousIPs` with a search key column `IPAddress`) and reference it in KQL with `_GetWatchlist('MaliciousIPs')`. Alternatively, for proper threat intelligence with expiry and confidence, ingest them as **TI indicators** (`ThreatIntelligenceIndicator` / `ThreatIntelIndicators` table) via the TI upload or TAXII connectors and use the built-in TI matching rules.
@@why
Watchlists are great for analyst-maintained lists (VIPs, exclusions); TI indicators are better for IOC feeds with lifecycle management.
@@keywords watchlist, _getwatchlist, threat intelligence

@@q
Explain the difference between a Scheduled analytics rule and a Near-Real-Time (NRT) rule.
@@answer
A **Scheduled** rule runs your KQL at a configurable interval (5 min to 14 days) over a configurable lookback, supports thresholds, complex queries, joins across long windows, and full alert grouping/suppression options — there's an inherent delay (schedule + ingestion latency). An **NRT** rule runs **every minute** on data ingested since the last run, giving near-real-time detection, but has **limitations** (simpler queries, a cap on the number of NRT rules, fewer configuration options).
@@why
Reserve NRT for high-signal, urgent detections; everything else as Scheduled.
@@keywords every minute, interval, lookback, limit

@@q
A new data connector is available but the table it writes to shows no data after 24 hours. What troubleshooting steps would you take?
@@answer
1. Check the connector page status and **health monitoring** (`SentinelHealth`, `Heartbeat` table for agents).
2. Verify **permissions/licensing** — e.g. Entra ID P1/P2 for sign-in logs, admin consent granted.
3. For agent-based sources: is AMA installed and reporting (`Heartbeat | where Computer == "x"`)? Is the **DCR associated** with the machine and pointing to the right workspace/table?
4. Check the **source** is actually sending — appliance syslog config, port 514 reachable (`tcpdump -i any port 514` on the forwarder), firewall rules, CEF format.
5. Query the right table name (custom tables end in `_CL`) and widen the time range — check for timestamp/timezone parsing issues.
6. Check workspace **daily cap** hasn't been hit and DCR transformations aren't dropping everything.
7. Review Azure Monitor / Logic App / function errors for API-based connectors.
@@why
Work from source → transport → collector → workspace. "No data" is one of the most common real-world Sentinel tickets.
@@keywords heartbeat, permission, agent, dcr, source, port, daily cap

@@problem The Sentinel Deployment Gap
@@scenario
You just joined a company as a junior SOC analyst. They have Sentinel deployed but **only 3 analytics rules** enabled — all default Microsoft Security rules auto-importing Defender alerts. The senior analyst asks you to *"improve our detection coverage."* The MITRE ATT&CK page shows **4 of 14 tactics covered**.
@@task Pick 5 MITRE ATT&CK techniques that are NOT currently covered.
@@task For each technique, write: the technique name, which Sentinel table has the relevant data, and a plain-English description of what the detection should look for.
@@task Write the actual KQL query for 2 of them (approximate is fine — you'll refine KQL next week).
@@task Prioritise your 5 rules: which do you deploy first and why?
@@task Write a 1-paragraph proposal to your manager explaining what you want to do and the business risk of not doing it.
@@deliverable
A detection gap assessment with 5 proposed rules, 2 written in KQL, and a prioritised deployment plan.
@@approach
**Example 5 techniques:**
| # | Technique | Table | Detection idea |
|---|---|---|---|
| 1 | T1110.003 Password Spraying | SigninLogs | One IP failing against 15+ distinct users in 30 min |
| 2 | T1098 Account Manipulation — privileged role added | AuditLogs | User added to Global Admin/privileged role outside PIM |
| 3 | T1136.001 Create Local Account | SecurityEvent | 4720 + 4732 (Administrators) on servers |
| 4 | T1070.001 Clear Windows Event Logs | SecurityEvent | EventID 1102 anywhere |
| 5 | T1114.003 Email Forwarding Rule | OfficeActivity | New-InboxRule / Set-Mailbox with external ForwardTo |

**KQL #1 — password spraying:**
```kql
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType in ("50126", "50053")
| summarize DistinctUsers = dcount(UserPrincipalName), Attempts = count(),
            Users = make_set(UserPrincipalName, 50) by IPAddress, bin(TimeGenerated, 30m)
| where DistinctUsers >= 15
```
**KQL #2 — privileged role assignment:**
```kql
AuditLogs
| where OperationName has "Add member to role"
| extend Role = tostring(TargetResources[0].modifiedProperties[1].newValue),
         Target = tostring(TargetResources[0].userPrincipalName),
         Actor = tostring(InitiatedBy.user.userPrincipalName)
| where Role has_any ("Global Administrator", "Privileged Role Administrator", "Security Administrator")
| project TimeGenerated, Actor, Target, Role
```

**Prioritisation:** 1) privileged role changes and log clearing (low noise, high impact, cheap — deploy immediately); 2) password spraying (identity is the #1 initial access vector); 3) inbox forwarding (BEC is a top financial-loss threat); 4) local admin creation (needs server log coverage verified first). Factors: business impact, likelihood (threat landscape), data availability, expected noise, effort.

**Proposal paragraph:** *"Our Sentinel deployment currently detects activity in only 4 of 14 ATT&CK tactics, relying entirely on Defender product alerts; attacks using valid credentials, privilege changes, or email forwarding would go unnoticed. I propose deploying five custom analytics rules over the next two weeks, starting with privileged role changes and audit-log clearing, which carry minimal noise and cover high-impact attacker actions. Each rule will be tested in our lab tenant, tuned for false positives for one week, and mapped to ATT&CK so we can report coverage improvements. The cost is roughly X analyst hours and negligible extra ingestion since the data is already collected. Not doing this leaves us blind to account takeover and business email compromise — the most common causes of financial loss in our sector."*
