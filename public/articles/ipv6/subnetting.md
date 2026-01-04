# IPv6 Subnetting and Prefix Delegation

## IPv6 Address Structure Review

### Standard Allocation Hierarchy
```
/32 → ISP allocation from RIR
/48 → Customer site assignment
/56 → Alternative for residential
/64 → Single subnet (LAN)
/128 → Host address

Example breakdown:
2001:db8:1234:5678::/64
└──┘ └─┘ └──┘ └──┘
 Global  Site  Subnet  Interface ID (64 bits)
 Prefix  (/48) (/64)
```

## Subnetting Fundamentals

### Why /64 for LANs?
```
- SLAAC requires exactly 64 bits for Interface ID
- EUI-64 addressing expects 64-bit host portion
- Privacy extensions assume 64-bit space
- Neighbor Discovery optimized for /64
```

### Planning a /48 Allocation
```
2001:db8:abcd::/48 provides:
- 65,536 possible /64 subnets (2^16)
- Subnet bits: 48 to 64 (16 bits)

Subnet examples:
2001:db8:abcd:0000::/64 → First subnet
2001:db8:abcd:0001::/64 → Second subnet
2001:db8:abcd:ffff::/64 → Last subnet
```

### Hierarchical Design Example
```
2001:db8:abcd::/48 (Company allocation)
    │
    ├── 2001:db8:abcd:0000::/52 (Building A - 4096 subnets)
    │   ├── 2001:db8:abcd:0000::/64 (Floor 1 VLAN 10)
    │   ├── 2001:db8:abcd:0001::/64 (Floor 1 VLAN 20)
    │   └── 2001:db8:abcd:000f::/64 (Floor 1 VLAN 160)
    │
    ├── 2001:db8:abcd:1000::/52 (Building B - 4096 subnets)
    │
    └── 2001:db8:abcd:f000::/52 (Reserved/Future)
```

## Subnet Calculation Methods

### Binary Method
```
Base prefix: 2001:db8:abcd::/48
Need: 8 subnets (requires 3 bits)

Binary:
0000 = 2001:db8:abcd:0000::/64
0001 = 2001:db8:abcd:0001::/64
0010 = 2001:db8:abcd:0002::/64
...
0111 = 2001:db8:abcd:0007::/64
```

### Nibble-Aligned Method (Recommended)
```
Work on 4-bit boundaries for readability:

/48 to /52 = 1 hex digit (16 subnets)
/48 to /56 = 2 hex digits (256 subnets)  
/48 to /60 = 3 hex digits (4,096 subnets)

Example:
2001:db8:abcd:XY00::/56
Where X and Y are variable hex digits
```

## DHCPv6 Prefix Delegation (PD)

### How DHCPv6-PD Works
```
ISP Router (Delegating Router)          Customer Router (Requesting Router)
    │                                              │
    │←────────── DHCPv6 Solicit ──────────────────│
    │            (IA_PD option)                    │
    │                                              │
    │─────────── DHCPv6 Advertise ────────────────→│
    │         (Available prefix)                   │
    │                                              │
    │←────────── DHCPv6 Request ──────────────────│
    │         (Request specific prefix)            │
    │                                              │
    │─────────── DHCPv6 Reply ────────────────────→│
    │         (Delegated: 2001:db8:1234::/56)     │
    │                                              │
    └──────────────────────────────────────────────┘
```

### DHCPv6-PD Message Flow
```
1. CPE sends Solicit with IA_PD
2. ISP sends Advertise with available prefix
3. CPE sends Request for prefix
4. ISP sends Reply with delegated prefix
5. CPE subdivides prefix for local networks
```

## Practical Configuration

### MikroTik as DHCPv6-PD Client

```mikrotik
# Configure DHCPv6 client to request prefix
/ipv6 dhcp-client
add interface=ether1-wan request=prefix pool-name=isp-pool \
    add-default-route=yes use-peer-dns=yes

# View received prefix
/ipv6 dhcp-client print detail

# Automatically assign /64s from pool
/ipv6 address
add interface=bridge-lan from-pool=isp-pool
add interface=guest-vlan from-pool=isp-pool
add interface=iot-vlan from-pool=isp-pool
```

### MikroTik as DHCPv6-PD Server

```mikrotik
# Configure prefix pool for delegation
/ipv6 pool
add name=customer-pd prefix=2001:db8::/32 prefix-length=56

# Configure DHCPv6 server
/ipv6 dhcp-server
add name=pd-server interface=ether2-customers \
    address-pool=static-only

# Create binding for specific customer
/ipv6 dhcp-server binding
add address=2001:db8:abcd::/56 duid="00:03:00:01:aa:bb:cc:dd:ee:ff" \
    server=pd-server
```

### Linux DHCPv6-PD Configuration

**ISC DHCP Client (dhclient):**
```bash
# /etc/dhcp/dhclient6.conf
interface "eth0" {
    send ia-pd 0;
}

id-assoc pd 0 {
    prefix-interface eth1 {
        sla-id 0;
        sla-len 8;  # /56 to /64
    };
    prefix-interface eth2 {
        sla-id 1;
        sla-len 8;
    };
};
```

**systemd-networkd:**
```ini
# /etc/systemd/network/wan.network
[Network]
DHCP=yes
IPv6AcceptRA=yes

[DHCPv6]
PrefixDelegationHint=::/56

# /etc/systemd/network/lan.network
[Network]
IPv6SendRA=yes
DHCPv6PrefixDelegation=yes

[DHCPv6PrefixDelegation]
SubnetId=0x01
Token=::1
```

## Subnet Planning Best Practices

### Enterprise Allocation Strategy
```
2001:db8::/32 (ISP Block)
    │
    ├── 2001:db8:0000::/36 (Region 1)
    │   ├── 2001:db8:0000::/40 (Country A)
    │   │   ├── 2001:db8:0000::/44 (City 1)
    │   │   │   └── 2001:db8:0000::/48 (Site 1)
    │   │   └── 2001:db8:0010::/44 (City 2)
    │   └── 2001:db8:0100::/40 (Country B)
    │
    └── 2001:db8:1000::/36 (Region 2)
```

### Residential Planning with /56
```
2001:db8:abcd::/56 from ISP
    │
    ├── 2001:db8:abcd:00::/64 - Main LAN
    ├── 2001:db8:abcd:01::/64 - Guest Network
    ├── 2001:db8:abcd:02::/64 - IoT Devices
    ├── 2001:db8:abcd:03::/64 - Home Office
    └── 2001:db8:abcd:ff::/64 - Management
```

### VLAN-Based Subnetting
```
Pattern: 2001:db8:abcd:VVVV::/64
Where VVVV = VLAN ID in hex

VLAN 10  → 2001:db8:abcd:000a::/64
VLAN 20  → 2001:db8:abcd:0014::/64
VLAN 100 → 2001:db8:abcd:0064::/64
VLAN 200 → 2001:db8:abcd:00c8::/64
```

## Advanced DHCPv6-PD Features

### Prefix Stability and Hints
```mikrotik
# Request specific prefix (hint)
/ipv6 dhcp-client
add interface=ether1 request=prefix \
    prefix-hint=2001:db8:1234::/56

# Server honors hints when possible
/ipv6 dhcp-server binding
add address=2001:db8:1234::/56 \
    duid="00:03:00:01:aa:bb:cc:dd:ee:ff" \
    prefer-lifetime=1w life-time=4w
```

### Cascaded Prefix Delegation
```
ISP → Customer CPE → Internal Routers

ISP delegates /48 → CPE
CPE delegates /56 → Dept Router A  
CPE delegates /56 → Dept Router B

Configuration:
/ipv6 pool
add name=downstream prefix-from-pool=isp-pool \
    prefix-length=56
```

### Dynamic Prefix Handling
```mikrotik
# Script to handle prefix changes
/system script
add name=prefix-change source={
    :local newPrefix [/ipv6 dhcp-client get 0 prefix]
    :if ($newPrefix != $oldPrefix) do={
        # Update DNS records
        # Update firewall rules
        # Notify monitoring system
    }
}

# Trigger on prefix change
/ipv6 dhcp-client
set 0 script=prefix-change
```

## Troubleshooting

### Common Subnetting Mistakes

**Wrong subnet size:**
```bash
# Check actual prefix length
ip -6 addr show | grep "scope global"

# Verify SLAAC is working
rdisc6 -1 eth0 | grep "Prefix"
```

**Overlapping subnets:**
```mikrotik
# Audit configuration
/ipv6 address print
/ipv6 route print where dst-address~"2001:db8"
```

### DHCPv6-PD Issues

**No prefix received:**
```bash
# Enable DHCPv6 debugging
dhclient -6 -d -v eth0

# Check tcpdump
tcpdump -i eth0 -n port 546 or port 547
```

**Prefix not subdivided:**
```mikrotik
# Check pool status
/ipv6 pool print detail
/ipv6 pool used print

# Verify address assignment
/ipv6 address print where from-pool!=none
```

## Security Considerations

### Prefix Delegation Security
```mikrotik
# Secure DHCPv6-PD server
/ipv6 firewall filter
add chain=input protocol=udp dst-port=547 \
    src-address=fe80::/10 action=accept \
    comment="DHCPv6 from link-local only"

# Rate limit DHCPv6
add chain=input protocol=udp dst-port=547 \
    limit=10,5:packet action=accept
add chain=input protocol=udp dst-port=547 \
    action=drop

# Validate DUID bindings
/ipv6 dhcp-server
set 0 authoritative=yes address-pool=static-only
```

### Subnet Isolation
```mikrotik
# Prevent inter-subnet routing
/ipv6 firewall filter
add chain=forward src-address=2001:db8:abcd:1::/64 \
    dst-address=2001:db8:abcd:2::/64 \
    action=drop comment="Isolate VLAN1 from VLAN2"
```

## Best Practices Summary

### DO:
- Use nibble boundaries (/48, /52, /56, /60, /64)
- Plan for growth (sparse allocation)
- Document allocation scheme
- Use /64 for all end-user LANs
- Implement prefix stability for DHCPv6-PD
- Monitor prefix utilization

### DON'T:
- Use prefixes longer than /64 for SLAAC
- Assign sequentially (use sparse allocation)
- Forget reverse DNS delegation
- Mix allocation sizes unnecessarily
- Hardcode prefixes in applications

**Key Points:**
- IPv6 makes subnetting simpler (no variable masks)
- Always use /64 for host subnets
- DHCPv6-PD automates prefix distribution
- Plan hierarchically for scalability
- Nibble-aligned boundaries improve readability
- Prefix delegation enables dynamic networks

## Resources

**RFCs:**
- [RFC 6177](https://www.rfc-editor.org/rfc/rfc6177) - IPv6 Address Assignment to End Sites
- [RFC 3633](https://www.rfc-editor.org/rfc/rfc3633) - DHCPv6 Prefix Delegation
- [RFC 8415](https://www.rfc-editor.org/rfc/rfc8415) - DHCPv6 (consolidated)
- [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291) - IPv6 Addressing Architecture
- [RFC 6164](https://www.rfc-editor.org/rfc/rfc6164) - /127 for Point-to-Point Links

**MikroTik RouterOS 7:**
- [DHCPv6 Client](https://help.mikrotik.com/docs/spaces/ROS/pages/328155/DHCPv6+Client)
- [DHCPv6 Server](https://help.mikrotik.com/docs/spaces/ROS/pages/328161/DHCPv6+Server)
- [IPv6 Pool](https://help.mikrotik.com/docs/spaces/ROS/pages/328135/IPv6+Pool)

**Tools:**
- [RIPE IPv6 Address Planner](https://www.ripe.net/analyse/ip-address-analysis)
- [sipcalc](https://github.com/sii/sipcalc) - IPv6 subnet calculator
