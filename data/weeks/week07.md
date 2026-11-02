@@week 7
@@month 2 SIEM & DETECTION
@@title Splunk Fundamentals

@@concepts
Splunk is the other SIEM you'll meet in nearly every SOC job ad. Many Dubai banks, telcos and government entities run Splunk Enterprise Security (ES). Knowing **both Sentinel and Splunk** — and being able to translate between KQL and SPL — makes you significantly more hireable.

@@topic Splunk architecture
```
 Universal Forwarders (endpoints/servers) ─┐
 Heavy Forwarders (parse/filter/route) ────┼──► Indexers (store & search buckets) ◄── Search Heads (UI, SPL, apps, ES)
 Syslog / HEC (HTTP Event Collector) ──────┘         (clustered for HA)                 Deployment Server manages forwarders
```
- **Forwarders** collect and ship data (Universal Forwarder = lightweight agent).
- **Indexers** parse data into **events**, timestamp them and store them in **indexes** (hot → warm → cold → frozen buckets).
- **Search heads** run your searches across indexers.
- **Index** = logical container + retention + access control boundary (`index=wineventlog`, `index=firewall`). Searching without `index=` is slow and bad practice.
- **Sourcetype** = the data's format; tells Splunk how to break lines, extract timestamps and fields (`WinEventLog:Security`, `pan:traffic`, `access_combined`).
- **source** = file/path/stream it came from; **host** = machine it came from.
- Default fields on every event: `_time`, `_raw`, `host`, `source`, `sourcetype`, `index`.

@@topic SPL essentials
```spl
index=wineventlog sourcetype="WinEventLog:Security" EventCode=4625 earliest=-24h
| stats count AS failures, dc(user) AS users, values(user) AS user_list BY src_ip
| where failures > 20
| sort - failures
| table src_ip failures users user_list
```
| Command | What it does | KQL equivalent |
|---|---|---|
| `search` / filters before first pipe | filter events | `where` |
| `where` | filter with expressions (after stats) | `where` |
| `stats` | aggregate (`count`, `dc`, `sum`, `avg`, `values`, `list`, `earliest`, `latest`) | `summarize` |
| `eval` | create/modify fields | `extend` |
| `table` / `fields` | choose columns | `project` |
| `sort` | order (`sort - count` = desc) | `sort by` |
| `head` / `tail` | first/last N | `take` / `top` |
| `timechart span=1h` | time-bucketed stats + chart | `summarize ... by bin()` + `render` |
| `rex` | regex field extraction | `extract()` / `parse` |
| `lookup` / `inputlookup` | enrich with CSV/KV store | watchlist / `join` |
| `transaction` | group events into sessions | `row_window_session` / joins |
| `eventstats` | stats added to every event without collapsing | `join` back / `make_set` + `mv-expand` |
| `streamstats` | running stats in order | `prev()` / `row_cumsum()` |
| `dedup` | remove duplicates | `distinct` / `arg_max` |
| `rare` / `top` | least / most common values | `summarize count() ... sort` |
| `tstats` | ultra-fast stats on indexed fields / data models | — |

@@topic Splunk for SOC — Enterprise Security concepts
- **Correlation searches** — scheduled SPL that generates findings — the equivalent of Sentinel analytics rules.
- **Notable events / findings** — ES's alerts in the **Incident Review** queue (status, owner, urgency).
- **Risk-Based Alerting (RBA)** — instead of alerting on every suspicious event, each detection adds a **risk score** to an entity (user/host) with ATT&CK annotations; you alert when the entity's **total risk** crosses a threshold or spans multiple tactics. Dramatically reduces noise and surfaces slow multi-stage attacks.
- **CIM (Common Information Model)** — standard field names and **data models** (Authentication, Network_Traffic, Endpoint, Web, Email). Map every source to CIM so one search works across vendors: `| tstats count from datamodel=Authentication where Authentication.action=failure by Authentication.src`.
- **Asset & Identity framework** — enriches events with criticality, owner, priority.
- **Threat Intelligence framework** — IOC lists matched automatically.
- **SOAR (Splunk SOAR)** — playbooks for automation.
- **Dashboards** — Simple XML / Dashboard Studio panels with drilldowns.

@@fieldnotes
- Always specify `index=` and a time range — the two biggest performance wins. Filtering early ("search-time" terms before the first pipe) beats `| where` later.
- `stats` is distributed and fast; `transaction` is expensive — use `stats` with `earliest/latest/values` by a session key whenever possible.
- Splunk Free is limited (no alerting, no auth, small daily ingest). For the lab, the Enterprise 60-day trial gives you everything, then converts to Free.
- The **BOTS datasets** plus the free **Splunk "Boss of the SOC"** questions on TryHackMe/CyberDefenders are the best Splunk practice available — and a strong interview talking point.
- Learn to translate: interviewers often ask "write this in KQL, now write it in SPL".

@@lab Install Splunk and Build Your First Dashboard
Use your Ubuntu VM from Week 2 (give it 4+ GB RAM and 30+ GB free disk for BOTS).

@@step
**Install Splunk Enterprise (60-day trial)** on Ubuntu: download the `.deb` from splunk.com, `sudo dpkg -i splunk-*.deb`, `sudo /opt/splunk/bin/splunk start --accept-license`, then browse to `http://<vm-ip>:8000`.

@@step
**Create indexes** (Settings → Indexes): `wineventlog`, `linux`, `botsv1` (or use the index the BOTS app creates).

@@step
**Enable receiving** on port 9997 (Settings → Forwarding and receiving), then install the **Universal Forwarder** on your Windows VM and configure `inputs.conf` to send `WinEventLog://Security`, `System` and `Microsoft-Windows-Sysmon/Operational` to `index=wineventlog`. Install the *Splunk Add-on for Microsoft Windows* and *Sysmon add-on* for field extractions.

@@step
**Forward Linux logs:** point the rsyslog forwarder from Week 2 at a Splunk UDP/TCP 514 input or monitor `/var/log/auth.log` with `index=linux`.

@@step
**Load the BOTS v1 dataset:** download the pre-indexed BOTS v1 app from Splunk's GitHub (`splunk/botsv1`), extract into `/opt/splunk/etc/apps/`, restart. Install the add-ons it lists (Stream, Fortinet, Suricata, etc.) so fields extract.

@@step
**Query 1–3:** failed logins in the last 24h; top 10 source IPs by event count; timechart of events per hour split by EventCode.

@@step
**Query 4–6:** all events for a specific user; brute force (10+ failed logins from the same IP in 5 minutes); all processes that ran as SYSTEM.

@@step
**Query 7–8:** extract URLs from web/proxy logs with `rex`; create a lookup `known_good_ips.csv` and exclude those IPs from a search.

@@step
**Query 9–10:** rare processes (seen fewer than 3 times in 7 days); a `transaction` grouping all events of a single user session.

@@step
**Build the SOC dashboard** (Dashboards → Create): Panel 1 failed logins over time (timechart); Panel 2 top 10 attacking IPs (bar); Panel 3 new user accounts created (table, EventCode 4720); Panel 4 suspicious process executions (table with drilldown to raw events). Add a time-picker input.

@@step
Save all 10 queries in a `.spl` file with comments — they go to your portfolio's `/detection-rules`.

@@tips
**Reference SPL for the 10 queries**
```spl
1  index=wineventlog EventCode=4625 earliest=-24h
2  index=* earliest=-24h | stats count by src_ip | sort - count | head 10
3  index=wineventlog earliest=-24h | timechart span=1h count by EventCode
4  index=* user="jsmith" | table _time index sourcetype host action src_ip
5  index=wineventlog EventCode=4625 | bin _time span=5m
   | stats count by _time src_ip | where count>=10
6  index=wineventlog EventCode=4688 (SubjectUserName="*$" OR user="SYSTEM")
   | stats count by New_Process_Name
7  index=botsv1 sourcetype=stream:http
   | rex field=_raw "(?<url>https?://[^\s\"]+)" | stats count by url
8  | inputlookup known_good_ips.csv     (create it via Lookups → Add new)
   index=firewall NOT [| inputlookup known_good_ips.csv | rename ip AS src_ip | fields src_ip]
9  index=wineventlog EventCode=4688 earliest=-7d
   | stats count by New_Process_Name | where count < 3
10 index=wineventlog user=jsmith | transaction user maxspan=30m maxpause=10m
   | table _time duration eventcount
```
Field names differ by add-on version (`New_Process_Name` vs `process`); use the field sidebar to confirm.

@@q
What's the difference between `stats` and `eventstats`? When would you use each?
@@answer
`stats` **aggregates and collapses** events into a summary table — the original events are gone (e.g. one row per src_ip with a count). `eventstats` computes the same aggregates but **adds them as new fields to every original event**, keeping all rows. Use `stats` for summaries/reports. Use `eventstats` when you need per-event detail *and* the group statistic — e.g. compare each login to the user's average: `| eventstats avg(bytes) AS avg_bytes BY user | where bytes > 3*avg_bytes`.
@@why
`streamstats` is the third sibling — running aggregates in event order (e.g. cumulative failures).
@@keywords collapse, summary, keep, every event, original

@@q
Write an SPL query to find the top 5 users with failed login attempts, showing their count and the IPs they came from.
@@answer
```spl
index=wineventlog sourcetype="WinEventLog:Security" EventCode=4625 earliest=-24h
| stats count AS failures values(src_ip) AS source_ips dc(src_ip) AS ip_count BY user
| sort - failures
| head 5
```
CIM version: `| tstats count from datamodel=Authentication where Authentication.action=failure by Authentication.user Authentication.src`.
@@why
`values()` gives the unique IPs; `dc()` counts them — a user failing from 30 IPs looks like spraying/stuffing, one IP looks like a fat-fingered password.
@@keywords 4625, stats, count, values, by user, head 5, sort

@@q
Explain what a Splunk sourcetype is and why it matters.
@@answer
A sourcetype identifies the **format of the data** and tells Splunk **how to process it**: how to break the stream into events (line breaking), where and how to parse the **timestamp**, and which **field extractions**, lookups and CIM aliases apply (via props.conf/transforms.conf, usually from a vendor add-on). Examples: `WinEventLog:Security`, `pan:traffic`, `linux_secure`, `access_combined`.
@@why
Wrong sourcetype = broken events, wrong timestamps and no fields — your detections silently fail. It's also a search filter: `sourcetype=pan:traffic` narrows searches fast.
@@keywords format, parse, timestamp, field extraction, line break

@@q
What is the CIM and why is it important in a SOC environment with multiple log sources?
@@answer
The **Common Information Model** is Splunk's standard schema: common **field names** (`src`, `dest`, `user`, `action`) and **data models** (Authentication, Network_Traffic, Web, Endpoint, Email, Malware…). Add-ons map each vendor's fields to CIM. In a SOC with Palo Alto, Fortinet, Windows and Okta logs, a single search or ES correlation rule against the **Authentication** data model works for all of them instead of writing one rule per vendor. Accelerated data models also make `tstats` searches very fast.
@@why
Sentinel's equivalent is **ASIM** (Advanced Security Information Model). Normalisation is how SOCs scale detections.
@@keywords common information model, normali, field names, data model, vendor

@@q
Write an SPL query using `transaction` to group all events from the same source IP within a 10-minute window.
@@answer
```spl
index=firewall earliest=-24h
| transaction src_ip maxspan=10m
| table _time src_ip duration eventcount dest_ip
| sort - eventcount
```
`maxspan` = the whole transaction must fit within 10 minutes; `maxpause` = maximum gap between consecutive events. `transaction` adds `duration` and `eventcount` fields.
@@why
Performance alternative: `| bin _time span=10m | stats count values(dest_ip) by _time src_ip`.
@@keywords transaction, src_ip, maxspan=10m

@@q
How does Splunk's Risk-Based Alerting (RBA) differ from traditional threshold-based alerting? Why is RBA better for SOC?
@@answer
Traditional alerting fires a notable for each rule match above a threshold → huge alert volume and isolated, contextless alerts. **RBA** makes each detection contribute a **risk score** (weighted by asset/identity criticality and annotated with ATT&CK) to a **risk object** (user/host). An analyst-facing alert ("risk incident rule") only fires when an entity's **cumulative risk** exceeds a threshold or when it hits **multiple ATT&CK tactics** in a period. Benefits: far fewer, higher-fidelity alerts; detects low-and-slow multi-stage attacks where each step alone is below threshold; lets you keep many noisy-but-useful detections without flooding analysts; built-in context (the full risk timeline).
@@why
Example: encoded PowerShell (+20), rare outbound domain (+15), new scheduled task (+20) on the same host in 4 hours → 55 > threshold 50 → one alert telling the whole story.
@@keywords risk score, entity, cumulative, threshold, fewer, context, tactics

@@q
You need to add threat intel IOCs (malicious domains) to Splunk searches. How would you do this?
@@answer
1. Create a **lookup** (CSV via *Settings → Lookups*, or KV store) e.g. `bad_domains.csv` with `domain,threat,source`.
2. Use it in searches: `index=dns | lookup bad_domains.csv domain AS query OUTPUT threat | where isnotnull(threat)` or as a subsearch filter `[| inputlookup bad_domains.csv | rename domain AS query | fields query]`.
3. Schedule a search to update the lookup from a feed (`outputlookup`), or use **ES's Threat Intelligence framework** which ingests feeds (STIX/TAXII, CSV) and matches automatically, creating notables.
4. Optionally configure an **automatic lookup** on the sourcetype.
@@why
Keep IOC expiry dates — stale IOCs generate FPs. Domains are better matched against DNS/proxy logs; IPs against firewall logs.
@@keywords lookup, csv, inputlookup, threat intelligence, kv store

@@q
Write an SPL eval statement that categorizes events as "Business Hours" (9-17) or "After Hours" based on the event timestamp.
@@answer
```spl
| eval hour = tonumber(strftime(_time, "%H"))
| eval period = if(hour >= 9 AND hour < 17, "Business Hours", "After Hours")
```
With weekends: `| eval dow = strftime(_time, "%a") | eval period = if(hour>=9 AND hour<17 AND NOT dow IN ("Sat","Sun"), "Business Hours", "After Hours")` (adjust for a Sun–Thu or Mon–Fri work week). Shortcut: the built-in `date_hour` field.
@@why
`_time` is rendered in the **user's configured timezone** in Splunk — confirm it matches the business's timezone.
@@keywords eval, strftime, %h, if, hour

@@q
What's the difference between Splunk Free, Splunk Enterprise, and Splunk Cloud? Which is most common in enterprise SOCs?
@@answer
- **Splunk Free** — single instance, small daily ingest limit (historically 500 MB/day), **no alerting, no user authentication/RBAC, no clustering**. Learning only.
- **Splunk Enterprise** — self-managed (on-prem or your own cloud), licensed by ingest or workload; full features, clustering, apps, ES add-on.
- **Splunk Cloud Platform** — the same capabilities as SaaS, managed by Splunk.
Enterprise SOCs use **Splunk Enterprise or Splunk Cloud, with Enterprise Security** as the SIEM app; the trend is towards Splunk Cloud. Regulated sectors (banks/government in the UAE) often remain on-prem for data residency.
@@why
Mention ES and SOAR — that's what "Splunk SIEM" usually means in a job ad.
@@keywords free, enterprise, cloud, alerting, enterprise security

@@q
You have a Splunk search that takes 45 minutes to run. Name 3 ways to optimize it.
@@answer
1. **Narrow the time range** and always specify **`index=`** (and `sourcetype=`).
2. **Filter as early as possible** — put search terms before the first pipe, avoid leading wildcards (`*admin`), avoid `NOT` on huge sets.
3. Use **`tstats`** against indexed fields or **accelerated data models** instead of raw-event searches.
4. Replace `transaction`/`join` with `stats` by a common key; avoid subsearches over large data.
5. Use `fields` early to drop unneeded fields; use **summary indexing** or report acceleration for recurring heavy searches.
6. Use fast/smart mode and check the **Job Inspector** to see which command is costly.
@@why
In interviews, "check the Job Inspector" shows real experience.
@@keywords index, time range, tstats, data model, filter early, stats, fields

@@problem The BOTS Challenge
@@scenario
Using the **Splunk BOTS v1** dataset (a simulated attack against a fictional company), answer these investigation questions. Use `index=botsv1` and lean on `sourcetype=stream:http`, `suricata`, `fortigate_utm`, `iis` and `XmlWinEventLog:Microsoft-Windows-Sysmon/Operational`.
@@task What is the name of the company being targeted?
@@task Find the IP address of the web server that was attacked.
@@task Identify the attacker's IP address(es).
@@task What scanning tool did the attacker use? (Hint: check User-Agent strings)
@@task Find evidence of a malicious upload to the web server — what was the filename?
@@task After gaining access, what commands/processes did the attacker run?
@@task Was any data or content changed/exfiltrated? If so, what was the destination?
@@task Build a timeline of the entire attack from first scan to last action.
@@task Map every attacker action to a MITRE ATT&CK technique.
@@task Write a 1-page incident report covering the full attack chain.
@@deliverable
Answers to all 10 questions with the SPL query you used for each, plus the incident report.
@@approach
**Spoiler-light guidance** — try first, then check.

- *Company & web server:* `index=botsv1 imreallynotbatman.com` — the scenario targets **Wayne Enterprises**' site `imreallynotbatman.com`. Find its IP: `index=botsv1 sourcetype=stream:http dest_domain=imreallynotbatman.com | stats count by dest_ip` (community write-ups give **192.168.250.70**).
- *Scanner:* `index=botsv1 sourcetype=stream:http dest_ip=192.168.250.70 | stats count by src_ip, http_user_agent | sort - count` — one IP generating huge volume with a scanner UA (**Acunetix** in the widely published answers, from **40.80.148.42**). Confirm with Suricata: `sourcetype=suricata dest_ip=192.168.250.70 | stats count by src_ip, alert.signature`.
- *Brute force & CMS:* look at `http_method=POST` to the admin login path (`uri` contains `/joomla/administrator/`) and `form_data` — a second IP brute forces the CMS admin login. Extract passwords with `rex field=form_data "passwd=(?<pw>[^&]+)"`.
- *Upload:* `sourcetype=stream:http dest_ip=192.168.250.70 http_method=POST` + `part_filename{}` → an uploaded executable (community answer: `3791.exe`). Then Sysmon: `sourcetype=XmlWinEventLog* EventCode=1 3791.exe | table _time ParentImage Image CommandLine Hashes`.
- *Post-exploitation:* Sysmon EventCode=1 on the web server after the upload — commands, child processes, and the defacement (an image file fetched from attacker infrastructure: `sourcetype=stream:http src_ip=192.168.250.70 | stats count by dest_ip, uri`). Use FortiGate/Suricata for outbound connections.
- *ATT&CK mapping:* T1595.002 Vulnerability Scanning; T1190 Exploit Public-Facing Application; T1110.001 Password Guessing; T1078 Valid Accounts (CMS admin); T1505.003/T1105 uploading tools; T1059 command execution; T1491.002 External Defacement.
- *Report:* use the Week 9 template — executive summary, timeline table (each row cites the SPL that proves it), scope, root cause (exposed CMS admin with weak password + no WAF), recommendations (MFA/IP restriction on CMS admin, WAF, patching, file-upload restrictions, EDR on web servers).
