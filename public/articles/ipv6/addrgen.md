# IPv6 Address Generation

## Overview of IPv6 Address Types

### Address Hierarchy
```
Link-Local (fe80::/10) → Always first, mandatory
     ↓
Global/ULA → Generated after link-local
     ↓
Temporary/Privacy → Optional privacy addresses
```

## Link-Local Address Generation

### EUI-64 Method (Traditional)

**Step 1: Start with MAC address**
```
MAC: 00:50:56:ab:cd:ef
```

**Step 2: Insert FFFE in the middle**
```
00:50:56:FF:FE:ab:cd:ef
```

**Step 3: Flip the 7th bit (U/L bit)**
```
00 = 00000000 → 00000010 = 02
Result: 02:50:56:FF:FE:ab:cd:ef
```

**Step 4: Add link-local prefix**
```
fe80::0250:56ff:feab:cdef/64
```

### Stable Privacy Addresses (RFC 8064)

**Modern method using hash function:**
```
Interface_ID = Hash(Prefix, Net_Iface, Network_ID, Secret_Key)

Where:
- Prefix = fe80::/64
- Net_Iface = Interface index
- Network_ID = Interface name/type
- Secret_Key = Random value

Result: fe80::8b0a:55e1:7dd0:d5be/64
```

## Global Address Generation

### Stateless Address Autoconfiguration (SLAAC)

**Step 1: Router Advertisement provides prefix**
```
Router Advertisement contains:
- Prefix: 2001:db8:abc::/64
- Valid Lifetime: 2592000 seconds (30 days)
- Preferred Lifetime: 604800 seconds (7 days)
- A-flag: 1 (use for SLAAC)
- L-flag: 1 (on-link)
```

**Step 2: Host combines prefix with Interface ID**

Method 1 - EUI-64:
```
Prefix:        2001:db8:abc::/64
Interface ID:  0250:56ff:feab:cdef
Result:        2001:db8:abc::250:56ff:feab:cdef/64
```

Method 2 - Stable Privacy:
```
Prefix:        2001:db8:abc::/64  
Interface ID:  c3b:84cd:dc09:6d91
Result:        2001:db8:abc:0:c3b:84cd:dc09:6d91/64
```

### Privacy/Temporary Addresses (RFC 4941)

**Generate random Interface ID:**
```
1. Generate random 64-bit value
2. Set universal/local bit to 0 (local)
3. Ensure not duplicate on link

Example: 2001:db8:abc:0:c8f9:5d72:3289:fee5/64

Properties:
- Valid lifetime: From RA
- Preferred lifetime: Shorter (typically 1 day)
- Regenerated before expiry
```

## Complete Address Generation Process

### 1. Interface Initialization
```
Interface comes up
     ↓
Generate link-local address
     ↓
Perform DAD on link-local
     ↓
Join multicast groups:
- ff02::1 (all-nodes)
- ff02::1:ffXX:XXXX (solicited-node)
```

### 2. Router Discovery
```
Send Router Solicitation to ff02::2
     ↓
Receive Router Advertisement
     ↓
Process prefix information
```

### 3. Global Address Configuration
```
For each prefix with A-flag:
     ↓
Generate Interface ID (EUI-64/Privacy/Stable)
     ↓
Combine with prefix
     ↓
Perform DAD
     ↓
Configure address if DAD succeeds
```

### 4. Address States
```
Tentative → During DAD
     ↓
Valid/Preferred → Normal use
     ↓
Valid/Deprecated → Preferred lifetime expired
     ↓
Invalid → Valid lifetime expired
```

## Duplicate Address Detection (DAD)

### DAD Process
```
1. Set address as tentative
2. Join solicited-node multicast
3. Send NS with:
   - Source: ::
   - Destination: ff02::1:ffXX:XXXX
   - Target: Tentative address
4. Wait for response (default 1 second)
5. If no NA received → Address is unique
6. If NA received → DAD failed
```

### DAD Example Packet Flow
```
Host → ff02::1:ff09:6d91: NS for 2001:db8:abc:0:c3b:84cd:dc09:6d91
(No response)
Host configures: 2001:db8:abc:0:c3b:84cd:dc09:6d91/64
```

## Practical Examples

### Linux Address Configuration

**View address generation methods:**
```bash
# Check current settings
sysctl net.ipv6.conf.eth0.addr_gen_mode
# 0 = EUI-64
# 1 = Stable privacy
# 2 = Random

# Set stable privacy mode
sysctl -w net.ipv6.conf.eth0.addr_gen_mode=1

# Disable privacy extensions
sysctl -w net.ipv6.conf.eth0.use_tempaddr=0
```

**Monitor address generation:**
```bash
# Watch addresses being configured
ip -6 monitor address

# Show all addresses with states
ip -6 addr show dev eth0
```

### MikroTik Address Configuration

```mikrotik
# Configure interface for SLAAC
/ipv6 address
add interface=ether1 from-pool=dhcp-pool advertise=yes

# Set EUI-64 mode
/ipv6 settings
set addr-gen-mode=eui-64

# Enable/disable privacy addresses
/interface ethernet
set ether1 ipv6-address-generation-mode=stable-privacy
```

## Address Generation Timeline

```
T+0s:   Interface UP
T+0s:   Generate fe80::xxxx:xxxx:xxxx:xxxx (link-local)
T+0-1s: DAD for link-local
T+1s:   Link-local address active
T+1s:   Send RS to ff02::2
T+1-2s: Receive RA with prefix 2001:db8:abc::/64
T+2s:   Generate 2001:db8:abc::xxxx:xxxx:xxxx:xxxx
T+2-3s: DAD for global address
T+3s:   Global address active
T+3s:   Generate temporary address (if enabled)
T+3-4s: DAD for temporary address
T+4s:   All addresses configured
```

## Security Considerations

### Address Scanning Implications

**EUI-64 addresses reveal:**
- MAC address (vendor identification)
- Device tracking possibility
- Predictable patterns

**Privacy addresses provide:**
- No MAC correlation
- Harder to scan/track
- Changes over time

### Best Practices

```mikrotik
# Configure secure defaults
/ipv6 settings
set addr-gen-mode=stable-privacy
set accept-router-advertisements=yes-if-forwarding-disabled

# Limit address generation
/interface ethernet
set ether1 ipv6-nd-managed-address-config=no
set ether1 ipv6-nd-other-config=yes
```

## Troubleshooting Address Generation

### Common Issues

**No link-local address:**
```bash
# Check IPv6 is enabled
sysctl net.ipv6.conf.eth0.disable_ipv6
# Should be 0

# Force regeneration
ip link set eth0 down
ip link set eth0 up
```

**No global address:**
```bash
# Check for RAs
tcpdump -i eth0 -n icmp6 and ip6[40] == 134

# Check RA settings
rdisc6 eth0
```

**DAD failures:**
```bash
# Check for duplicates
ip -6 neigh show | grep -i failed

# Monitor DAD process
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)'
```

**Key Points:**
- Link-local is always generated first
- Global addresses depend on Router Advertisements
- Multiple addresses per interface are normal
- Privacy addresses rotate periodically
- Modern systems prefer stable-privacy over EUI-64
- DAD ensures address uniqueness
