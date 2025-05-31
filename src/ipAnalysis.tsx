// ipAnalysis.ts - IP address analysis logic

import { rfcLink } from './shared';

const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const ipv6Regex = /^([\da-fA-F]{0,4}:){1,7}[\da-fA-F]{0,4}$|^::$|^::1$|^([\da-fA-F]{0,4}:){1,7}:$/;

export { ipv4Regex, ipv6Regex };

export const analyzeIPv4 = (ip, cache) => {
  const cacheKey = `v4:${ip}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const parts = ip.match(ipv4Regex);
  if (!parts) return null;
  
  const octets = parts.slice(1, 5).map(Number);
  if (octets.some(o => o > 255)) return null;
  
  const binary = octets.map(o => o.toString(2).padStart(8, '0')).join('.');
  const decimal = (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
  const hex = octets.map(o => o.toString(16).padStart(2, '0')).join(':');
  
  let type = 'Global Unicast';
  let details = [];
  let classInfo = '';
  let rfcs = [];
  
  // Class-based analysis
  if ((octets[0] & 0x80) === 0) {
    classInfo = 'Class A (Legacy)';
    details.push('Historical Class A (0.0.0.0/8 - 127.255.255.255/8)');
  } else if ((octets[0] & 0xC0) === 0x80) {
    classInfo = 'Class B (Legacy)';
    details.push('Historical Class B (128.0.0.0/16 - 191.255.255.255/16)');
  } else if ((octets[0] & 0xE0) === 0xC0) {
    classInfo = 'Class C (Legacy)';
    details.push('Historical Class C (192.0.0.0/24 - 223.255.255.255/24)');
  } else if ((octets[0] & 0xF0) === 0xE0) {
    classInfo = 'Class D (Multicast)';
    type = 'Multicast';
    details.push('Multicast (224.0.0.0/4 - 239.255.255.255/4)');
    rfcs.push({ number: 5771, text: 'IANA IPv4 Multicast Address Space Registry' });
  } else {
    classInfo = 'Class E (Reserved)';
    type = 'Reserved';
    details.push('Reserved for Future Use (240.0.0.0/4 - 255.255.255.255/4)');
    rfcs.push({ number: 1112, text: 'Host Extensions for IP Multicasting', section: 'section-4' });
  }
  
  // Special address analysis
  const specialCases = [
    { condition: ip === '0.0.0.0', type: 'This host on this network', details: ['Can only be used as source address', 'Indicates the absence of an address'], rfcs: [{ number: 1122, text: 'Requirements for Internet Hosts', section: 'section-3.2.1.3' }, { number: 6890, text: 'Special-Purpose IP Address Registries' }] },
    { condition: octets[0] === 0, type: 'This network', details: ['Addresses from 0.0.0.0/8 (except 0.0.0.0/32)'], rfcs: [{ number: 6890, text: 'Special-Purpose IP Address Registries' }] },
    { condition: ip === '255.255.255.255', type: 'Limited Broadcast', details: ['Broadcast to all hosts on the local network segment'], rfcs: [{ number: 919, text: 'Broadcasting Internet Datagrams' }, { number: 922, text: 'Broadcasting Internet Datagrams in the Presence of Subnets' }] },
    { condition: octets[0] === 127, type: 'Loopback', details: ['Internal host loopback addresses (127.0.0.0/8)', 'Packets never leave the host'], rfcs: [{ number: 1122, text: 'Requirements for Internet Hosts', section: 'section-3.2.1.3' }] },
    { condition: octets[0] === 10, type: 'Private-Use', details: ['Private-Use networks (10.0.0.0/8)'], rfcs: [{ number: 1918, text: 'Address Allocation for Private Internets' }] },
    { condition: octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31, type: 'Private-Use', details: ['Private-Use networks (172.16.0.0/12)'], rfcs: [{ number: 1918, text: 'Address Allocation for Private Internets' }] },
    { condition: octets[0] === 192 && octets[1] === 168, type: 'Private-Use', details: ['Private-Use networks (192.168.0.0/16)'], rfcs: [{ number: 1918, text: 'Address Allocation for Private Internets' }] },
    { condition: octets[0] === 169 && octets[1] === 254, type: 'Link-Local', details: ['Link-Local addresses (169.254.0.0/16)', 'Used for automatic private IP addressing (APIPA)'], rfcs: [{ number: 3927, text: 'Dynamic Configuration of IPv4 Link-Local Addresses' }] },
    { condition: octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127, type: 'Shared Address Space', details: ['Carrier-Grade NAT (100.64.0.0/10)'], rfcs: [{ number: 6598, text: 'IANA-Reserved IPv4 Prefix for Shared Address Space' }] },
    { condition: octets[0] === 192 && octets[1] === 0 && octets[2] === 0, type: 'IETF Protocol Assignments', details: ['IETF Protocol Assignments (192.0.0.0/24)'], rfcs: [{ number: 6890, text: 'Special-Purpose IP Address Registries' }] },
    { condition: octets[0] === 192 && octets[1] === 0 && octets[2] === 2, type: 'Documentation', details: ['Documentation (TEST-NET-1) (192.0.2.0/24)'], rfcs: [{ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' }] },
    { condition: octets[0] === 198 && octets[1] === 18, type: 'Benchmarking', details: ['Network Interconnect Device Benchmarking (198.18.0.0/15)'], rfcs: [{ number: 2544, text: 'Benchmarking Methodology for Network Interconnect Devices' }] },
    { condition: octets[0] === 198 && octets[1] === 51 && octets[2] === 100, type: 'Documentation', details: ['Documentation (TEST-NET-2) (198.51.100.0/24)'], rfcs: [{ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' }] },
    { condition: octets[0] === 203 && octets[1] === 0 && octets[2] === 113, type: 'Documentation', details: ['Documentation (TEST-NET-3) (203.0.113.0/24)'], rfcs: [{ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' }] }
  ];
  
  const special = specialCases.find(c => c.condition);
  if (special) {
    type = special.type;
    details = special.details;
    rfcs = special.rfcs;
  } else if (octets[0] >= 224 && octets[0] <= 239) {
    // Multicast details
    if (octets[0] === 224 && octets[1] === 0 && octets[2] === 0) {
      details.push('Local Network Control Block (224.0.0.0/24)', 'TTL/Hop Limit = 1, not forwarded by routers');
      rfcs.push({ number: 5771, text: 'IANA IPv4 Multicast Address Space Registry' });
    } else if (octets[0] === 224 && octets[1] === 0 && octets[2] === 1) {
      details.push('Internetwork Control Block (224.0.1.0/24)');
      rfcs.push({ number: 5771, text: 'IANA IPv4 Multicast Address Space Registry' });
    } else if (octets[0] === 233 && octets[1] >= 252 && octets[1] <= 255) {
      details.push('Source-Specific Multicast (232.0.0.0/8)');
      rfcs.push({ number: 4607, text: 'Source-Specific Multicast for IP' });
    } else if (octets[0] === 234) {
      details.push('GLOP Block (233.0.0.0/8)');
      rfcs.push({ number: 3180, text: 'GLOP Addressing in 233/8' });
    } else if (octets[0] === 239) {
      details.push('Administratively Scoped Block (239.0.0.0/8)');
      rfcs.push({ number: 2365, text: 'Administratively Scoped IP Multicast' });
    }
  }
  
  // IPv6 representations
  const v4hex = octets.map(o => o.toString(16).padStart(2, '0'));
  const ipv6Translations = {
    mapped: `::ffff:${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`,
    mappedCanonical: `::ffff:${ip}`,
    compatible: `::${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`,
    compatibleCanonical: `::${ip}`,
    sixToFour: `2002:${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}::`,
    wellKnown: `64:ff9b::${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`,
    wellKnownCanonical: `64:ff9b::${ip}`
  };
  
  const result = { version: 4, address: ip, type, classInfo, binary, decimal, hex, octets, details, rfcs, ipv6Translations };
  cache.set(cacheKey, result);
  return result;
};

export const analyzeIPv6 = (ip, cache) => {
  const cacheKey = `v6:${ip}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let expanded = ip.toLowerCase();
  
  // Handle :: compression
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0] ? parts[0].split(':').filter(p => p) : [];
    const right = parts[1] ? parts[1].split(':').filter(p => p) : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0000');
    const allParts = [...left, ...middle, ...right];
    expanded = allParts.map(p => p.padStart(4, '0')).join(':');
  } else {
    const parts = expanded.split(':');
    if (parts.length !== 8) return null;
    expanded = parts.map(p => p.padStart(4, '0')).join(':');
  }
  
  const hextets = expanded.split(':').map(h => h.padStart(4, '0'));
  if (hextets.length !== 8) return null;
  
  const binary = hextets.map(h => parseInt(h, 16).toString(2).padStart(16, '0')).join(':');
  
  let type = 'Global Unicast';
  let scope = '';
  let details = [];
  let rfcs = [];
  let macAddress = null;
  let embeddedIPv4 = null;
  
  const firstHextet = parseInt(hextets[0], 16);
  
  // Special addresses
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') {
    type = 'Unspecified';
    details = ['The unspecified address (::/128)', 'Must not be assigned to any node'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.2' }];
  } else if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') {
    type = 'Loopback';
    details = ['The loopback address (::1/128)', 'Used to send packets to itself'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.3' }];
  } else if (expanded.startsWith('0000:0000:0000:0000:0000:ffff:')) {
    type = 'IPv4-Mapped';
    details = ['IPv4-Mapped IPv6 Address (::ffff:0:0/96)', 'Used to represent IPv4 addresses as IPv6 addresses'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.5.2' }];
    
    const v4part = hextets.slice(6).join('');
    embeddedIPv4 = [
      parseInt(v4part.substring(0, 2), 16),
      parseInt(v4part.substring(2, 4), 16),
      parseInt(v4part.substring(4, 6), 16),
      parseInt(v4part.substring(6, 8), 16)
    ].join('.');
    details.push(`Embedded IPv4: ${embeddedIPv4}`);
  } else if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) {
    type = 'Link-Local';
    scope = 'Link';
    details = ['Link-Local Unicast (fe80::/10)', 'Valid only on a single link'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.6' }, { number: 4862, text: 'IPv6 Stateless Address Autoconfiguration' }];
    
    // Check for embedded MAC
    const interfaceId = hextets.slice(4).join('');
    if (interfaceId.substring(4, 8) === 'fffe') {
      const mac1 = parseInt(interfaceId.substring(0, 2), 16) ^ 0x02;
      const mac2 = interfaceId.substring(2, 4);
      const mac3 = interfaceId.substring(8, 10);
      const mac4 = interfaceId.substring(10, 12);
      const mac5 = interfaceId.substring(12, 14);
      const mac6 = interfaceId.substring(14, 16);
      
      macAddress = `${mac1.toString(16).padStart(2, '0')}:${mac2}:${mac3}:${mac4}:${mac5}:${mac6}`;
      details.push(`Derived from MAC: ${macAddress} (Modified EUI-64)`);
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'appendix-A' });
    }
  } else if ((firstHextet & 0xff00) === 0xff00) {
    type = 'Multicast';
    
    const flags = (firstHextet & 0x00f0) >> 4;
    const scopeValue = firstHextet & 0x000f;
    
    const scopes = {
      0x0: 'Reserved', 0x1: 'Interface-Local', 0x2: 'Link-Local', 0x3: 'Realm-Local',
      0x4: 'Admin-Local', 0x5: 'Site-Local', 0x8: 'Organization-Local', 0xe: 'Global', 0xf: 'Reserved'
    };
    
    scope = scopes[scopeValue] || 'Unknown';
    details.push(`Multicast Scope: ${scope} (${scopeValue.toString(16)})`);
    
    const flagBits = [];
    flagBits.push(flags & 0x8 ? 'R=1 (Rendezvous Point embedded)' : 'R=0 (No Rendezvous Point)');
    flagBits.push(flags & 0x4 ? 'P=1 (Prefix-based)' : 'P=0 (Not Prefix-based)');
    flagBits.push(flags & 0x1 ? 'T=1 (Transient)' : 'T=0 (Well-known)');
    
    details.push(`Flags: 0x${flags.toString(16)} (${flagBits.join(', ')})`);
    rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.7' });
    
    if (flags & 0x4) rfcs.push({ number: 3306, text: 'Unicast-Prefix-based IPv6 Multicast Addresses' });
    if (flags & 0x8) rfcs.push({ number: 3956, text: 'Embedding the Rendezvous Point (RP) Address' });
  } else if (firstHextet >= 0x2000 && firstHextet <= 0x3fff) {
    type = 'Global Unicast';
    details = ['Global Unicast (2000::/3)', 'Currently allocated range for global unicast addresses', 'IANA unicast assignments limited to this range'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.4' }, { number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' }];
    
    // Check specific allocations
    if (expanded.startsWith('2001:0db8:')) {
      type = 'Documentation';
      details = ['Documentation Prefix (2001:db8::/32)', 'Reserved for use in documentation and examples'];
      rfcs = [{ number: 3849, text: 'IPv6 Address Prefix Reserved for Documentation' }];
    } else if (expanded.startsWith('2002:')) {
      type = '6to4';
      details = ['6to4 Addressing (2002::/16)'];
      rfcs = [{ number: 3056, text: 'Connection of IPv6 Domains via IPv4 Clouds' }];
      
      const v4hex = hextets[1] + hextets[2];
      embeddedIPv4 = [
        parseInt(v4hex.substring(0, 2), 16),
        parseInt(v4hex.substring(2, 4), 16),
        parseInt(v4hex.substring(4, 6), 16),
        parseInt(v4hex.substring(6, 8), 16)
      ].join('.');
      details.push(`Embedded IPv4: ${embeddedIPv4}`);
    }
  } else if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) {
    type = 'Unique Local';
    scope = 'Global (locally assigned)';
    details = ['Unique Local Address (fc00::/7)'];
    
    if (firstHextet >= 0xfd00) {
      details.push('Locally assigned (fd00::/8)', '40-bit random Global ID provides uniqueness');
      const globalId = hextets[0].substring(2) + hextets[1] + hextets[2].substring(0, 2);
      details.push(`Global ID: ${globalId}`, `Subnet ID: ${hextets[2].substring(2)}${hextets[3]}`);
    } else {
      details.push('Reserved for future definition (fc00::/8)');
    }
    rfcs = [{ number: 4193, text: 'Unique Local IPv6 Unicast Addresses' }, { number: 8190, text: 'Updates to the Special-Purpose IP Address Registries' }];
  } else if (!type || type === 'Global Unicast') {
    type = 'Reserved by IETF';
    details = ['Reserved by IETF', 'Not allocated for use at this time'];
    rfcs = [{ number: 4291, text: 'IP Version 6 Addressing Architecture' }];
  }
  
  const result = { version: 6, address: ip, expanded, type, scope, binary, hextets, details, rfcs, macAddress, embeddedIPv4 };
  cache.set(cacheKey, result);
  return result;
};
