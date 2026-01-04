# IPv6 Neighbor Discovery Protocol (NDP)

## Overview

NDP replaces ARP and provides additional functionality for IPv6 networks. It uses ICMPv6 messages (types 133-137) and operates over link-local scope.

### Key Functions
```
1. Address Resolution (like ARP)
2. Router Discovery
3. Prefix Discovery
4. Parameter Discovery
5. Next-hop Determination
6. Neighbor Unreachability Detection (NUD)
7. Duplicate Address Detection (DAD)
8. Redirect
```

## NDP Message Types

### Router Solicitation (RS) - Type 133
```
Purpose: Host requests router information
Source: Host's link-local or ::
Destination: ff02::2 (all-routers)
When: Boot up, interface up

Message Format:
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=133  |     Code=0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            Reserved                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Source Link-Layer Address (if not from ::)        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Router Advertisement (RA) - Type 134
```
Purpose: Router announces presence and configuration
Source: Router's link-local
Destination: ff02::1 (all-nodes) or unicast response
When: Periodically or responding to RS

Message Format:
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=134  |     Code=0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Cur Hop Limit |M|O|H|Prf|Resvd|       Router Lifetime         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Reachable Time                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Retrans Timer                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Prefix Info, MTU, Source Link-Layer Address        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Flags:
M = Managed address configuration (DHCPv6 for address)
O = Other configuration (DHCPv6 for DNS, etc.)
H = Home Agent (Mobile IPv6)
Prf = Default Router Preference
```

### Neighbor Solicitation (NS) - Type 135
```
Purpose: Address resolution, DAD, NUD
Source: Interface address or :: (for DAD)
Destination: Solicited-node multicast or unicast
When: Need MAC address, verify reachability

Message Format:
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=135  |     Code=0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       Target Address                          +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Source Link-Layer Address (not for DAD)           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Neighbor Advertisement (NA) - Type 136
```
Purpose: Response to NS, announce address change
Source: Interface address
Destination: Solicited source or ff02::1
When: Responding to NS, proactive update

Message Format:
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=136  |     Code=0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|R|S|O|                     Reserved                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       Target Address                          +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Options: Target Link-Layer Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Flags:
R = Router flag
S = Solicited flag
O = Override flag
```

### Redirect - Type 137
```
Purpose: Inform host of better next-hop
Source: Router's link-local
Destination: Source of packet being redirected
When: Suboptimal routing detected

Includes:
- Target Address (better next-hop)
- Destination Address (ultimate destination)
```

## NDP Operations

### Address Resolution (Replacing ARP)

```
Host A (2001:db8::1) wants to reach Host B (2001:db8::2)

1. Host A → ff02::1:ff00:2: NS
   Target: 2001:db8::2
   Source: 2001:db8::1
   Option: Source Link-Layer Address

2. Host B → 2001:db8::1: NA
   Target: 2001:db8::2
   Flags: S=1, O=1
   Option: Target Link-Layer Address

3. Host A caches the mapping
```

### Duplicate Address Detection (DAD)

```
1. Address in tentative state
2. Host → ff02::1:ff00:X: NS
   Source: ::
   Target: Tentative address
   No options

3. Wait (default 1 second)
4. If no NA received → Address unique
5. If NA received → DAD failed
```

### Neighbor Unreachability Detection (NUD)

```
States: REACHABLE → STALE → DELAY → PROBE → UNREACHABLE

1. Entry becomes STALE after timeout
2. When sending, enter DELAY (5 seconds)
3. If no confirmation, enter PROBE
4. Send unicast NS (3 attempts)
5. If no response → UNREACHABLE
```

### Router Discovery Process

```
1. Host → ff02::2: RS
2. Router → ff02::1: RA
   - Prefix information
   - Router lifetime
   - Flags (M/O)
   - Options (MTU, DNS)
3. Host configures addresses
4. Host adds default route
```

## Solicited-Node Multicast

### Address Format
```
ff02::1:ff00:0/104 + last 24 bits of IPv6 address

Example:
IPv6: 2001:db8::abc:def1
Solicited-node: ff02::1:ffbc:def1
```

### Purpose
- Efficient address resolution
- Replaces broadcast in ARP
- Only interested nodes process

## NDP Options

### Common Option Types
```
Type 1: Source Link-Layer Address
Type 2: Target Link-Layer Address
Type 3: Prefix Information
Type 5: MTU
Type 25: Recursive DNS Server
Type 31: DNS Search List
```

### Prefix Information Option
```
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=3    |    Length=4   | Prefix Length |L|A| Reserved1 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Valid Lifetime                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Preferred Lifetime                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Reserved2                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                            Prefix                             +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

L = On-link flag
A = Autonomous address-configuration flag
```

## Practical Examples

### Linux NDP Commands

```bash
# Show neighbor cache
ip -6 neigh show

# Show router list
ip -6 route show | grep default

# Send RS manually
rdisc6 eth0

# Send NS manually
ndisc6 2001:db8::1 eth0

# Monitor NDP traffic
tcpdump -i eth0 -n icmp6 and \
  '(ip6[40] == 133 or ip6[40] == 134 or ip6[40] == 135 or ip6[40] == 136)'
```

### MikroTik NDP Configuration

```mikrotik
# View NDP status
/ipv6 neighbor print
/ipv6 route print where gateway-type=link

# Configure RA parameters
/ipv6 nd
set [ find interface=ether1 ] \
  advertise-dns=yes \
  advertise-mac-address=yes \
  managed-address-configuration=no \
  other-configuration=yes \
  ra-interval=30s-1m \
  ra-lifetime=30m

# Configure prefix advertisement
/ipv6 nd prefix
add interface=ether1 prefix=2001:db8::/64 \
  autonomous=yes \
  on-link=yes \
  preferred-lifetime=1w \
  valid-lifetime=4w
```

## Security Considerations

### NDP Vulnerabilities

**Attack vectors:**
- Rogue Router Advertisements
- NS/NA spoofing
- DAD denial of service
- Redirect attacks
- NDP exhaustion

### MikroTik NDP Security

```mikrotik
# RA Guard
/ipv6 firewall filter
add chain=input in-interface=ether2 \
  protocol=icmpv6 icmp-options=134:0 \
  action=drop comment="Block RA on client ports"

# Protect against NDP exhaustion
/ipv6 settings
set max-neighbor-entries=2048

# Strict source validation
/ipv6 firewall raw
add chain=prerouting in-interface=ether2 \
  src-address=!fe80::/10 protocol=icmpv6 \
  icmp-options=133:0-137:0 action=drop \
  comment="NDP must use link-local"

# Hop limit validation
add chain=prerouting protocol=icmpv6 \
  icmp-options=133:0-137:0 hop-limit=not-equal:255 \
  action=drop comment="NDP requires hop limit 255"
```

## NDP vs ARP Comparison

| Feature | ARP (IPv4) | NDP (IPv6) |
|---------|------------|------------|
| Protocol | Separate | ICMPv6 |
| Broadcast | Yes | No (multicast) |
| Router Discovery | No | Yes |
| Address Autoconfiguration | No | Yes |
| Neighbor Unreachability | No | Yes |
| Redirect | ICMP | Integrated |
| Security | Limited | SEND capable |

## Troubleshooting NDP

### Common Issues

**No Router Advertisements:**
```bash
# Check RA receipt
rdisc6 -1 eth0

# Verify IPv6 forwarding on router
sysctl net.ipv6.conf.all.forwarding
```

**Address Resolution Failures:**
```bash
# Clear neighbor cache
ip -6 neigh flush dev eth0

# Check multicast membership
ip -6 maddr show dev eth0
```

**DAD Failures:**
```bash
# Check for conflicts
journalctl -u NetworkManager | grep "DAD"

# Disable DAD (testing only)
sysctl -w net.ipv6.conf.eth0.dad_transmits=0
```

**Key Points:**
- NDP is essential for IPv6 operation
- Uses link-local addresses for all messages
- Hop limit must be 255 (security)
- Replaces multiple IPv4 protocols
- Vulnerable without proper filtering
- Multicast-based efficiency

## Resources

**RFCs:**
- [RFC 4861](https://www.rfc-editor.org/rfc/rfc4861) - Neighbor Discovery for IPv6
- [RFC 4862](https://www.rfc-editor.org/rfc/rfc4862) - SLAAC
- [RFC 3971](https://www.rfc-editor.org/rfc/rfc3971) - SEND (Secure Neighbor Discovery)
- [RFC 6106](https://www.rfc-editor.org/rfc/rfc6106) - DNS Configuration via RA (obsoleted by RFC 8106)
- [RFC 8106](https://www.rfc-editor.org/rfc/rfc8106) - DNS Configuration via RA

**MikroTik RouterOS 7:**
- [IPv6 Neighbor Discovery](https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery)
- [IPv6 Address Configuration](https://help.mikrotik.com/docs/spaces/ROS/pages/328129/IPv6+Address)

**Tools:**
- `ndisc6` - Manual neighbor discovery
- `rdisc6` - Router discovery tool
- `tcpdump -i eth0 icmp6` - Monitor NDP traffic
