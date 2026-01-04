## ICMPv6 Structure and Types

### Basic ICMPv6 Header Structure
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type      |     Code      |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                         Message Body                          +
|                                                               |
```

### ICMPv6 Message Types

#### Error Messages (Types 1-127)

**Type 1: Destination Unreachable**
```
Code 0: No route to destination
Code 1: Communication administratively prohibited
Code 2: Beyond scope of source address
Code 3: Address unreachable
Code 4: Port unreachable
Code 5: Source address failed ingress/egress policy
Code 6: Reject route to destination
Code 7: Error in Source Routing Header
```

**Type 2: Packet Too Big**
```
Code: 0 (always)
Body includes: MTU (4 bytes) + As much of original packet as possible
```

**Type 3: Time Exceeded**
```
Code 0: Hop limit exceeded in transit
Code 1: Fragment reassembly time exceeded
```

**Type 4: Parameter Problem**
```
Code 0: Erroneous header field encountered
Code 1: Unrecognized Next Header type encountered
Code 2: Unrecognized IPv6 option encountered
Body includes: Pointer (4 bytes) indicating error location
```

#### Informational Messages (Types 128-255)

**Type 128: Echo Request**
```
Code: 0
Used by: ping6
Body: Identifier + Sequence Number + Data
```

**Type 129: Echo Reply**
```
Code: 0
Response to: Echo Request
Body: Same as Echo Request
```

**Type 133: Router Solicitation (RS)**
```
Code: 0
Source: Host seeking routers
Destination: ff02::2 (all-routers)
Options: Source Link-Layer Address
```

**Type 134: Router Advertisement (RA)**
```
Code: 0
Source: Router
Destination: ff02::1 (all-nodes) or unicast
Flags: M|O|H|Prf|P|R
Options: 
- Prefix Information
- MTU
- Source Link-Layer Address
- Route Information
- DNS Information ([RFC 8106](https://www.rfc-editor.org/rfc/rfc8106))
```

**Type 135: Neighbor Solicitation (NS)**
```
Code: 0
Purpose: Address resolution, DAD, NUD
Target: Solicited IPv6 address
Options: Source Link-Layer Address
```

**Type 136: Neighbor Advertisement (NA)**
```
Code: 0
Flags: R|S|O (Router|Solicited|Override)
Target: IPv6 address being advertised
Options: Target Link-Layer Address
```

**Type 137: Redirect**
```
Code: 0
Source: Router only
Purpose: Inform host of better next-hop
Body: Target Address + Destination Address
```

### Multicast Listener Discovery (MLD)

**Type 130: Multicast Listener Query**
```
Code: 0
Versions: MLDv1 ([RFC 2710](https://www.rfc-editor.org/rfc/rfc2710)), MLDv2 ([RFC 3810](https://www.rfc-editor.org/rfc/rfc3810))
```

**Type 131: Multicast Listener Report (MLDv1)**
```
Code: 0
```

**Type 132: Multicast Listener Done**
```
Code: 0
```

**Type 143: Multicast Listener Report (MLDv2)**
```
Code: 0
```

### Secure Neighbor Discovery (SEND)

**Type 148: Certification Path Solicitation**
**Type 149: Certification Path Advertisement**

### Other Important Types

**Type 138: Router Renumbering**
```
Code 0: Router Renumbering Command
Code 1: Router Renumbering Result
Code 255: Sequence Number Reset
```

**Type 139: Node Information Query**
**Type 140: Node Information Response**

**Type 141: Inverse ND Solicitation**
**Type 142: Inverse ND Advertisement**

### Mobile IPv6 Types

**Type 144: Home Agent Address Discovery Request**
**Type 145: Home Agent Address Discovery Reply**
**Type 146: Mobile Prefix Solicitation**
**Type 147: Mobile Prefix Advertisement**

### RPL (Routing Protocol for Low-Power)

**Type 155: RPL Control Message**

## Practical Examples

### 1. Capturing ICMPv6 with tcpdump:
```bash
# All ICMPv6
tcpdump -i eth0 icmp6

# Specific types
tcpdump -i eth0 'icmp6 and icmp6[0] == 134'  # Router Advertisements
tcpdump -i eth0 'icmp6 and icmp6[0] == 135'  # Neighbor Solicitations
```

### 2. Generating ICMPv6 Messages:
```bash
# Echo Request
ping6 2001:db8::1

# Router Solicitation
rdisc6 eth0

# Neighbor Discovery
ndisc6 2001:db8::1 eth0
```

### 3. Common Wireshark Filters:
```
icmpv6.type == 1              # Destination Unreachable
icmpv6.type == 134            # Router Advertisement
icmpv6.type == 135            # Neighbor Solicitation
icmpv6.code == 0              # Specific code
icmpv6.nd.flag.router         # RA with Router flag
```

## Security Considerations

### Critical Warning: Default-Deny Breaks IPv6

**ICMPv6 is mandatory for IPv6 operation.** Unlike ICMP in IPv4, blocking ICMPv6 breaks fundamental IPv6 functionality. A whitelist approach that drops all ICMPv6 by default will cause:

- **Path MTU Discovery failures** (black holes) - Type 2 is essential
- **Neighbor Discovery timeouts** - Types 133-137 are critical
- **Missing error reports** - Types 1, 3, 4 provide vital feedback
- **Broken address resolution** - NS/NA (Types 135/136) required
- **Silent connectivity failures** - hard to debug

### Why Default-Accept is Safer

1. **Future compatibility**: New ICMPv6 types won't break your network
2. **[RFC 4890](https://www.rfc-editor.org/rfc/rfc4890) compliance**: Standards recommend allowing ICMPv6 with specific exceptions
3. **Operational safety**: Less risk of accidentally breaking critical functions
4. **Easier debugging**: Error messages remain visible for troubleshooting

### Security Best Practices

Instead of whitelisting specific types, focus on:
- **Drop known attack patterns** (spoofed ND, flooding)
- **Rate limit** potential DoS vectors
- **Interface-specific rules** for untrusted networks
- **Accept everything else** to maintain functionality

### Core Router Configuration (Internal Networks)
```mikrotik
/ipv6 firewall raw

# Drop Routing Header Type 0 (deprecated per RFC 5095)
add action=drop chain=prerouting comment="Drop RH0 - deprecated routing header" ipv6-header=route

# Anti-spoofing: ND messages MUST have hop limit 255
add chain=prerouting protocol=icmpv6 icmp-options=133:0-137:0 hop-limit=not-equal:255 action=drop comment="Drop spoofed ND"

# WAN Interface Protection
add chain=prerouting in-interface=WAN protocol=icmpv6 icmp-options=133:0 action=drop comment="No RS from WAN"
add chain=prerouting in-interface=WAN protocol=icmpv6 icmp-options=134:0 action=drop comment="No RA from WAN"
add chain=prerouting in-interface=WAN protocol=icmpv6 icmp-options=137:0 action=drop comment="No Redirects from WAN"

# Rate limiting
add chain=prerouting protocol=icmpv6 icmp-options=128:0 limit=50,20:packet action=accept comment="Rate limit Echo Request"
add chain=prerouting protocol=icmpv6 icmp-options=128:0 action=drop comment="Drop excess Echo Requests"
add chain=prerouting protocol=icmpv6 icmp-options=1:0-7 limit=100,50:packet action=accept comment="Rate limit errors"
add chain=prerouting protocol=icmpv6 icmp-options=1:0-7 action=drop

# Jump to ICMPv6 chain for specific filtering
add action=jump chain=prerouting comment="Jump to ICMPv6 chain" jump-target=icmpv6 protocol=icmpv6

# Accept everything else
add action=accept chain=prerouting comment="Accept from LAN" in-interface=LAN
add action=accept chain=prerouting comment="Accept from WAN" in-interface=WAN

# ICMPv6 chain - drop only specific deprecated types
add action=drop chain=icmpv6 comment="Drop deprecated FMIPv6 (RFC5568)" icmp-options=154:4-5 protocol=icmpv6
```

### Edge Router Configuration (IX/Transit Facing)
```mikrotik
/ipv6 firewall raw

# PREROUTING (Ingress Protection)
# Block ND messages from IX - these should only be link-local
add chain=prerouting in-interface=ix-port protocol=icmpv6 icmp-options=133:0 action=drop comment="No RS from IX"
add chain=prerouting in-interface=ix-port protocol=icmpv6 icmp-options=134:0 action=drop comment="No RA from IX"
add chain=prerouting in-interface=ix-port protocol=icmpv6 icmp-options=137:0 action=drop comment="No Redirects from IX"

# Anti-spoofing for all ND messages
add chain=prerouting protocol=icmpv6 icmp-options=133:0-137:0 hop-limit=not-equal:255 action=drop comment="Drop spoofed ND"

# Rate limiting to prevent floods
add chain=prerouting protocol=icmpv6 icmp-options=1:0-7 limit=100,50:packet action=accept comment="Rate limit errors"
add chain=prerouting protocol=icmpv6 icmp-options=1:0-7 action=drop
add chain=prerouting protocol=icmpv6 icmp-options=128:0 limit=10,5:packet action=accept comment="Rate limit pings"
add chain=prerouting protocol=icmpv6 icmp-options=128:0 action=drop

# CRITICAL: Accept everything else
add chain=prerouting protocol=icmpv6 action=accept comment="Accept all other ICMPv6"

# OUTPUT (Egress Protection)
# Don't leak internal ND to IX
add chain=output out-interface=ix-port protocol=icmpv6 icmp-options=134:0 action=drop comment="No RA to IX"
add chain=output out-interface=ix-port protocol=icmpv6 icmp-options=137:0 action=drop comment="No Redirects to IX"

# Rate limit responses
add chain=output protocol=icmpv6 icmp-options=129:0 limit=10,5:packet action=accept
add chain=output protocol=icmpv6 icmp-options=129:0 action=drop

# Accept everything else
add chain=output protocol=icmpv6 action=accept
```

### Common Mistakes to Avoid

**WRONG - Breaks IPv6:**
```mikrotik
# Never do this - blocks too much
add chain=prerouting protocol=icmpv6 icmp-options=135:0 action=accept
add chain=prerouting protocol=icmpv6 icmp-options=136:0 action=accept
add chain=prerouting protocol=icmpv6 action=drop comment="Drop rest"
```

This approach:
- Blocks Path MTU Discovery (Type 2)
- Blocks error reporting (Types 1, 3, 4)
- Blocks multicast (Types 130-132, 143)
- Blocks future protocol extensions
- Creates hard-to-debug failures

### Advanced ICMPv6 Filtering (Production-Ready)

For service providers and large networks, this approach provides comprehensive security while maintaining IPv6 functionality:

**Key Principles:**
1. Drop specific known threats (deprecated headers, spoofed packets)
2. Rate limit potential DoS vectors
3. Use jump chains for organized filtering
4. Accept everything else to ensure IPv6 works

**Extension Header Filtering:**
```mikrotik
# Drop Type 0 (Hop-by-Hop when not first) and Type 43 (Routing Header Type 0)
# These are deprecated and pose security risks (RFC5095, RFC8200)
add action=drop chain=prerouting comment="Drop deprecated headers" headers=hop,route:contains
```

**Why This Works:**
- The `jump-target=icmpv6` allows specific filtering in a dedicated chain
- Only deprecated FMIPv6 messages (154:4-5) are dropped in that chain
- Control returns to prerouting, which then accepts all remaining ICMPv6
- This maintains the "default accept" principle while filtering known threats

This approach is documented in detail in [Daryll Swer's Edge Router/BNG Optimization Guide](https://www.daryllswer.com/edge-router-bng-optimisation-guide-for-isps/), which includes additional optimizations like:
- Address-list based filtering for bogons
- Notrack rules for performance
- Comprehensive anti-spoofing measures

### Testing Your Configuration

```bash
# Test basic connectivity
ping6 -c 5 2001:db8::1

# Test Path MTU Discovery
ping6 -s 1500 -M do 2001:db8::1

# Test Neighbor Discovery
ndisc6 2001:db8::1 eth0

# Monitor dropped ICMPv6
/ipv6 firewall raw print stats where action=drop

# Live monitoring
tcpdump -i eth0 -n icmp6
```

### Key Points

- ICMPv6 is mandatory for IPv6 operation (unlike ICMP in IPv4)
- Never use default-drop for ICMPv6 - it breaks IPv6
- Types 1-127 are errors, 128-255 are informational
- Neighbor Discovery (Types 133-137) is critical for IPv6
- Path MTU Discovery relies on Type 2 (Packet Too Big)
- When in doubt, allow the traffic and monitor for abuse

## Resources

**RFCs:**
- [RFC 4443](https://www.rfc-editor.org/rfc/rfc4443) - ICMPv6 Specification
- [RFC 4861](https://www.rfc-editor.org/rfc/rfc4861) - Neighbor Discovery for IPv6
- [RFC 4890](https://www.rfc-editor.org/rfc/rfc4890) - Recommendations for Filtering ICMPv6
- [RFC 5095](https://www.rfc-editor.org/rfc/rfc5095) - Deprecation of RH0
- [RFC 8106](https://www.rfc-editor.org/rfc/rfc8106) - DNS via Router Advertisement
- [RFC 2710](https://www.rfc-editor.org/rfc/rfc2710) - MLDv1
- [RFC 3810](https://www.rfc-editor.org/rfc/rfc3810) - MLDv2

**MikroTik RouterOS 7:**
- [IPv6 Firewall](https://help.mikrotik.com/docs/spaces/ROS/pages/110166213/IPv6+Firewall)
- [IPv6 Neighbor Discovery](https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery)

**Other:**
- [IANA ICMPv6 Parameters](https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml)
