@@week 6
@@month 2 SIEM & DETECTION
@@title KQL Mastery

@@concepts
KQL (Kusto Query Language) is the language of Sentinel, Defender XDR advanced hunting, Azure Data Explorer and Log Analytics. **If you can write KQL from scratch, you can get hired** — most junior candidates can only run templates. This is your edge.

KQL is a **pipeline**: start with a table, then each `|` transforms the result of the previous step. Filter early, aggregate late.

@@topic Fundamentals — master these first
```kql
SecurityEvent                                   // 1. start with a table
| where TimeGenerated > ago(24h)                // 2. filter on time FIRST (performance)
| where EventID == 4625                         // 3. filter rows
| extend Hour = datetime_part("hour", TimeGenerated)   // 4. new columns
| summarize FailedCount = count() by Account, IpAddress // 5. aggregate
| where FailedCount > 10                        // 6. filter the aggregate
| sort by FailedCount desc                      // 7. order
| top 10 by FailedCount                         // or take the top N
| project Account, IpAddress, FailedCount       // 8. choose columns
```
- `where` — filter rows. `project` — choose/rename columns (`project-away` drops some). `extend` — add calculated columns.
- `summarize` — `count()`, `dcount()`, `sum()`, `avg()`, `min()`, `max()`, `make_set()`, `make_list()`, `arg_max()`.
- `sort by` / `order by`, `top N by`, `take N` (random sample — for exploring only).
- `let` — variables, lists and even sub-queries: `let threshold = 10;` `let admins = dynamic(["a","b"]);`
- `join` — combine tables on a key. `union` — stack tables.
- `render timechart | barchart | piechart` — visualise.
- Time: `ago(1h)`, `now()`, `between(datetime(2026-11-01) .. datetime(2026-11-02))`, `startofday()`.

@@topic String operators — and why performance matters
| Operator | Meaning | Notes |
|---|---|---|
| `==` | exact, case-sensitive | fastest for exact values |
| `=~` | exact, case-insensitive | |
| `has` | contains a whole **term** (token) | uses the term index — fast |
| `has_any` / `has_all` | any/all of a list of terms | great for IOC lists |
| `contains` | substring anywhere | scans — slower |
| `startswith` / `endswith` | prefix / suffix | |
| `matches regex` | regex | slowest; use last |
| `in` / `!in` | value in a list | |

KQL indexes **terms** (alphanumeric sequences of 3+ chars split by delimiters). `CommandLine has "mimikatz"` uses the index; `CommandLine contains "katz"` must scan every string. Prefer `has` whenever you're matching a whole word.

@@topic Intermediate KQL
- `make_set(x)` — unique values into an array; `make_list(x)` — all values incl. duplicates.
- `mv-expand` — explode an array into rows (e.g. `mv-expand Users`).
- `parse` — extract fields from unstructured text: `parse SyslogMessage with * "src=" SrcIP " dst=" DstIP " action=" Action`
- `extract("regex", group, field)` — regex extraction.
- `bin(TimeGenerated, 1h)` — bucket time for per-window counts.
- `arg_max(TimeGenerated, *)` — the **latest full row** per group; `arg_min` — earliest.
- `iff(cond, a, b)` / `case(c1, v1, c2, v2, default)` — conditionals.
- `parse_json()` / `todynamic()` + dot notation — dig into JSON (e.g. `LocationDetails.countryOrRegion`).
- `externaldata` — pull a CSV/JSON from a URL or blob at query time (IOC feeds).
- `ipv4_is_private()`, `ipv4_is_in_range()`, `geo_info_from_ip_address()`.

@@topic Advanced KQL for detection
- **Sequences:** `sort by` then `prev()` / `next()` / `row_number()` (inside `serialize`) to compare consecutive events.
- **Time series:** `make-series Count=count() on TimeGenerated step 1h by User` then `series_decompose_anomalies(Count)` to flag spikes.
- **Threat intel joins:** join logs to `ThreatIntelIndicators` / watchlists on IP, domain, hash.
- **Functions:** save reusable logic (parsers like ASIM: `_Im_NetworkSession`) so rules work across sources.

**The detection-rule pattern** (memorise it):
1. **Scope** — table + time window (`ago(1h)`).
2. **Filter** — the suspicious condition.
3. **Aggregate** — count/dcount by entity in a window.
4. **Threshold** — `where Count > N`.
5. **Exclude** — known-good via watchlists.
6. **Project entities** — Account, Host, IP, so you can map them.

@@topic join kinds — know the difference
| kind | Returns |
|---|---|
| `innerunique` (default!) | Left rows deduplicated on the key, matched to right |
| `inner` | All matching combinations |
| `leftouter` | All left rows, matched right columns or empty |
| `leftanti` | Left rows with **no** match (great for "not in allow-list") |
| `leftsemi` | Left rows **with** a match, left columns only |
| `fullouter`, `rightouter`, `rightanti` | |

Beware the default `innerunique` — it silently dedupes the left side. Specify `kind=` explicitly in detections.

@@fieldnotes
- Always put `where TimeGenerated > ago(...)` first. It's the difference between a 2-second and a 2-minute query — and query timeouts are real in big tenants.
- Start exploring a new table with `Table | take 10` and `Table | getschema`.
- `summarize count() by bin(TimeGenerated, 1h) | render timechart` is the fastest way to see if a data source has gaps.
- Comment your rules (`//`) and keep them in Git. The KQL you write this week becomes your portfolio's `/detection-rules` folder.
- Practise on **aka.ms/lademo** (free demo workspace) and the **KC7** game (kc7cyber.com) — free KQL investigation scenarios.

@@lab 20 KQL Challenges
Use your Sentinel workspace or the free Microsoft demo environment (**aka.ms/lademo**). Table names below assume Sentinel (`SigninLogs`, `SecurityEvent`, `Syslog`, `DnsEvents`, `CommonSecurityLog`); adjust to what you have. Solutions are in the tips panel below — **try each one first**.

@@step
**[Beginner 1]** Find all failed sign-ins in the last 24 hours.
@@step
**[Beginner 2]** Find the top 10 users with the most failed sign-ins.
@@step
**[Beginner 3]** Show all sign-ins from outside your country in the last 7 days.
@@step
**[Beginner 4]** List all unique IP addresses that connected via VPN yesterday.
@@step
**[Beginner 5]** Find all Security Events where a new user account was created (Event ID 4720).
@@step
**[Beginner 6]** Show a timeline chart of sign-in events per hour over the last 48 hours.
@@step
**[Beginner 7]** Find all PowerShell process creation events from Sysmon logs.
@@step
**[Intermediate 8]** For each user, count distinct countries signed in from in the last 30 days. Flag anyone with more than 2.
@@step
**[Intermediate 9]** Find "impossible travel": same user signs in from two locations more than 500 km apart within 30 minutes.
@@step
**[Intermediate 10]** For each failed sign-in, check if the same user had a successful sign-in within 10 minutes from a different IP.
@@step
**[Intermediate 11]** Create a watchlist of VIP users and join it with SigninLogs to show only VIP sign-in activity.
@@step
**[Intermediate 12]** Parse an unstructured Syslog message to extract source IP, destination IP and action.
@@step
**[Intermediate 13]** Find processes executed from unusual paths (not C:\Windows, not C:\Program Files).
@@step
**[Intermediate 14]** Show the top 10 most-queried DNS domains, excluding known CDN domains.
@@step
**[Advanced 15]** Detect brute force: 10+ failed logins from the same IP to any account within 5 minutes, followed by a success.
@@step
**[Advanced 16]** Detect data exfiltration: hosts that uploaded more than 100 MB to external IPs in any 1-hour window.
@@step
**[Advanced 17]** Detect lateral movement: accounts that logged into 5+ different hosts within 1 hour.
@@step
**[Advanced 18]** Build a time-series anomaly detection for sign-in volume by hour and flag anomalous spikes.
@@step
**[Advanced 19]** Create a complete analytics rule query: detect a user added to a privileged Entra ID group/role, including entity columns.
@@step
**[Advanced 20]** Hunting query: find Base64-encoded PowerShell commands from Sysmon Event ID 1, decode them and show the plaintext.

@@tips
**Reference solutions** (one valid approach each — yours may differ and still be right)
```kql
// 1
SigninLogs | where TimeGenerated > ago(24h) | where ResultType != "0"
// 2
SigninLogs | where TimeGenerated > ago(24h) | where ResultType != "0"
| summarize Failures = count() by UserPrincipalName | top 10 by Failures
// 3
SigninLogs | where TimeGenerated > ago(7d)
| extend Country = tostring(LocationDetails.countryOrRegion)
| where Country != "AE"
// 4  (CEF VPN example)
CommonSecurityLog | where TimeGenerated between (startofday(ago(1d)) .. startofday(now()))
| where DeviceProduct has "VPN" | distinct SourceIP
// 5
SecurityEvent | where EventID == 4720
| project TimeGenerated, Computer, Creator = SubjectUserName, NewAccount = TargetUserName
// 6
SigninLogs | where TimeGenerated > ago(48h)
| summarize count() by bin(TimeGenerated, 1h) | render timechart
// 7  (Sysmon via Event table)
Event | where Source == "Microsoft-Windows-Sysmon" and EventID == 1
| where RenderedDescription has "powershell.exe"
// 8
SigninLogs | where TimeGenerated > ago(30d) | where ResultType == "0"
| extend Country = tostring(LocationDetails.countryOrRegion)
| summarize Countries = dcount(Country), List = make_set(Country) by UserPrincipalName
| where Countries > 2
// 9
SigninLogs | where TimeGenerated > ago(1d) | where ResultType == "0"
| extend Lat = toreal(LocationDetails.geoCoordinates.latitude),
         Lon = toreal(LocationDetails.geoCoordinates.longitude)
| sort by UserPrincipalName asc, TimeGenerated asc
| extend PrevUser = prev(UserPrincipalName), PrevTime = prev(TimeGenerated),
         PrevLat = prev(Lat), PrevLon = prev(Lon)
| where UserPrincipalName == PrevUser
| extend Km = geo_distance_2points(Lon, Lat, PrevLon, PrevLat) / 1000,
         Minutes = datetime_diff('minute', TimeGenerated, PrevTime)
| where Km > 500 and Minutes <= 30
// 10
let fails = SigninLogs | where ResultType != "0" | project FailTime=TimeGenerated, UserPrincipalName, FailIP=IPAddress;
let ok = SigninLogs | where ResultType == "0" | project OkTime=TimeGenerated, UserPrincipalName, OkIP=IPAddress;
fails | join kind=inner ok on UserPrincipalName
| where OkTime between (FailTime .. FailTime + 10m) and OkIP != FailIP
// 11
let VIPs = _GetWatchlist('VIPUsers') | project UPN = tostring(SearchKey);
SigninLogs | where UserPrincipalName in~ (VIPs)
// 12
Syslog | where SyslogMessage has "action="
| parse SyslogMessage with * "src=" SrcIP " " * "dst=" DstIP " " * "action=" Action " " *
| project TimeGenerated, HostName, SrcIP, DstIP, Action
// 13
SecurityEvent | where EventID == 4688
| where NewProcessName !startswith @"C:\Windows\" and NewProcessName !startswith @"C:\Program Files"
| summarize count() by NewProcessName | sort by count_ asc
// 14
let cdn = dynamic(["akamaiedge.net","cloudfront.net","azureedge.net","fastly.net","windowsupdate.com"]);
DnsEvents | where not(Name has_any (cdn))
| summarize Queries = count() by Name | top 10 by Queries
// 15
let fails = SecurityEvent | where EventID == 4625
| summarize Fails = count(), LastFail = max(TimeGenerated) by IpAddress, bin(TimeGenerated, 5m)
| where Fails >= 10;
fails | join kind=inner (SecurityEvent | where EventID == 4624
    | project SuccessTime = TimeGenerated, IpAddress, Account) on IpAddress
| where SuccessTime between (LastFail .. LastFail + 10m)
// 16
CommonSecurityLog | where TimeGenerated > ago(1d)
| where not(ipv4_is_private(DestinationIP))
| summarize MBOut = sum(SentBytes) / 1048576.0 by SourceIP, bin(TimeGenerated, 1h)
| where MBOut > 100
// 17
SecurityEvent | where EventID == 4624 and LogonType in (3, 10)
| summarize Hosts = dcount(Computer), HostList = make_set(Computer) by Account, bin(TimeGenerated, 1h)
| where Hosts >= 5
// 18
SigninLogs | where TimeGenerated > ago(14d)
| make-series Count = count() default = 0 on TimeGenerated step 1h
| extend (Anomalies, Score, Baseline) = series_decompose_anomalies(Count, 2.5)
| mv-expand TimeGenerated to typeof(datetime), Count to typeof(long), Anomalies to typeof(int)
| where Anomalies == 1
// 19
AuditLogs | where TimeGenerated > ago(1h)
| where OperationName in ("Add member to role", "Add member to group")
| extend Actor = tostring(InitiatedBy.user.userPrincipalName),
         ActorIP = tostring(InitiatedBy.user.ipAddress),
         Target = tostring(TargetResources[0].userPrincipalName),
         RoleOrGroup = tostring(TargetResources[0].modifiedProperties[1].newValue)
| where RoleOrGroup has_any ("Admin", "Privileged")
| project TimeGenerated, Actor, ActorIP, Target, RoleOrGroup, OperationName
// entity mapping: Account=Actor, Account=Target, IP=ActorIP
// 20
Event | where Source == "Microsoft-Windows-Sysmon" and EventID == 1
| extend Cmd = extract(@"CommandLine: (.*)", 1, RenderedDescription)
| where Cmd matches regex @"(?i)-e(nc|ncodedcommand)?\s+[A-Za-z0-9+/=]{20,}"
| extend B64 = extract(@"(?i)-e\w*\s+([A-Za-z0-9+/=]{20,})", 1, Cmd)
| extend Decoded = base64_decode_tostring(B64)   // UTF-16LE: strip nulls if needed
| extend Decoded = replace_string(Decoded, "\u0000", "")
| project TimeGenerated, Computer, Cmd, Decoded
```

@@q
What's the difference between `has` and `contains` in KQL? Which is faster and why?
@@answer
`has` matches a **whole term** (an indexed token bounded by non-alphanumeric characters), while `contains` matches **any substring** anywhere. `has` is **faster** because KQL builds a **term index** at ingestion and `has` can use it; `contains` must scan the full text of every row. Example: `CommandLine has "mimikatz"` matches `Invoke-Mimikatz` and `mimikatz.exe` (the hyphen and dot are term boundaries) but **not** `Invoke-Mimikatz2` (the term there is `Mimikatz2`); `contains "katz"` matches all three because it looks for any substring.
@@why
Rule of thumb: `==` for exact, `has` for words, `contains` only when you really need partial matching. Both are case-insensitive; `has_cs` / `contains_cs` are case-sensitive and faster still.
@@keywords term, index, substring, faster

@@q
Write a KQL query to find the top 5 source IPs generating firewall deny events in the last hour.
@@answer
```kql
CommonSecurityLog
| where TimeGenerated > ago(1h)
| where DeviceAction in~ ("deny", "drop", "block", "reset-both")
| summarize DenyCount = count() by SourceIP
| top 5 by DenyCount
```
@@why
Values for "deny" vary by vendor — check `CommonSecurityLog | summarize count() by DeviceAction` first. With ASIM you could use `_Im_NetworkSession(eventresult='Failure')` to be vendor-agnostic.
@@keywords summarize, count, top 5, ago(1h), deny

@@q
What does `summarize make_set(Computer) by Account` return?
@@answer
One row per **Account**, with a column (`set_Computer`) containing a **dynamic array of the unique Computer values** that account appears with — e.g. `["WS-01","SRV-DB-03"]`. Useful for seeing every host an account touched (lateral movement). Pair with `dcount(Computer)` to threshold on the number of hosts.
@@why
`make_set` dedupes; `make_list` keeps duplicates. Both accept a max size argument (`make_set(Computer, 100)`) — default caps exist.
@@keywords array, unique, per account, distinct

@@q
You want to check if a sign-in happened from a known malicious IP. You have the IPs in a watchlist called "MaliciousIPs". Write the join.
@@answer
```kql
let BadIPs = _GetWatchlist('MaliciousIPs') | project IPAddress = tostring(SearchKey);
SigninLogs
| where TimeGenerated > ago(1d)
| join kind=inner BadIPs on IPAddress
| project TimeGenerated, UserPrincipalName, IPAddress, ResultType, AppDisplayName
```
Simpler alternative without a join: `| where IPAddress in (BadIPs)`.
@@why
`SearchKey` is the watchlist's indexed key column — use it for best performance. Use `kind=inner` explicitly to avoid the default `innerunique` dedupe surprise.
@@keywords _getwatchlist, join, kind=inner, searchkey, in

@@q
What's the difference between `join kind=inner` and `join kind=leftouter`?
@@answer
`inner` returns **only rows where the key exists in both tables** (every matching combination). `leftouter` returns **all rows from the left table**, plus matching columns from the right — where there's no match, the right-side columns are **empty/null**. Use `inner` for "show sign-ins that match a bad IP"; use `leftouter` to enrich everything and keep unmatched rows (e.g. add asset owner info where known).
@@why
Related: `leftanti` returns left rows with **no** match — perfect for "processes not in our approved-software list".
@@keywords both, all rows, left, null, match

@@q
Write a KQL query using `prev()` to find consecutive failed logins from the same account.
@@answer
```kql
SecurityEvent
| where TimeGenerated > ago(1h) and EventID in (4624, 4625)
| project TimeGenerated, Account, EventID, IpAddress
| sort by Account asc, TimeGenerated asc
| extend PrevAccount = prev(Account), PrevEvent = prev(EventID), PrevTime = prev(TimeGenerated)
| where Account == PrevAccount and EventID == 4625 and PrevEvent == 4625
| extend SecondsApart = datetime_diff('second', TimeGenerated, PrevTime)
```
@@why
`prev()` needs a **serialized** (sorted) row set — `sort by` serializes it. Check the previous row is the same account, otherwise you're comparing different users.
@@keywords prev, sort, serialize, 4625

@@q
How does `bin(TimeGenerated, 1h)` help in detection rules?
@@answer
`bin()` rounds timestamps down into fixed buckets (here, 1 hour), so you can `summarize ... by Entity, bin(TimeGenerated, 1h)` to count activity **per entity per time window** — e.g. "more than 100 MB uploaded *in any one hour*" or "20 failures *within* 5 minutes". It turns a stream of events into windowed counts you can threshold on, and powers timecharts and baselines.
@@why
Caveat: fixed bins can split a burst across two buckets (09:58–10:02). For tighter detections use sliding windows (e.g. join-based or `row_window_session`) or overlapping lookbacks.
@@keywords bucket, window, summarize, threshold, per hour

@@q
You have a noisy analytics rule generating 200 false positive alerts/day. How would you tune the KQL to reduce noise?
@@answer
1. **Analyse first:** `SecurityAlert` / the rule's output for 30 days — stack by user, host, IP, app, process to find the repeated FP patterns.
2. **Exclude known-good** via a **watchlist** (service accounts, scanners, admin jump hosts, corporate VPN egress IPs) using `!in` / `leftanti`.
3. **Tighten logic:** raise the threshold, narrow the time window, add conditions (e.g. require success after failure, unfamiliar location, or a risky process parent).
4. **Aggregate:** group into one alert per entity per period rather than one per event; use alert grouping/suppression.
5. **Add context scoring:** severity based on asset criticality/VIP rather than alerting on everything.
6. Validate — re-run over historical data to confirm true positives would still fire, document the change, and review again in 2 weeks.
@@why
Never tune by just disabling or by excluding broad things like "all of Domain Admins" — attackers love blind spots.
@@keywords watchlist, exclude, threshold, analyse, group, true positive

@@q
What does `arg_max(TimeGenerated, *)` do when used inside a summarize?
@@answer
For each group in the `by` clause it returns the **row with the latest (maximum) TimeGenerated**, including **all columns** (`*`). Example: `DeviceInfo | summarize arg_max(TimeGenerated, *) by DeviceName` gives the most recent record per device — its current OS, IP, logged-on user. `arg_min` returns the earliest.
@@why
Classic uses: latest sign-in per user, first time a hash was seen in the environment ("first seen" detections).
@@keywords latest, row, all columns, per group, maximum

@@q
Write a KQL query that finds users who signed in successfully after business hours (before 6 AM or after 8 PM).
@@answer
```kql
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType == "0"
| extend LocalTime = datetime_utc_to_local(TimeGenerated, "Asia/Dubai")
| extend Hour = datetime_part("hour", LocalTime)
| where Hour < 6 or Hour >= 20
| project LocalTime, UserPrincipalName, IPAddress, AppDisplayName,
          Country = tostring(LocationDetails.countryOrRegion)
| sort by LocalTime desc
```
@@why
`TimeGenerated` is UTC — convert to the business's timezone or your "after hours" will be wrong by hours. Add `dayofweek()` to include weekends, and exclude shift workers via a watchlist.
@@keywords hour, resulttype, 20, 6, utc, datetime_part

@@problem The Noisy Alert
@@scenario
Your Sentinel instance has an analytics rule: **"Failed sign-in from foreign IP."** It fires **150+ times per day**. Most are false positives — sales reps travelling, remote workers using VPNs, and a few test accounts. The SOC team is **ignoring this alert entirely** now. Your lead asks you to fix it.
@@task Write a KQL query to analyse the last 30 days of this alert's data: who triggers it, from where, how often, and what % result in actual compromise indicators.
@@task Identify the false positive patterns (frequent travellers, known VPN IPs, test accounts).
@@task Rewrite the KQL for the analytics rule to exclude these patterns while keeping true detection capability.
@@task Add a Watchlist-based exclusion so the SOC can maintain the exception list without editing the query.
@@task Write the before/after metrics: alerts per day before vs after your tuning.
@@task Draft a brief (5 sentences) to your manager explaining what you did and the impact.
@@deliverable
The original query, the tuned query, the exclusion watchlist definition, and the impact summary.
@@approach
**Analysis query:**
```kql
let lookback = 30d;
let fails = SigninLogs
| where TimeGenerated > ago(lookback) and ResultType != "0"
| extend Country = tostring(LocationDetails.countryOrRegion)
| where Country != "AE";
fails
| summarize Fails = count(), Days = dcount(bin(TimeGenerated, 1d)), Countries = make_set(Country),
            IPs = dcount(IPAddress) by UserPrincipalName
| join kind=leftouter (
    SigninLogs | where TimeGenerated > ago(lookback) and ResultType == "0"
    | extend Country = tostring(LocationDetails.countryOrRegion) | where Country != "AE"
    | summarize ForeignSuccess = count() by UserPrincipalName) on UserPrincipalName
| sort by Fails desc
```
Also stack by `IPAddress` + ASN and by `ResultType` (50126 bad password vs 50074 MFA prompt vs 53003 blocked by CA) and check how many of these users had any incident closed as TP.

**Typical FP patterns:** known corporate VPN/ZTNA egress IPs; sales staff with a travel pattern (same 3 countries every month); test/service accounts; `ResultType` that means "MFA required/interrupted" rather than a wrong password; Conditional Access blocks (already prevented).

**Watchlist `SigninExclusions`** (CSV): `SearchKey,Type,Reason,Owner,Expiry` — e.g. `198.51.100.10,IP,Corporate VPN egress,NetOps,2027-06-30` and `sales.rep@corp.com,User,Approved traveller,Sales Mgr,2026-12-31`. Expiry forces periodic review.

**Tuned rule:**
```kql
let ex = _GetWatchlist('SigninExclusions');
let exIPs = ex | where Type == "IP" | project tostring(SearchKey);
let exUsers = ex | where Type == "User" and todatetime(Expiry) > now() | project tostring(SearchKey);
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType in ("50126", "50053", "50055")        // real credential failures
| extend Country = tostring(LocationDetails.countryOrRegion)
| where Country != "AE"
| where IPAddress !in (exIPs) and UserPrincipalName !in~ (exUsers)
| summarize Fails = count(), IPs = make_set(IPAddress), FirstSeen = min(TimeGenerated)
            by UserPrincipalName, Country
| where Fails >= 3
| join kind=leftouter (SigninLogs | where TimeGenerated > ago(1h) and ResultType == "0"
        | project UserPrincipalName, SuccessIP = IPAddress) on UserPrincipalName
| extend Severity = iff(isnotempty(SuccessIP), "High", "Medium")
```
Entities: Account = UserPrincipalName, IP = IPs/SuccessIP.

**Metrics example:** Before: 152 alerts/day, ~0.5% actionable, MTTA ignored. After: 9 alerts/day, ~20% actionable — an ~94% reduction, with every historical TP still detected in a 30-day replay.

**Manager brief:** *"The 'Failed sign-in from foreign IP' rule was generating ~150 alerts a day, almost all from our VPN egress IPs, approved travellers and test accounts, so the team had stopped reviewing it. I analysed 30 days of data, moved those known-good patterns into a reviewable watchlist with owners and expiry dates, and changed the rule to only count genuine credential failures, escalating severity when a foreign failure is followed by a success. Replaying the last 30 days, the rule drops to about 9 alerts per day while still catching every case we previously confirmed as malicious. This returns roughly 10 analyst-hours per week and turns an ignored rule back into a useful detection. I'll review the watchlist and alert quality again in two weeks."*
