# IPv6 Address Notation and Route Summarization

## IPv6 Address Shortening Rules

### Rule 1: Leading Zero Suppression
```
Remove leading zeros in each 16-bit field:
2001:0db8:0000:0001:0000:0000:0000:0001
2001:db8:0:1:0:0:0:1
```

### Rule 2: Consecutive Zero Compression
```
Replace one sequence of consecutive zeros with ::
2001:db8:0:1:0:0:0:1
2001:db8:0:1::1

Rules:
- Use :: only once per address
- Choose longest sequence of zeros
- If equal length, use leftmost
```

### Common Examples
```
Full:       2001:0db8:0000:0000:0000:0000:0000:0001
Shortened:  2001:db8::1

Full:       fe80:0000:0000:0000:0204:61ff:fe9d:f156
Shortened:  fe80::204:61ff:fe9d:f156

Full:       2001:0db8:0000:0001:0000:0000:0000:0000
Shortened:  2001:db8:0:1::

Full:       0000:0000:0000:0000:0000:0000:0000:0001
Shortened:  ::1 (loopback)

Full:       0000:0000:0000:0000:0000:0000:0000:0000
Shortened:  :: (unspecified)
```

### Mixed Notation (IPv4-Mapped)
```
Full IPv6:      0000:0000:0000:0000:0000:ffff:c000:0201
IPv4-mapped:    ::ffff:192.0.2.1
                       └─ 192.0.2.1 in hex: c000:0201
```

## Route Summarization

### Binary Boundary Method
```
Networks to summarize:
2001:db8:0000::/48
2001:db8:0001::/48
2001:db8:0002::/48
2001:db8:0003::/48

Binary analysis:
0000 = 0000
0001 = 0001
0002 = 0010
0003 = 0011
       ^^-- These 2 bits differ

Summary: 2001:db8::/46 (covers 0000-0003)
```

### Nibble-Aligned Summarization
```
Prefer 4-bit boundaries for readability:

Single hex digit (/48 → /44):
2001:db8:0000::/48 through 2001:db8:000f::/48
Summary: 2001:db8::/44

Two hex digits (/48 → /40):
2001:db8:0000::/48 through 2001:db8:00ff::/48
Summary: 2001:db8::/40
```

### Practical Summarization Examples

**Example 1: Customer Blocks**
```
Customer allocations:
2001:db8:1000::/48
2001:db8:1001::/48
2001:db8:1002::/48
2001:db8:1003::/48

Summary: 2001:db8:1000::/46

MikroTik implementation:
/ipv6 route
add dst-address=2001:db8:1000::/46 blackhole
```

**Example 2: Regional Aggregation**
```
City allocations:
2001:db8:0000::/44  Chicago (16 /48s)
2001:db8:0010::/44  Detroit (16 /48s)
2001:db8:0020::/44  Cleveland (16 /48s)
2001:db8:0030::/44  Columbus (16 /48s)

Regional summary: 2001:db8::/40 (256 /48s)
```

**Example 3: ISP Aggregation**
```
Customer assignments:
2001:db8:8000::/33  Business customers
2001:db8:0000::/33  Residential customers

ISP advertisement: 2001:db8::/32
```

## Route Dampening

### BGP Route Dampening Concepts
```
Penalty values:
- Route flap (withdraw/announce): 1000
- Attribute change: 500

Thresholds:
- Suppress limit: 2000
- Reuse limit: 750
- Half-life: 15 minutes
- Max suppress time: 60 minutes
```

### MikroTik BGP Dampening Configuration

```mikrotik
# Create dampening profile
/routing filter rule
add chain=bgp-in-v6 \
    rule="if (dst-len > 48) { 
        set bgp-weight=0;
        set damping='yes';
        accept; 
    }"

# Configure dampening parameters
/routing bgp dampening
set enabled=yes \
    suppress-threshold=2000 \
    reuse-threshold=750 \
    half-life=15m \
    max-suppress-time=60m

# View dampened routes
/routing bgp dampening-path print
```

### Route Flap Detection
```mikrotik
# Monitor flapping routes
/routing bgp advertisements print where withdrawn-count > 5

# Log excessive updates
/routing filter rule
add chain=bgp-in-v6 \
    rule="if (bgp-path-peer-update-count > 100) { 
        log warning 'Excessive updates from peer'; 
        # & alert pipeline
    }"
```

## Advanced Summarization Techniques

### Efficient Allocation Planning
```
ISP receives: 2001:db8::/32

Plan with sparse allocation:
2001:db8:0000::/36  Region 1 (future: /35)
2001:db8:2000::/36  Region 2 (future: /35)
2001:db8:4000::/36  Region 3 (future: /35)
2001:db8:6000::/36  Region 4 (future: /35)
2001:db8:8000::/36  Infrastructure
2001:db8:f000::/36  Reserved

Allows growth without renumbering
```

### Hierarchical Summarization
```
Level 1: ISP advertises /32
Level 2: Regions advertise /36
Level 3: Cities advertise /40
Level 4: Districts advertise /44
Level 5: Customers receive /48

Each level summarizes downstream
```

### Conditional Advertisement
```mikrotik
# Advertise summary only if components exist
/routing filter rule
add chain=bgp-out-v6 \
    rule="if (dst == 2001:db8::/32) {
        if (2001:db8:0::/48 in routing-table || \
            2001:db8:1::/48 in routing-table) {
            accept;
        }
        reject;
    }"
```

## Special Cases and Gotchas

### Ambiguous Compression
```
2001:0:0:1:0:0:0:1 can be:
- 2001::1:0:0:0:1
- 2001:0:0:1::1 (correct - longest zero sequence)

Rule: Compress longest sequence
```

### Link-Local with Zone ID
```
fe80::1%ether1
       └─ Zone identifier required for link-local
       
Cannot be shortened further
```

### Prefix Length Notation
```
Correct:
2001:db8::/32
2001:db8::1/128

Incorrect:
2001:db8/32 (missing ::)
2001:db8::/32/64 (double prefix)
```

## Practical Tools and Verification

### MikroTik Address Verification
```mikrotik
# Verify address notation
/ipv6 address add address=2001:db8::1/64 interface=ether1

# Check normalized form
/ipv6 address print detail

# Test summarization
/ipv6 route add dst-address=2001:db8::/46 blackhole
/ipv6 route check 2001:db8:1::1
```

### Linux Tools
```bash
# Normalize address
ipcalc -6 2001:0db8:0000:0000:0000:0000:0000:0001
2001:db8::1

# Calculate summary
ipv6calc --addr 2001:db8:0::/48 --printprefix --maskprefix=46
2001:db8::/46

# Verify route coverage
ip -6 route get 2001:db8:2::1
```

### Python Quick Scripts
```python
# Address shortening
import ipaddress
addr = ipaddress.IPv6Address('2001:0db8:0000:0001:0000:0000:0000:0001')
print(addr.compressed)  # 2001:db8:0:1::1

# Route summarization
networks = [
    ipaddress.IPv6Network('2001:db8:0::/48'),
    ipaddress.IPv6Network('2001:db8:1::/48'),
    ipaddress.IPv6Network('2001:db8:2::/48'),
    ipaddress.IPv6Network('2001:db8:3::/48')
]
summary = ipaddress.collapse_addresses(networks)
print(list(summary))  # [IPv6Network('2001:db8::/46')]
```

## Common Mistakes and Solutions

### Over-Summarization
```
Problem: Advertising 2001:db8::/32 when only using 2001:db8:0::/48
Result: Blackholing traffic to unallocated space

Solution:
/ipv6 route
add dst-address=2001:db8::/32 blackhole
add dst-address=2001:db8:0::/48 gateway=fe80::1%ether1
```

### Under-Summarization
```
Problem: Advertising all /48s individually
Result: Bloated routing tables

Solution: Aggregate at boundaries
/routing filter rule
add chain=bgp-out \
    rule="if (dst in 2001:db8::/32 && dst-len > 32) { 
        reject; 
    }"
```

### Dampening Too Aggressive
```
Problem: Legitimate route changes suppressed
Result: Extended outages

Solution: Tune parameters
/routing bgp dampening
set suppress-threshold=3000 \
    reuse-threshold=1000 \
    half-life=20m
```

## Best Practices Summary

### Address Notation
- Always use compressed format in configurations
- Be consistent within documentation
- Include prefix length explicitly
- Use lowercase hexadecimal (RFC 5952)

### Summarization
- Align on nibble boundaries when possible
- Plan for growth with sparse allocation
- Summarize at administrative boundaries
- Never summarize beyond allocation

### Dampening
- Start with conservative values
- Monitor impact before tightening
- Exclude critical prefixes
- Consider per-peer policies

**Key Points:**
- Master the two shortening rules
- Summarize on binary boundaries
- Use nibble alignment for readability
- Implement dampening carefully
- Always verify summarization coverage
- Plan addressing for aggregation
