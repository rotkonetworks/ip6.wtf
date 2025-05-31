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
```
- Runs directly over IPv6
- Router ID still 32-bit (usually IPv4 format)
- Link-local addresses for neighbor adjacencies
- Multiple instances per interface
- Authentication via IPsec
```

### MikroTik OSPFv3 Setup

```mikrotik
# Create OSPFv3 instance
/routing ospf-v3 instance
add name=default router-id=1.1.1.1

# Configure areas
/routing ospf-v3 area
add name=backbone area-id=0.0.0.0 instance=default
add name=area1 area-id=0.0.0.1 instance=default type=nssa

# Configure interfaces
/routing ospf-v3 interface
add area=backbone interface=ether1 network-type=broadcast
add area=area1 interface=ether2 network-type=point-to-point

# Advertise networks
/ipv6 address
add address=2001:db8:1::1/64 interface=ether1 advertise=yes
add address=2001:db8:2::1/64 interface=ether2 advertise=yes

# Redistribution
/routing ospf-v3 instance
set default redistribute-connected=as-type-1 \
    redistribute-static=as-type-2
```

### OSPFv3 Network Types
```mikrotik
# Point-to-point (no DR/BDR)
/routing ospf-v3 interface
add area=backbone interface=ether1 network-type=point-to-point

# Broadcast (elects DR/BDR)
add area=backbone interface=ether2 network-type=broadcast \
    priority=100 cost=10

# NBMA (manual neighbors)
add area=backbone interface=ether3 network-type=nbma

/routing ospf-v3 neighbor
add address=fe80::2%ether3 poll-interval=30s

# Point-to-multipoint
add area=backbone interface=ether4 network-type=point-to-multipoint
```

### OSPFv3 Troubleshooting
```mikrotik
# Show neighbors
/routing ospf-v3 neighbor print

# Show database
/routing ospf-v3 lsa print detail

# Monitor state changes
/log print where topics~"ospf"

# Debug OSPFv3
/system logging
add topics=ospf,!raw action=memory
```

## BGP for IPv6

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

/routing ospf-v3 instance
set default redistribute-static=yes out-filter=static-to-ospf
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

/routing ospf-v3 interface
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
/routing ospf-v3 instance
set default log-adjacency-changes=yes
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
