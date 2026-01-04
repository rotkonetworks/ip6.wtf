# IPv6 Protocol

## Basic IPv6 Header Structure

### Fixed Header Format (40 bytes)
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |           Flow Label                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Payload Length        |  Next Header  |   Hop Limit   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                         Source Address                        +
|                                                               |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                                                               +
|                                                               |
+                      Destination Address                      +
|                                                               |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Header Fields Explained

**Version (4 bits)**
```
Value: 6 (0110 in binary)
Purpose: Identifies IPv6 packets
```

**Traffic Class (8 bits)**
```
Bits 0-5: DSCP (Differentiated Services Code Point)
Bits 6-7: ECN (Explicit Congestion Notification)
Purpose: QoS and congestion control
```

**Flow Label (20 bits)**
```
Range: 0x00000 to 0xFFFFF
Purpose: Identifies flows for QoS handling
Usage: Same value for all packets in a flow
```

**Payload Length (16 bits)**
```
Range: 0-65,535 bytes
Includes: Extension headers + data
Note: Jumbograms use Hop-by-Hop extension
```

**Next Header (8 bits)**
```
Common values:
0: Hop-by-Hop Options
6: TCP
17: UDP
43: Routing Header
44: Fragment Header
50: ESP (IPsec)
51: AH (IPsec)
58: ICMPv6
59: No Next Header
60: Destination Options
```

**Hop Limit (8 bits)**
```
Range: 0-255
Purpose: Prevents routing loops (like IPv4 TTL)
Decremented: By 1 at each hop
```

**Source/Destination Address (128 bits each)**
```
Format: 8 groups of 4 hex digits
Example: 2001:0db8:0000:0000:0000:0000:0000:0001
Compressed: 2001:db8::1
```

## IPv6 Extension Headers

### Extension Header Chain
```
IPv6 Header → Extension Header 1 → Extension Header 2 → Upper Layer
     ↓                    ↓                    ↓
Next Header = 43    Next Header = 44    Next Header = 6 (TCP)
```

### Hop-by-Hop Options Header (Type 0)
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Hdr Ext Len  |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                                                               |
.                            Options                            .
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Common Options:
- Pad1 (Type 0): 1-byte padding
- PadN (Type 1): N-byte padding
- Router Alert (Type 5): MLD, RSVP
- Jumbo Payload (Type 194): Packets > 65,535 bytes
```

### Routing Header (Type 43)
```
Types:
- Type 0: Source routing (deprecated - security risk)
- Type 2: Mobile IPv6
- Type 3: RPL (IoT routing)
- Type 4: Segment Routing (SRv6)
```

### Fragment Header (Type 44)
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |   Reserved    |      Fragment Offset    |Res|M|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Identification                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

M flag: More fragments (1) or last fragment (0)
Offset: In 8-byte units
ID: Same for all fragments of a packet
```

### Destination Options Header (Type 60)
```
Purpose: Options for destination only
Format: Same as Hop-by-Hop
Common use: Mobile IPv6 Home Address
```

### Authentication Header (Type 51)
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |  Payload Len  |          RESERVED             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 Security Parameters Index (SPI)               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Sequence Number Field                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                Integrity Check Value (ICV)                    +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### ESP Header (Type 50)
```
Encrypts payload and optionally authenticates
Used for IPsec VPNs
```

## IPv6 Address Types and Formats

### Address Categories

**Unicast Addresses**
```
Global Unicast: 2000::/3 (2000:: to 3fff::)
Unique Local: fc00::/7 (fc00:: to fdff::)
Link-Local: fe80::/10
Loopback: ::1/128
Unspecified: ::/128
IPv4-mapped: ::ffff:0:0/96
```

**Multicast Addresses**
```
Format: ff00::/8
Flags (4 bits) + Scope (4 bits) + Group ID (112 bits)

Common Scopes:
ff01:: - Interface-local
ff02:: - Link-local
ff05:: - Site-local
ff0e:: - Global

Well-known:
ff02::1 - All nodes
ff02::2 - All routers
ff02::5 - OSPF routers
ff02::6 - OSPF DRs
ff02::1:2 - DHCP agents
ff02::1:ff00:0/104 - Solicited-node
```

**Anycast Addresses**
```
No special format - any unicast can be anycast
Common: Subnet-Router anycast (all zeros host part)
```

## Practical Examples

### 1. Viewing IPv6 Headers with tcpdump:
```bash
# Show IPv6 headers
tcpdump -i eth0 -n -vv ip6

# Show specific next header
tcpdump -i eth0 'ip6[6] == 58'  # ICMPv6
tcpdump -i eth0 'ip6[6] == 6'   # TCP
tcpdump -i eth0 'ip6[6] == 17'  # UDP

# Show IPv6 with extension headers
tcpdump -i eth0 'ip6[6] == 44'  # Fragment header
```

### 2. Common Wireshark Filters:
```
ipv6.version == 6
ipv6.tclass == 0x00           # Traffic class
ipv6.flow == 0x12345          # Flow label
ipv6.nxt == 58                # Next header ICMPv6
ipv6.hlim < 255               # Hop limit
ipv6.src == 2001:db8::1       # Source address
ipv6.dst == ff02::1           # Destination address
```

### 3. Linux IPv6 Commands:
```bash
# Show IPv6 addresses
ip -6 addr show

# Show IPv6 routes
ip -6 route show

# Show IPv6 neighbors
ip -6 neigh show

# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1
```

## Security Considerations

### MikroTik IPv6 Header Filtering (RouterOS 7):
```mikrotik
/ipv6 firewall raw

# Drop packets with routing header (RH0 deprecated, others rare)
add chain=prerouting ipv6-header=route action=drop comment="Drop routing headers"

# Drop fragments to critical services (TCP only needs protocol match)
add chain=prerouting protocol=tcp ipv6-header=frag dst-port=22,179,443 action=drop

# Drop tiny fragments (potential attack vector)
add chain=prerouting ipv6-header=frag fragment-offset=1-7 action=drop comment="Tiny fragments"

# Drop packets about to expire (potential loop)
add chain=prerouting hop-limit=less-than:2 action=drop comment="Near-expired packets"
```

### Extension Header Order:
```
Recommended order (RFC 8200):
1. Hop-by-Hop Options
2. Destination Options (for routing header)
3. Routing Header
4. Fragment Header
5. Authentication Header
6. ESP Header
7. Destination Options (for final destination)
8. Upper-layer header

Each header should appear at most once (except Destination Options)
```

**Key Points:**
- IPv6 header is simpler than IPv4 (no checksum, fixed size)
- Extension headers provide flexibility
- Always process headers in order
- Some extension headers have security implications
- Fragmentation only by source (no router fragmentation)
- Minimum MTU is 1280 bytes (vs 68 for IPv4)

## Resources

**RFCs:**
- [RFC 8200](https://www.rfc-editor.org/rfc/rfc8200) - IPv6 Specification (obsoletes RFC 2460)
- [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291) - IPv6 Addressing Architecture
- [RFC 5095](https://www.rfc-editor.org/rfc/rfc5095) - Deprecation of RH0
- [RFC 7045](https://www.rfc-editor.org/rfc/rfc7045) - Extension Header Transmission/Processing
- [RFC 8504](https://www.rfc-editor.org/rfc/rfc8504) - IPv6 Node Requirements

**MikroTik RouterOS 7:**
- [IPv6 Overview](https://help.mikrotik.com/docs/spaces/ROS/pages/328107/IPv6)
- [IPv6 Firewall](https://help.mikrotik.com/docs/spaces/ROS/pages/110166213/IPv6+Firewall)

**Other:**
- [IANA IPv6 Special-Purpose Registry](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml)
- [IANA Protocol Numbers](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml)
