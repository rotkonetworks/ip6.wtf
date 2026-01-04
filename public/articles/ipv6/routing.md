# IPv6 Routing Protocols and Route Selection

## IPv6 Routing Overview

### Route Types in IPv6
```
Connected Routes (C) → Directly attached networks
Static Routes (S) → Manually configured
Dynamic Routes → Learned via routing protocols
  - OSPFv3 (O)
  - BGP (B)
  - RIPng (R)
  - EIGRP for IPv6 (D)
  - IS-IS for IPv6 (i)
```

## Static Routing

### Basic Static Routes

```mikrotik
# Default route
/ipv6 route
add dst-address=::/0 gateway=2001:db8::1

# Network route via global address
add dst-address=2001:db8:cafe::/48 gateway=2001:db8:abcd::2

# Route via link-local (requires interface)
add dst-address=2001:db8:beef::/48 gateway=fe80::1%ether1

# Blackhole route
add dst-address=2001:db8:dead::/48 type=blackhole

# Route with metric
add dst-address=2001:db8:food::/48 gateway=2001:db8:abcd::3 distance=150
```

### Floating Static Routes
```mikrotik
# Primary route
add dst-address=2001:db8::/32 gateway=2001:db8:1::1 distance=10

# Backup route (higher distance)
add dst-address=2001:db8::/32 gateway=2001:db8:2::1 distance=20

# Check active routes
/ipv6 route print where dst-address="2001:db8::/32" and active
```

## OSPFv3 Configuration

### OSPFv3 vs OSPFv2 Differences

OSPFv3 (RFC 5340) is not just "OSPF for IPv6" - it's a cleaner protocol design. Understanding the differences is key to migration.

**Fundamental Changes:**
```
| Aspect              | OSPFv2                      | OSPFv3                        |
|---------------------|-----------------------------|------------------------------ |
| Runs over           | IPv4 (protocol 89)          | IPv6 (next-header 89)         |
| Neighbor discovery  | Primary interface address   | Link-local addresses only     |
| Network statement   | Required (defines networks) | Not used - enabled per-iface  |
| Router ID           | 32-bit (from IPv4 addr)     | 32-bit (must configure if no IPv4) |
| Authentication      | In protocol (MD5/plaintext) | External via IPsec AH         |
| Address in LSAs     | Embedded in LSA             | Separated (prefix LSAs)       |
| Multiple instances  | One per interface           | Multiple per interface        |
| Address families    | IPv4 only                   | IPv4 + IPv6 (RFC 5838)        |
```

**LSA Type Changes:**
```
OSPFv2 LSA          OSPFv3 LSA              Notes
-----------         ----------              -----
Type 1 (Router)     Type 1 (Router)         No address info, just topology
Type 2 (Network)    Type 2 (Network)        No address info
Type 3 (Summary)    Type 3 (Inter-Area-Prefix)  Prefixes separated
Type 4 (ASBR)       Type 4 (Inter-Area-Router)  Points to ASBR
Type 5 (External)   Type 5 (AS-External)    Same function
-                   Type 8 (Link)           Link-local info, LLA, options
-                   Type 9 (Intra-Area-Prefix)  Prefix info for area
```

**Why Link-Local Adjacencies Matter:**
```
OSPFv2: Neighbor = interface primary IP → routing depends on addressing
OSPFv3: Neighbor = link-local (fe80::) → routing independent of global addresses

Benefits:
- Renumber global addresses without breaking OSPF
- Adjacencies survive prefix changes
- Multiple prefixes per interface don't affect OSPF
- Easier multi-homing within a site
```

**No Network Statement - Enable Per Interface:**
```
OSPFv2 approach:
  router ospf 1
    network 10.0.0.0 0.255.255.255 area 0    ← matches interfaces by IP

OSPFv3 approach:
  interface eth0
    ipv6 ospf 1 area 0                        ← explicit per-interface

Why this is better:
- No wildcard mask confusion
- No accidental interface inclusion
- Clear per-interface configuration
- Matches modern network design
```

### MikroTik OSPFv3 Setup (RouterOS 7)

```mikrotik
# Create OSPFv3 instance (ROS7 uses unified /routing/ospf)
/routing ospf instance
add name=default-v6 version=3 router-id=1.1.1.1

# Configure areas
/routing ospf area
add name=backbone-v6 area-id=0.0.0.0 instance=default-v6
add name=area1-v6 area-id=0.0.0.1 instance=default-v6 type=nssa

# Configure interface templates (ROS7 uses templates, not direct interface config)
/routing ospf interface-template
add area=backbone-v6 interfaces=ether1 type=broadcast
add area=area1-v6 interfaces=ether2 type=ptmp

# Addresses are advertised automatically when interface matches template
/ipv6 address
add address=2001:db8:1::1/64 interface=ether1
add address=2001:db8:2::1/64 interface=ether2
```

### OSPFv3 Network Types
```mikrotik
# Point-to-point (no DR/BDR)
/routing ospf interface-template
add area=backbone-v6 interfaces=ether1 type=ptp

# Broadcast (elects DR/BDR)
add area=backbone-v6 interfaces=ether2 type=broadcast priority=100 cost=10

# Point-to-multipoint
add area=backbone-v6 interfaces=ether3 type=ptmp

# Static neighbor for NBMA-like scenarios
/routing ospf static-neighbor
add address=fe80::2%ether3 instance=default-v6
```

### OSPFv3 Troubleshooting
```mikrotik
# Show neighbors
/routing ospf neighbor print

# Show database
/routing ospf lsa print detail where instance=default-v6

# Show interface status
/routing ospf interface print

# Monitor state changes
/log print where topics~"ospf"

# Enable debug logging
/system logging
add topics=ospf,!raw action=memory
```

## IS-IS for IPv6

### Why IS-IS Migration is Easier Than OSPF

IS-IS was designed for multi-protocol support from the start (originally for CLNP). Adding IPv6 is just enabling another address family - no protocol version change needed.

**IS-IS vs OSPF for IPv6 Transition:**
```
| Aspect                  | OSPF                        | IS-IS                        |
|-------------------------|-----------------------------|------------------------------ |
| IPv6 version            | New protocol (OSPFv3)       | Same protocol, new TLVs      |
| Adjacency changes       | Link-local instead of IP    | No change (uses CLNS)        |
| Authentication          | Moved to IPsec              | Same (in-protocol)           |
| Database migration      | Separate LSDB               | Same LSDB, new TLV types     |
| Dual-stack operation    | Separate instances or AF    | Single instance, both AFs    |
| Learning curve          | Moderate                    | Minimal if you know IS-IS    |
```

**IS-IS Dual-Stack Topology Options:**
```
Single-Topology (Default, Simpler):
- IPv4 and IPv6 share same SPF calculation
- Requires all routers to support both protocols
- Same path for IPv4 and IPv6 traffic
- Enable: address-family ipv6 unicast

Multi-Topology (MT-IS-IS, RFC 5120):
- Separate SPF for IPv4 and IPv6
- Allows partial deployment (some routers IPv4-only)
- Can have different paths per address family
- Enable: address-family ipv6 unicast multi-topology
```

### IS-IS TLVs for IPv6

```
TLV   Name                          Purpose
---   ----                          -------
22    Extended IS Reachability      Neighbor links (already exists)
135   Extended IP Reachability      IPv4 prefixes (already exists)
232   IPv6 Interface Address        Interface IPv6 addresses
236   IPv6 IP Reachability          IPv6 prefix advertisements
237   MT-IS-IS                       Multi-topology support
```

### IS-IS IPv6 Configuration

**Cisco IOS:**
```
router isis CORE
 net 49.0001.0000.0000.0001.00
 is-type level-2-only
 metric-style wide
 !
 address-family ipv6 unicast
  multi-topology
 exit-address-family
!
interface GigabitEthernet0/0
 ipv6 address 2001:db8:1::1/64
 ipv6 router isis CORE
 isis ipv6 metric 10
```

**FRRouting:**
```
router isis CORE
 net 49.0001.0000.0000.0001.00
 is-type level-2-only
 topology ipv6-unicast
!
interface eth0
 ipv6 router isis CORE
```

**Key IS-IS Concepts for IPv6:**
```
- NET (Network Entity Title) stays the same for IPv6
- Adjacencies use CLNS, not IP - work automatically
- Just enable IPv6 address family and interface routing
- Wide metrics recommended (already standard practice)
- Level-1/Level-2 hierarchy unchanged
```

### IS-IS vs OSPFv3 Comparison

```
For IPv6-first deployments, consider:

IS-IS advantages:
- Simpler IPv6 enablement (same protocol)
- Better multi-vendor interop (simpler spec)
- No IPsec dependency for authentication
- Scales better (used by large ISPs)
- Runs on layer 2, survives IP issues

OSPFv3 advantages:
- More widely deployed in enterprise
- More familiar to most network engineers
- Better tooling/monitoring support
- Native IPv6 design (cleaner than IS-IS additions)
- Per-interface configuration clarity

Recommendation:
- New deployments: Consider IS-IS
- Existing OSPF shops: OSPFv3 is fine
- ISP/DC: IS-IS strongly preferred
```

## BGP for IPv6

### MP-BGP: How BGP Handles Multiple Address Families

Unlike OSPF (which needed a new version), BGP was extended via MP-BGP (RFC 4760) to handle IPv6. Understanding AFI/SAFI is essential for IPv6 BGP.

**Address Family Identifier (AFI) and SAFI:**
```
AFI (Address Family Identifier):
  1 = IPv4
  2 = IPv6

SAFI (Subsequent AFI):
  1 = Unicast
  2 = Multicast
  4 = MPLS Labels
  128 = MPLS VPN

Common combinations:
  AFI 1, SAFI 1  = IPv4 Unicast (traditional BGP)
  AFI 2, SAFI 1  = IPv6 Unicast (what you need for IPv6)
  AFI 1, SAFI 128 = VPNv4 (MPLS L3VPN)
  AFI 2, SAFI 128 = VPNv6 (MPLS L3VPN for IPv6)
```

**Session Types for Dual-Stack:**
```
Option 1: Single Session, Multiple AFIs (Recommended)
┌─────────────────────────────────────────────┐
│  BGP Session over IPv4 or IPv6              │
│  ├── AFI 1/SAFI 1: IPv4 Unicast prefixes    │
│  └── AFI 2/SAFI 1: IPv6 Unicast prefixes    │
└─────────────────────────────────────────────┘
Pros: Single session to manage, atomic updates
Cons: Both AFs go down together

Option 2: Separate Sessions per AF
┌──────────────────────────┐  ┌──────────────────────────┐
│ BGP Session over IPv4    │  │ BGP Session over IPv6    │
│ └── IPv4 Unicast only    │  │ └── IPv6 Unicast only    │
└──────────────────────────┘  └──────────────────────────┘
Pros: Independent failure domains
Cons: More sessions, more state, more config
```

**Next-Hop Handling in IPv6 BGP:**
```
eBGP over IPv6:
- Next-hop is the peer's IPv6 address
- Often uses link-local + global (two next-hops in UPDATE)
- Link-local must be reachable for forwarding

iBGP over IPv4 (carrying IPv6 prefixes):
- Next-hop is IPv6 address (even though session is IPv4)
- Requires IPv6 reachability to next-hop
- Common in dual-stack transition

iBGP with IPv4-Mapped Next-Hop:
- Rarely used, mostly legacy
- ::ffff:192.0.2.1 style addressing
- Avoid if possible
```

**Route Distinguishers (for VPNv6):**
```
Same concept as VPNv4:
RD:IPv6-prefix makes globally unique VPNv6 prefix

Example:
  RD 65000:1 + 2001:db8::/32 = unique VPNv6 route

Used in MPLS L3VPN to separate customer IPv6 space
```

### BGP Configuration Types

**1. Dual-Stack BGP Session (Preferred)**
```mikrotik
/routing bgp connection
add name=peer1 remote.address=192.0.2.1 remote.as=65001 \
    local.role=ebgp address-families=ip,ipv6

# Single session carries both IPv4 and IPv6 prefixes
```

**2. IPv6-Only BGP Session**
```mikrotik
/routing bgp connection
add name=peer2-v6 remote.address=2001:db8::1 remote.as=65002 \
    local.role=ebgp address-families=ipv6 \
    local.address=2001:db8::2
```

### Complete BGP IPv6 Setup

```mikrotik
# BGP instance
/routing bgp template
add name=default as=65100 router-id=10.0.0.1

# IPv6 peer configuration
/routing bgp connection
add name=upstream-v6 \
    remote.address=2001:db8:ffff::1 \
    remote.as=65000 \
    local.role=ebgp \
    templates=default \
    address-families=ipv6 \
    multihop=yes \
    ttl=2

# Network advertisement
/routing bgp network
add network=2001:db8:1000::/36 synchronize=no

# Prefix lists for filtering
/routing filter community-list
add name=my-communities list=65100:100,65100:200

/routing filter rule
add chain=bgp-in-v6 \
    rule="if (dst-len > 48) { reject; }"

add chain=bgp-out-v6 \
    rule="if (dst in 2001:db8:1000::/36) { 
        set bgp-communities=65100:100; 
        accept; 
    }"

# Apply filters
/routing bgp connection
set upstream-v6 input.filter=bgp-in-v6 output.filter=bgp-out-v6
```

### BGP Path Selection for IPv6

```
BGP Decision Process (same as IPv4):
1. Highest Weight (Cisco-specific)
2. Highest LOCAL_PREF
3. Locally originated
4. Shortest AS_PATH
5. Lowest ORIGIN (IGP < EGP < Incomplete)
6. Lowest MED
7. eBGP over iBGP
8. Lowest IGP metric to next-hop
9. Oldest route
10. Lowest Router ID
11. Lowest peer IP
```

### BGP Multihoming Example

```mikrotik
# Two upstream providers
/routing bgp connection
add name=isp1-v6 remote.address=2001:db8:isp1::1 remote.as=65001 \
    local.role=ebgp address-families=ipv6

add name=isp2-v6 remote.address=2001:db8:isp2::1 remote.as=65002 \
    local.role=ebgp address-families=ipv6

# Prefer ISP1 for outbound
/routing filter rule
add chain=bgp-in-isp1-v6 \
    rule="set bgp-local-pref=150; accept;"

add chain=bgp-in-isp2-v6 \
    rule="set bgp-local-pref=100; accept;"

# Influence inbound via AS-PATH prepending
add chain=bgp-out-isp2-v6 \
    rule="if (dst in 2001:db8:1000::/36) {
        set bgp-path-prepend=3;
        accept;
    }"
```

## Route Selection and Metrics

### Administrative Distance Defaults
```
Connected:        0
Static:           1
eBGP:            20
OSPF:           110
RIP:            120
iBGP:           200

# View in MikroTik
/ipv6 route print detail
```

### Route Selection Example
```mikrotik
# Multiple routes to same destination
/ipv6 route print where dst-address="2001:db8::/32"
Flags: X - disabled, A - active, D - dynamic,
C - connect, S - static, r - rip, b - bgp, o - ospf
 #  DST-ADDRESS           GATEWAY          DISTANCE
 0  ADb 2001:db8::/32    fe80::1%ether1   20
 1   Db 2001:db8::/32    fe80::2%ether2   20
 2   S  2001:db8::/32    2001:db8:ff::1   150
 3   Do 2001:db8::/32    fe80::3%ether3   110

# Active route: BGP (lowest distance among active)
```

### ECMP (Equal Cost Multi-Path)
```mikrotik
# Enable ECMP for BGP
/routing bgp template
set default multipath=yes

# Multiple equal-cost routes active
/ipv6 route print where dst-address="2001:db8::/32" and active
```

## Route Redistribution

### OSPFv3 to BGP
```mikrotik
/routing filter rule
add chain=ospf-to-bgp \
    rule="if (protocol ospf && dst-len >= 48) { 
        set bgp-med=100; 
        accept; 
    }"

/routing bgp connection
set upstream-v6 output.redistribute=ospf
```

### Static to OSPF
```mikrotik
/routing filter rule
add chain=static-to-ospf \
    rule="if (protocol static) { 
        set ospf-metric=1000; 
        set ospf-type=type-2; 
        accept; 
    }"

/routing ospf instance
set default-v6 redistribute=static out-filter-chain=static-to-ospf
```

## Advanced Routing Features

### IPv6 Policy-Based Routing

```mikrotik
# Mark traffic for different routing tables
/ipv6 firewall mangle
add chain=prerouting src-address=2001:db8:100::/64 \
    action=mark-routing new-routing-mark=table-isp1

add chain=prerouting src-address=2001:db8:200::/64 \
    action=mark-routing new-routing-mark=table-isp2

# Create routing tables
/ipv6 route
add dst-address=::/0 gateway=2001:db8:isp1::1 \
    routing-table=table-isp1
add dst-address=::/0 gateway=2001:db8:isp2::1 \
    routing-table=table-isp2
```

### Route Aggregation
```mikrotik
# Aggregate multiple /48s into /32
/ipv6 route
add dst-address=2001:db8::/32 type=blackhole

/routing filter rule
add chain=bgp-out \
    rule="if (dst in 2001:db8::/32 && dst-len == 32) { 
        accept; 
    }"
add chain=bgp-out \
    rule="if (dst in 2001:db8::/32 && dst-len > 32) { 
        reject; 
    }"
```

### BFD for Fast Convergence
```mikrotik
# Enable BFD for OSPF
/routing bfd configuration
add disabled=no interfaces=all min-rx=100ms min-tx=100ms

/routing ospf interface-template
set [find] use-bfd=yes

# Enable BFD for BGP
/routing bgp connection
set upstream-v6 use-bfd=yes
```

## Troubleshooting IPv6 Routing

### Common Commands
```mikrotik
# Show routing table
/ipv6 route print detail

# Show specific route
/ipv6 route print where dst-address="2001:db8::/32"

# Trace route path
/tool traceroute 2001:db8:remote::1

# Check next-hop reachability
/ipv6 neighbor print
/ping 2001:db8:next::hop count=3

# Monitor routing changes
/log print where topics~"route"
```

### Route Debugging
```mikrotik
# Enable route debugging
/system logging
add topics=route,bgp,ospf action=memory

# BGP-specific debugging
/routing bgp connection
set upstream-v6 output.log=yes input.log=yes

# OSPF-specific debugging
/routing ospf instance
set default-v6 log-adjacency-changes=yes
```

## Best Practices

### General Routing
- Use link-local next-hops where possible
- Implement prefix filtering (max /48 for global)
- Configure BFD for faster convergence
- Use route aggregation to reduce table size
- Document routing policy

### BGP Specific
- Filter long prefixes (>48 bits)
- Use prefix-lists, not access-lists
- Implement max-prefix limits
- Configure route dampening carefully
- Always filter customer routes

### OSPF Specific
- Use areas to reduce flooding
- Configure stub areas where appropriate
- Set reference bandwidth for cost calculation
- Use authentication (IPsec for OSPFv3)
- Minimize type-5 LSAs

**Key Points:**
- IPv6 routing protocols similar to IPv4 versions
- Link-local addresses commonly used as next-hops
- Route selection follows same preference rules
- Proper filtering critical for Internet routing
- Monitor and tune for optimal convergence
- Plan for growth and redundancy
