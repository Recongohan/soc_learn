@@week 1
@@month 1 FOUNDATIONS
@@title Networking Fundamentals for SOC

@@concepts
You can't triage alerts if you don't understand what's moving across the wire. This week covers the networking knowledge SOC analysts use daily — your CCNA material covers most of it, so treat this as review with a **SOC lens**: for every protocol, ask "what does normal look like, and how would an attacker abuse it?"

@@topic OSI Model — the layers that matter in a SOC
You'll rarely talk about all 7 layers on shift. Three do most of the work:

| Layer | Name | What you see in logs | SOC example |
|---|---|---|---|
| L3 | Network | Source/destination IP | Firewall deny from 203.0.113.45 |
| L4 | Transport | Ports, TCP flags, UDP | SYN flood, port scan, outbound :4444 |
| L7 | Application | URLs, DNS names, user agents, HTTP methods | Proxy log: POST to /upload.php, DNS query to a8x9k2m.xyz |

- **Firewalls** mostly reason at L3/L4 (IP + port + allow/deny).
- **Proxies, WAFs, email gateways and DNS logs** give you L7 — the "what" and "who".
- When an alert comes in, ask: *which layer is this telemetry from, and which layer do I need to answer the question?* A firewall log tells you 10.0.1.15 talked to 45.33.x.x:443 — only the proxy/EDR tells you *what* was sent.

@@topic TCP/IP — how a packet travels
1. App creates data → TCP/UDP adds ports (L4) → IP adds addresses (L3) → Ethernet adds MACs (L2).
2. The host checks: is the destination in my subnet? If yes → ARP for its MAC. If no → send to the default gateway's MAC.
3. Each router strips L2, reads L3, forwards, re-adds L2. **NAT** at the edge rewrites the private source IP to the public one.

**SOC framing:** NAT is why your external firewall logs show only your public IP — you need internal firewall/NAT translation logs or proxy logs to map traffic back to an internal host.

**TCP vs UDP:**
- **TCP** — connection-oriented, reliable, 3-way handshake (SYN → SYN-ACK → ACK), flags (SYN, ACK, FIN, RST, PSH, URG). Used by HTTP/S, SSH, SMB, RDP, SMTP.
- **UDP** — connectionless, no handshake, fast. Used by DNS (mostly), DHCP, NTP, SNMP, syslog, VoIP, QUIC.
- Lots of SYNs with no completion = scan or SYN flood. Lots of RSTs back = closed ports being probed.

@@topic DNS — the protocol attackers love
**How resolution works:** client → local resolver (corporate DNS) → root → TLD (.com) → authoritative server → answer cached with a TTL.

Record types you'll see: `A` (IPv4), `AAAA` (IPv6), `CNAME` (alias), `MX` (mail), `TXT` (arbitrary text — abused for C2), `NS`, `PTR` (reverse lookup).

**Why attackers abuse DNS:** almost every network allows outbound DNS, and few teams inspect it.
- **DNS tunneling / exfiltration** — data encoded in subdomains: `aGVsbG8gd29ybGQ.exfil.attacker.com`. Indicators: very long query names (>50 chars), high-entropy labels, huge volume to one domain, lots of `TXT`/`NULL` queries, queries going directly to an external resolver instead of your corporate DNS.
- **DGA (Domain Generation Algorithms)** — malware generates hundreds of random domains (`a8x9k2m.xyz`, `qpwlzt.top`) and the operator registers one. Indicators: many NXDOMAIN responses, random-looking names, cheap TLDs.
- **DNS hijacking / poisoning** — redirecting resolution to attacker infrastructure.
- **Fast flux** — one domain rapidly rotating through many IPs.

**Hunting rule of thumb:** any internal host querying a DNS server that is *not* your corporate resolver is worth a look.

@@topic HTTP/HTTPS and TLS basics
**HTTP request:** method (`GET`, `POST`, `PUT`), URL, headers (`Host`, `User-Agent`, `Cookie`, `Referer`), body.
**Status codes:** `200` OK, `301/302` redirect, `401` unauthorized, `403` forbidden, `404` not found, `500` server error.

SOC-relevant patterns:
- A burst of `404`s from one IP = directory brute forcing / scanning.
- `POST` to an odd file like `/images/logo.php` = possible web shell.
- User agents like `sqlmap`, `Nikto`, `python-requests`, `curl` hitting your web app = tooling, not humans.
- Many `401`s followed by a `200` on a login endpoint = password spraying that worked.

**TLS handshake (simplified):** ClientHello (with **SNI** — the hostname in cleartext) → ServerHello + certificate → key exchange → encrypted. Even without decryption you can see **SNI, certificate issuer, JA3/JA4 fingerprints, bytes in/out and timing**. Self-signed certs or brand-new Let's Encrypt certs on random domains are classic C2 signals.

@@topic Common ports — memorise these
| Port | Protocol | Why a SOC analyst cares |
|---|---|---|
| 20/21 | FTP | Cleartext creds, legacy exfil |
| 22 | SSH | Brute force, tunnelling, lateral movement on Linux |
| 23 | Telnet | Cleartext — should not exist in 2026 |
| 25 / 587 | SMTP | Phishing delivery, spam from infected hosts |
| 53 | DNS | Tunneling, DGA, exfil |
| 80 / 443 | HTTP/HTTPS | C2 hides here because it blends in |
| 88 | Kerberos | Kerberoasting, golden/silver tickets |
| 135 / 139 / 445 | RPC / NetBIOS / SMB | Lateral movement, PsExec, ransomware spread, EternalBlue |
| 389 / 636 | LDAP / LDAPS | AD enumeration (BloodHound) |
| 1433 / 3306 | MSSQL / MySQL | Database attacks |
| 3389 | RDP | Brute force, lateral movement, ransomware entry |
| 5985 / 5986 | WinRM | PowerShell remoting lateral movement |
| 4444 | Metasploit default | Reverse shells |
| 9001 / 9050 | Tor | Anonymised C2 |

@@topic DHCP and ARP
- **DHCP** (UDP 67/68): DORA — Discover, Offer, Request, Acknowledge. DHCP logs are gold for investigations: they map **IP → MAC → hostname at a point in time**. IPs change; always check who had the IP *when the alert fired*.
- **Rogue DHCP server** = attacker hands out their own gateway/DNS → man-in-the-middle.
- **ARP** maps IP → MAC on the local segment. It has no authentication, so an attacker can send gratuitous ARP replies claiming "I am the gateway" (**ARP spoofing / poisoning**) to sit in the middle of traffic. Detect via duplicate IP-to-MAC mappings, ARP storms, or tools like arpwatch / switch Dynamic ARP Inspection.

@@topic Subnetting and CIDR
- `/24` = 255.255.255.0 = 256 addresses, 254 usable hosts. `/16` = 65,536 addresses. `/32` = one host.
- **Private (RFC 1918) ranges:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Also `127.0.0.0/8` loopback and `169.254.0.0/16` APIPA (DHCP failed).
- Private IPs are not routable on the internet, so they **never appear as the source in your external firewall logs** after NAT — you'll see your public IP instead.
- SOC usage: writing exclusions (`not ipv4_is_private(DestIP)` in KQL), knowing whether traffic is east-west (internal↔internal = lateral movement territory) or north-south (internal↔internet = C2/exfil territory).

@@fieldnotes
- In real SOCs you rarely get full packet capture. You mostly get **flow data** (NetFlow, firewall logs) plus **proxy and DNS logs**. Wireshark skills still matter for PCAP attached to IDS alerts and for incident deep-dives.
- Always resolve "who had this IP at that time?" via DHCP/VPN/EDR before naming a host in a ticket. Wrong host = wrong user accused.
- "It's HTTPS so it's fine" is the most dangerous sentence in a SOC — most C2 runs over 443.
- Beaconing (regular connections at fixed intervals with small, consistent byte sizes) is one of the most reliable network-based compromise indicators.

@@lab Build a Packet Capture Station
Get hands-on with packets so that later, when an IDS alert ships a PCAP, you know exactly what to do with it.

@@step
Install **Wireshark** on your machine (wireshark.org). On Windows also install Npcap when prompted.

@@step
Start a capture on your active interface and generate traffic for **5 minutes**: browse a few sites, run `nslookup example.com`, ping your gateway.

@@step
Filter all **DNS** queries and responses: `dns`. Then only queries: `dns.flags.response == 0`. Find a query and its matching response (same Transaction ID).

@@step
Find any cleartext **HTTP** traffic: `http`. Visit `http://neverssl.com` to guarantee some. Right-click → Follow → HTTP Stream. What headers and data can you read in cleartext?

@@step
Find a full **TCP 3-way handshake**: `tcp.flags.syn == 1 && tcp.flags.ack == 0` to find SYNs, then follow that stream and identify SYN → SYN-ACK → ACK.

@@step
Isolate all traffic to/from one IP: `ip.addr == 93.184.215.14` (swap in a real IP from your capture). Then try `ip.src ==` and `ip.dst ==` to see the difference.

@@step
Use **Statistics → Conversations** and **Statistics → Protocol Hierarchy**. Which host talked the most? This is "stacking" — the same technique you'll use in a SIEM.

@@step
Export 3 interesting packets: select them → File → Export Specified Packets → save as `week1-interesting.pcap`. Write one sentence on why each is interesting.

@@step
**Bonus:** On a Linux VM run `sudo tcpdump -i any -nn port 53 -w dns.pcap`, generate some lookups, then open the file in Wireshark. Compare `tcpdump -nn -r dns.pcap` CLI output with the GUI view.

@@tips
**Wireshark filters cheat sheet**
```
dns                              # all DNS
dns.qry.name contains "google"   # queries for a name
dns.flags.rcode == 3             # NXDOMAIN (DGA hunting)
http.request.method == "POST"    # uploads / form posts
tcp.flags.syn==1 && tcp.flags.ack==0   # connection attempts (scans)
tcp.flags.reset == 1             # resets
tcp.port == 4444                 # common reverse shell port
ip.addr == 1.2.3.4               # anything to/from an IP
tls.handshake.extensions_server_name  # SNI hostnames in TLS
frame.len > 1000                 # big packets
```
Display filters (above) are different from capture filters (BPF, e.g. `port 53`). Capture filters decide what's saved; display filters decide what you see.

@@q
A user reports a website isn't loading. You see DNS queries going out but no responses. What layer of the OSI model is the problem most likely at, and what would you check first?
@@answer
DNS is an Application-layer (L7) protocol, but "queries out, no responses" usually points to a **network/transport reachability problem (L3/L4)** to the DNS server — or the DNS service itself being down. First checks: can the host reach its configured DNS server (`ping`/`Test-NetConnection <dns> -Port 53`)? Is it using the *right* DNS server (`ipconfig /all`)? Does `nslookup site.com <other-server>` work? Is a firewall blocking UDP/TCP 53?
@@why
Work up the stack: confirm connectivity to the resolver (L3), confirm port 53 isn't blocked (L4), then confirm the DNS service answers (L7). In a SOC context, also note *which* DNS server the host is using — a host pointed at an unknown external resolver is itself a red flag (malware often changes DNS settings).
@@keywords dns server, port 53, firewall, nslookup, network

@@q
What's the difference between TCP and UDP? Give one protocol that uses each and why.
@@answer
**TCP** is connection-oriented and reliable: 3-way handshake, sequencing, acknowledgements and retransmission. Example: **HTTPS** — a web page must arrive complete and in order. **UDP** is connectionless, no handshake or guaranteed delivery, lower overhead. Example: **DNS** — a tiny query/answer where speed matters and the client can simply retry (also VoIP, NTP, DHCP, syslog).
@@why
SOC relevance: TCP gives you session state (SYN/ACK/RST patterns reveal scans), while UDP is easy to spoof and is used for amplification DDoS (DNS, NTP, memcached). DNS falls back to TCP for large responses and zone transfers — unexpected TCP/53 can indicate tunneling or an AXFR attempt.
@@keywords connection, handshake, reliable, connectionless, dns, http

@@q
You see traffic on port 4444 outbound from an internal host. Why should this concern you?
@@answer
Port 4444 is the **default Metasploit/Meterpreter reverse shell (listener) port** and has no common legitimate business use. Outbound traffic to it suggests the host may be calling back to attacker infrastructure (C2 / reverse shell). Check: which process owns the connection (EDR/Sysmon Event ID 3, `netstat -ano`), the destination IP's reputation, when it started, and what ran on the host just before.
@@why
Non-standard high ports outbound are a classic C2 indicator. Mature attackers use 443 to blend in, so the absence of 4444 doesn't mean safe — but its presence is a strong signal worth immediate triage. Egress filtering (default-deny outbound except approved ports) would block this entirely.
@@keywords metasploit, reverse shell, c2, process

@@q
Explain what happens during a TCP 3-way handshake. Draw it out.
@@answer
```
Client                     Server
  | ---- SYN (seq=x) ------>  |   "I want to connect"
  | <-- SYN-ACK (seq=y,ack=x+1)|  "OK, I acknowledge"
  | ---- ACK (ack=y+1) ----->  |   "Connection established"
```
The client sends SYN with an initial sequence number, the server replies SYN-ACK acknowledging it and sending its own sequence number, and the client ACKs. Data then flows. Teardown is FIN/ACK (graceful) or RST (abrupt).
@@why
In logs: lots of SYNs with no ACK = SYN scan (`nmap -sS`) or SYN flood. SYN → RST = closed port. A complete handshake means a real session was established — which is why "connection allowed and established" in a firewall log matters more than "attempted".
@@keywords syn, syn-ack, ack, sequence

@@q
A host is sending hundreds of DNS queries to random-looking domains (e.g., a8x9k2m.xyz). What attack technique might this indicate?
@@answer
A **Domain Generation Algorithm (DGA)** — malware generating pseudo-random domains to find its live C2 server (MITRE **T1568.002 Dynamic Resolution: Domain Generation Algorithms**). Expect many **NXDOMAIN** responses with occasional successful resolution (the domain the attacker actually registered). Could also be DNS tunneling if names are long and carry encoded data.
@@why
Next steps: identify the process making the queries (Sysmon Event ID 22 DNSEvent / EDR), find any domain that *did* resolve and what IP it pointed to, block it, and check other hosts for the same pattern. Entropy scoring and NXDOMAIN ratios are standard detections.
@@keywords dga, domain generation, nxdomain, c2, malware

@@q
What's the difference between a private IP (10.x.x.x) and a public IP? Can you see private IPs in external firewall logs?
@@answer
Private IPs (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are used inside networks and are **not routable on the internet**; public IPs are globally unique and routable. Because of **NAT**, internal hosts appear as the organisation's public IP on the internet — so on the *outside* interface of an external firewall you normally see the public (translated) IP, not the private one. You'd need the internal-side/NAT translation logs or proxy logs to map back to the internal host.
@@why
A private IP showing up as a source from the internet side is an anomaly (spoofing or misconfiguration). For investigations, keep NAT and DHCP logs — without them you cannot attribute external activity to a specific internal machine.
@@keywords rfc 1918, nat, routable, translation

@@q
You capture a packet with source IP 192.168.1.50 and destination port 445. What protocol is this, and what kind of activity might it represent?
@@answer
Port 445 is **SMB** (Server Message Block) — Windows file sharing, also used for named pipes, PsExec, and remote admin. It may be normal (mapping a file share), or it may indicate **lateral movement** (PsExec, remote service creation), **ransomware spreading** to shares, worm activity (WannaCry/EternalBlue), or **SMB scanning** if one host hits many destinations on 445.
@@why
Context decides: workstation → file server on 445 is normal. Workstation → many other workstations on 445 is not (workstations rarely talk to each other). SMB outbound to the internet should essentially never happen and should be blocked.
@@keywords smb, lateral movement, file share, ransomware, psexec

@@q
What does ARP do? How could an attacker abuse it?
@@answer
**ARP (Address Resolution Protocol)** resolves an IP address to a MAC address on the local network segment. It has **no authentication**, so an attacker can send forged (gratuitous) ARP replies claiming to be the gateway's IP — **ARP spoofing/poisoning** — so victims send traffic to the attacker's MAC. This enables man-in-the-middle: sniffing, credential theft, session hijacking, or DoS.
@@why
Detection: duplicate IP→MAC mappings, a single MAC claiming many IPs, ARP storms, arpwatch alerts. Mitigation: Dynamic ARP Inspection + DHCP snooping on switches, static ARP for critical hosts, and encrypting traffic so MITM yields little. MITRE: T1557.002 ARP Cache Poisoning.
@@keywords mac, spoofing, poisoning, man-in-the-middle

@@q
What is a subnet mask, and what does /24 mean in CIDR notation?
@@answer
A subnet mask defines which part of an IP address is the **network** portion and which is the **host** portion. `/24` means the first 24 bits are network bits → mask 255.255.255.0 → 256 addresses (e.g. 192.168.1.0–192.168.1.255), of which **254 are usable** hosts (minus network and broadcast addresses).
@@why
SOC use: scoping ("is 10.0.3.22 in the server VLAN 10.0.3.0/24?"), writing firewall rules and SIEM exclusions, and recognising when a host scans its whole /24 — a common discovery behaviour.
@@keywords network, host, 255.255.255.0, 254, 256

@@q
You're told to check if a host is communicating with a known malicious IP. Which Wireshark filter would you use?
@@answer
`ip.addr == <malicious_ip>` — matches packets where the IP is either source or destination. To narrow to a specific host pair: `ip.addr == 10.0.0.5 && ip.addr == <malicious_ip>`. For a list of IOCs: `ip.addr in {1.2.3.4 5.6.7.8}`.
@@why
`ip.src` / `ip.dst` restrict direction. In a real SOC you'd do this first in the SIEM across firewall/proxy logs for **all** hosts (one IOC is rarely limited to one host), then use the PCAP to see exactly what was exchanged.
@@keywords ip.addr

@@problem The Suspicious DNS Traffic
@@scenario
You're a Tier 1 SOC analyst on the morning shift. An automated alert fires: **"High volume DNS queries from endpoint WORKSTATION-47 to non-standard DNS servers."** The alert shows **3,200 DNS queries in the last hour** to `185.43.xx.xx` (not your company's DNS server). Normal baseline for this host is ~50 queries/hour.
@@task Write down your first 3 investigation steps.
@@task What tool would you use to look at the actual DNS query content?
@@task What are the possible explanations? (List at least 3: malicious and benign)
@@task Draft a 5-sentence escalation note to the Tier 2 analyst explaining what you found and why you're escalating.
@@task What containment action would you recommend if this turns out to be DNS exfiltration?
@@deliverable
A written investigation note (half a page) covering steps taken, findings, assessment, and recommendation.
@@approach
**First 3 steps (in order):**
1. **Identify the owner and process** — who is logged into WORKSTATION-47, which process is generating the queries (EDR / Sysmon Event ID 22 `DNSEvent` or Event ID 3 network connections to 185.43.x.x:53).
2. **Look at the query content** — DNS logs / Zeek `dns.log` / EDR / a PCAP: are the names long and random (`4f6a2b...c9.example.xyz`)? Same parent domain? Mostly `TXT` records? High NXDOMAIN rate?
3. **Enrich the IP and domain** — VirusTotal, AbuseIPDB, WHOIS / domain age, internal TI. Then check if **any other hosts** talk to 185.43.x.x (scope).

**Tools:** Wireshark/tcpdump on a PCAP, Zeek, the EDR's network telemetry, or the SIEM (`DnsEvents` / Sysmon EID 22). Example KQL:
```kql
DeviceNetworkEvents
| where RemoteIP startswith "185.43." and RemotePort == 53
| summarize Queries=count(), Procs=make_set(InitiatingProcessFileName) by DeviceName
```

**Possible explanations:**
- Malicious: DNS tunneling/exfil (e.g. dnscat2, iodine), DGA malware, DNS-based C2 beaconing.
- Benign: a user-configured public resolver or VPN client, misconfigured software stuck in a retry loop, a browser using DNS-over-HTTPS fallback, a security/monitoring tool.

**Example escalation note:**
> WORKSTATION-47 (user: j.doe) generated ~3,200 DNS queries in the past hour to external resolver 185.43.x.x, ~64x its 50/hr baseline and bypassing our corporate DNS. The queries are generated by `update.exe` from `C:\Users\Public\` and are mostly TXT lookups for long, high-entropy subdomains of a single domain registered 6 days ago. This pattern is consistent with DNS tunneling (T1071.004) and possible exfiltration (T1048). No other hosts are contacting this IP so far. I'm escalating as P2 and recommend isolating the host; PCAP and query samples are attached to the ticket.

**Containment if exfil is confirmed:** isolate the host via EDR (keep it powered on for memory), block 185.43.x.x and the parent domain at the firewall/DNS, **force all outbound DNS through the corporate resolver** (block 53 outbound for everything else), sinkhole the domain, reset the user's credentials, and preserve evidence before reimaging.
