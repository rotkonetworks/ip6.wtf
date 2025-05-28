import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Terminal, ExternalLink } from 'lucide-react';

const IPAnalyzer = () => {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [showBinary, setShowBinary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cache] = useState(new Map());
  const inputRef = useRef(null);

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv6Regex = /^([\da-fA-F]{0,4}:){1,7}[\da-fA-F]{0,4}$|^::$|^::1$|^([\da-fA-F]{0,4}:){1,7}:$/;

  useEffect(() => {
    const path = window.location.pathname.substring(1);
    
    if (path && (ipv4Regex.test(path) || ipv6Regex.test(path) || path.includes('::'))) {
      setInput(decodeURIComponent(path));
    }
  }, []);

  const suggestionCategories = {
    all: 'All Addresses',
    'ipv4-special': 'IPv4 Special',
    'ipv4-private': 'IPv4 Private',
    'ipv4-multicast': 'IPv4 Multicast',
    'ipv6-special': 'IPv6 Special',
    'ipv6-local': 'IPv6 Local',
    'ipv6-multicast': 'IPv6 Multicast',
    'ipv6-documentation': 'IPv6 Documentation',
    'real-world': 'Real World'
  };

  const suggestions = [
    // IPv4 Special
    { ip: '0.0.0.0', desc: 'Unspecified', cat: 'ipv4-special' },
    { ip: '127.0.0.1', desc: 'Loopback', cat: 'ipv4-special' },
    { ip: '255.255.255.255', desc: 'Broadcast', cat: 'ipv4-special' },
    
    // IPv4 Private
    { ip: '10.0.0.1', desc: 'Class A Private', cat: 'ipv4-private' },
    { ip: '172.16.0.1', desc: 'Class B Private', cat: 'ipv4-private' },
    { ip: '192.168.1.1', desc: 'Class C Private', cat: 'ipv4-private' },
    { ip: '169.254.1.1', desc: 'Link-Local', cat: 'ipv4-private' },
    
    // IPv4 Multicast
    { ip: '224.0.0.1', desc: 'All Hosts', cat: 'ipv4-multicast' },
    { ip: '224.0.0.2', desc: 'All Routers', cat: 'ipv4-multicast' },
    { ip: '239.255.255.250', desc: 'UPnP/SSDP', cat: 'ipv4-multicast' },
    
    // IPv6 Special
    { ip: '::', desc: 'Unspecified', cat: 'ipv6-special' },
    { ip: '::1', desc: 'Loopback', cat: 'ipv6-special' },
    { ip: '::ffff:192.0.2.1', desc: 'IPv4-Mapped', cat: 'ipv6-special' },
    
    // IPv6 Local
    { ip: 'fe80::1', desc: 'Link-Local', cat: 'ipv6-local' },
    { ip: 'fd00::1', desc: 'Unique Local', cat: 'ipv6-local' },
    { ip: 'fc00::1', desc: 'ULA Reserved', cat: 'ipv6-local' },
    
    // IPv6 Multicast
    { ip: 'ff02::1', desc: 'All Nodes', cat: 'ipv6-multicast' },
    { ip: 'ff02::2', desc: 'All Routers', cat: 'ipv6-multicast' },
    { ip: 'ff02::fb', desc: 'mDNSv6', cat: 'ipv6-multicast' },
    { ip: 'ff02::1:2', desc: 'DHCP Agents', cat: 'ipv6-multicast' },
    { ip: 'ff02::1:ff00:1', desc: 'Solicited-Node', cat: 'ipv6-multicast' },
    
    // IPv6 Documentation
    { ip: '2001:db8::', desc: 'Documentation', cat: 'ipv6-documentation' },
    { ip: '2001:db8:dead:beef::', desc: 'Documentation Example', cat: 'ipv6-documentation' },
    
    // Real World
    { ip: '9.9.9.9', desc: 'Quad9 DNS', cat: 'real-world' },
    { ip: '8.8.8.8', desc: 'Google DNS', cat: 'real-world' },
    { ip: '1.1.1.1', desc: 'Cloudflare DNS', cat: 'real-world' },
    { ip: '2620:fe::fe', desc: 'Quad9 DNS v6', cat: 'real-world' },
    { ip: '2001:4860:4860::8888', desc: 'Google DNS v6', cat: 'real-world' },
    { ip: '2606:4700:4700::1111', desc: 'Cloudflare v6', cat: 'real-world' },
  ];

  const rfcLink = (rfcNumber: number, section = '') => {
    const base = `https://www.rfc-editor.org/rfc/rfc${rfcNumber}.html`;
    return section ? `${base}#${section}` : base;
  };

  const analyzeIPv4 = (ip: string) => {
    // Check cache first
    const cacheKey = `v4:${ip}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const parts = ip.match(ipv4Regex);
    if (!parts) return null;
    
    const octets = parts.slice(1, 5).map(Number);
    
    // Validate octets
    if (octets.some(o => o > 255)) return null;
    
    const binary = octets.map(o => o.toString(2).padStart(8, '0')).join('.');
    const decimal = (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
    const hex = octets.map(o => o.toString(16).padStart(2, '0')).join(':');
    
    let type = 'Global Unicast';
    let details = [];
    let classInfo = '';
    let rfcs = [];
    
    // Class-based analysis (historical)
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
    
    // Special addresses per RFC 6890
    if (ip === '0.0.0.0') {
      type = 'This host on this network';
      details.push('Can only be used as source address');
      details.push('Indicates the absence of an address');
      rfcs.push({ number: 1122, text: 'Requirements for Internet Hosts', section: 'section-3.2.1.3' });
      rfcs.push({ number: 6890, text: 'Special-Purpose IP Address Registries' });
    } else if (octets[0] === 0) {
      type = 'This network';
      details.push('Addresses from 0.0.0.0/8 (except 0.0.0.0/32)');
      rfcs.push({ number: 6890, text: 'Special-Purpose IP Address Registries' });
    } else if (ip === '255.255.255.255') {
      type = 'Limited Broadcast';
      details.push('Broadcast to all hosts on the local network segment');
      rfcs.push({ number: 919, text: 'Broadcasting Internet Datagrams' });
      rfcs.push({ number: 922, text: 'Broadcasting Internet Datagrams in the Presence of Subnets' });
    } else if (octets[0] === 127) {
      type = 'Loopback';
      details.push('Internal host loopback addresses (127.0.0.0/8)');
      details.push('Packets never leave the host');
      rfcs.push({ number: 1122, text: 'Requirements for Internet Hosts', section: 'section-3.2.1.3' });
    } else if (octets[0] === 10) {
      type = 'Private-Use';
      details.push('Private-Use networks (10.0.0.0/8)');
      rfcs.push({ number: 1918, text: 'Address Allocation for Private Internets' });
    } else if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      type = 'Private-Use';
      details.push('Private-Use networks (172.16.0.0/12)');
      rfcs.push({ number: 1918, text: 'Address Allocation for Private Internets' });
    } else if (octets[0] === 192 && octets[1] === 168) {
      type = 'Private-Use';
      details.push('Private-Use networks (192.168.0.0/16)');
      rfcs.push({ number: 1918, text: 'Address Allocation for Private Internets' });
    } else if (octets[0] === 169 && octets[1] === 254) {
      type = 'Link-Local';
      details.push('Link-Local addresses (169.254.0.0/16)');
      details.push('Used for automatic private IP addressing (APIPA)');
      rfcs.push({ number: 3927, text: 'Dynamic Configuration of IPv4 Link-Local Addresses' });
    } else if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
      type = 'Shared Address Space';
      details.push('Carrier-Grade NAT (100.64.0.0/10)');
      rfcs.push({ number: 6598, text: 'IANA-Reserved IPv4 Prefix for Shared Address Space' });
    } else if (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) {
      type = 'IETF Protocol Assignments';
      details.push('IETF Protocol Assignments (192.0.0.0/24)');
      rfcs.push({ number: 6890, text: 'Special-Purpose IP Address Registries' });
    } else if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) {
      type = 'Documentation';
      details.push('Documentation (TEST-NET-1) (192.0.2.0/24)');
      rfcs.push({ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' });
    } else if (octets[0] === 198 && octets[1] === 18) {
      type = 'Benchmarking';
      details.push('Network Interconnect Device Benchmarking (198.18.0.0/15)');
      rfcs.push({ number: 2544, text: 'Benchmarking Methodology for Network Interconnect Devices' });
    } else if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) {
      type = 'Documentation';
      details.push('Documentation (TEST-NET-2) (198.51.100.0/24)');
      rfcs.push({ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' });
    } else if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) {
      type = 'Documentation';
      details.push('Documentation (TEST-NET-3) (203.0.113.0/24)');
      rfcs.push({ number: 5737, text: 'IPv4 Address Blocks Reserved for Documentation' });
    } else if (octets[0] >= 224 && octets[0] <= 239) {
      // Detailed multicast analysis
      if (octets[0] === 224 && octets[1] === 0 && octets[2] === 0) {
        details.push('Local Network Control Block (224.0.0.0/24)');
        details.push('TTL/Hop Limit = 1, not forwarded by routers');
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
    
    // Generate IPv6 representations
    const ipv6Translations = {};
    
    // IPv4-Mapped IPv6 Address (RFC 4291)
    const v4hex = octets.map(o => o.toString(16).padStart(2, '0'));
    ipv6Translations.mapped = `::ffff:${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`;
    ipv6Translations.mappedCanonical = `::ffff:${ip}`;
    
    // IPv4-Compatible IPv6 Address (deprecated, RFC 4291)
    ipv6Translations.compatible = `::${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`;
    ipv6Translations.compatibleCanonical = `::${ip}`;
    
    // 6to4 Address (RFC 3056)
    const sixToFourPrefix = `2002:${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`;
    ipv6Translations.sixToFour = `${sixToFourPrefix}::`;
    
    // Well-Known Prefix for IPv4/IPv6 Translation (RFC 6052)
    ipv6Translations.wellKnown = `64:ff9b::${v4hex[0]}${v4hex[1]}:${v4hex[2]}${v4hex[3]}`;
    ipv6Translations.wellKnownCanonical = `64:ff9b::${ip}`;
    
    const result = {
      version: 4,
      address: ip,
      type,
      classInfo,
      binary,
      decimal,
      hex,
      octets,
      details,
      rfcs,
      ipv6Translations
    };
    
    cache.set(cacheKey, result);
    return result;
  };

  const analyzeIPv6 = (ip) => {
    // Check cache first
    const cacheKey = `v6:${ip}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // Normalize and expand IPv6 address
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
    
    const binary = hextets.map(h => 
      parseInt(h, 16).toString(2).padStart(16, '0')
    ).join(':');
    
    let type = 'Global Unicast';
    let scope = '';
    let details = [];
    let rfcs = [];
    let macAddress = null;
    let embeddedIPv4 = null;
    
    // Analyze based on prefix - following RFC 4291 and RFC 6890
    const firstHextet = parseInt(hextets[0], 16);
    
    if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') {
      type = 'Unspecified';
      details.push('The unspecified address (::/128)');
      details.push('Must not be assigned to any node');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.2' });
    } else if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') {
      type = 'Loopback';
      details.push('The loopback address (::1/128)');
      details.push('Used to send packets to itself');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.3' });
    } else if (expanded.startsWith('0000:0000:0000:0000:0000:ffff:')) {
      type = 'IPv4-Mapped';
      details.push('IPv4-Mapped IPv6 Address (::ffff:0:0/96)');
      details.push('Used to represent IPv4 addresses as IPv6 addresses');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.5.2' });
      
      // Extract embedded IPv4
      const v4part = hextets.slice(6).join('');
      embeddedIPv4 = [
        parseInt(v4part.substring(0, 2), 16),
        parseInt(v4part.substring(2, 4), 16),
        parseInt(v4part.substring(4, 6), 16),
        parseInt(v4part.substring(6, 8), 16)
      ].join('.');
      details.push(`Embedded IPv4: ${embeddedIPv4}`);
    } else if (expanded.match(/^0000:0000:0000:0000:0000:0000:[0-9a-f]{4}:[0-9a-f]{4}$/)) {
      type = 'IPv4-Compatible';
      details.push('IPv4-Compatible IPv6 Address (deprecated) (::/96)');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.5.1' });
      
      // Extract embedded IPv4
      const v4part = hextets.slice(6).join('');
      embeddedIPv4 = [
        parseInt(v4part.substring(0, 2), 16),
        parseInt(v4part.substring(2, 4), 16),
        parseInt(v4part.substring(4, 6), 16),
        parseInt(v4part.substring(6, 8), 16)
      ].join('.');
      details.push(`Embedded IPv4: ${embeddedIPv4}`);
    } else if (firstHextet === 0x0000) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (::/8)');
      details.push('Partially allocated for specific uses');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet === 0x0100) {
      if (expanded === '0100:0000:0000:0000:0000:0000:0000:0000') {
        type = 'Discard-Only';
        details.push('Discard-Only Address Block (100::/128)');
        details.push('Black hole prefix for discard routing');
        rfcs.push({ number: 6666, text: 'A Discard Prefix for IPv6' });
      } else {
        type = 'Reserved by IETF';
        details.push('Reserved by IETF (100::/8)');
        details.push('Partially allocated - see IANA IPv6 Special-Purpose Address Registry');
        rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
        rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
      }
    } else if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) {
      type = 'Link-Local';
      scope = 'Link';
      details.push('Link-Local Unicast (fe80::/10)');
      details.push('Valid only on a single link');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.6' });
      rfcs.push({ number: 4862, text: 'IPv6 Stateless Address Autoconfiguration' });
      
      // Check for embedded MAC (Modified EUI-64)
      const interfaceId = hextets.slice(4).join('');
      if (interfaceId.substring(4, 8) === 'fffe') {
        const mac1 = parseInt(interfaceId.substring(0, 2), 16) ^ 0x02; // Flip U/L bit
        const mac2 = interfaceId.substring(2, 4);
        const mac3 = interfaceId.substring(8, 10);
        const mac4 = interfaceId.substring(10, 12);
        const mac5 = interfaceId.substring(12, 14);
        const mac6 = interfaceId.substring(14, 16);
        
        macAddress = `${mac1.toString(16).padStart(2, '0')}:${mac2}:${mac3}:${mac4}:${mac5}:${mac6}`;
        details.push(`Derived from MAC: ${macAddress} (Modified EUI-64)`);
        rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'appendix-A' });
      }
    } else if (firstHextet >= 0xfec0 && firstHextet <= 0xfeff) {
      type = 'Site-Local (Deprecated)';
      scope = 'Site';
      details.push('Site-Local Unicast (fec0::/10) - DEPRECATED');
      details.push('Replaced by Unique Local Addresses');
      rfcs.push({ number: 3879, text: 'Deprecating Site Local Addresses' });
    } else if ((firstHextet & 0xff00) === 0xff00) {
      type = 'Multicast';
      
      // Parse multicast flags and scope per RFC 4291
      const flags = (firstHextet & 0x00f0) >> 4;
      const scopeValue = firstHextet & 0x000f;
      
      const scopes = {
        0x0: 'Reserved',
        0x1: 'Interface-Local',
        0x2: 'Link-Local',
        0x3: 'Realm-Local',
        0x4: 'Admin-Local',
        0x5: 'Site-Local',
        0x8: 'Organization-Local',
        0xe: 'Global',
        0xf: 'Reserved'
      };
      
      scope = scopes[scopeValue] || 'Unknown';
      details.push(`Multicast Scope: ${scope} (${scopeValue.toString(16)})`);
      
      const flagBits = [];
      if (flags & 0x8) flagBits.push('R=1 (Rendezvous Point embedded)');
      else flagBits.push('R=0 (No Rendezvous Point)');
      
      if (flags & 0x4) flagBits.push('P=1 (Prefix-based)');
      else flagBits.push('P=0 (Not Prefix-based)');
      
      if (flags & 0x1) flagBits.push('T=1 (Transient)');
      else flagBits.push('T=0 (Well-known)');
      
      details.push(`Flags: 0x${flags.toString(16)} (${flagBits.join(', ')})`);
      
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.7' });
      
      // Special multicast addresses
      if (expanded === 'ff01:0000:0000:0000:0000:0000:0000:0001') {
        details.push('All Nodes Address (interface-local)');
      } else if (expanded === 'ff02:0000:0000:0000:0000:0000:0000:0001') {
        details.push('All Nodes Address (link-local)');
      } else if (expanded === 'ff01:0000:0000:0000:0000:0000:0000:0002') {
        details.push('All Routers Address (interface-local)');
      } else if (expanded === 'ff02:0000:0000:0000:0000:0000:0000:0002') {
        details.push('All Routers Address (link-local)');
      } else if (expanded === 'ff05:0000:0000:0000:0000:0000:0000:0002') {
        details.push('All Routers Address (site-local)');
      } else if (expanded.startsWith('ff02:0000:0000:0000:0000:0001:ff')) {
        details.push('Solicited-Node Multicast Address');
        details.push('Used for Neighbor Discovery Protocol');
        rfcs.push({ number: 4861, text: 'Neighbor Discovery for IP version 6' });
      }
      
      if (flags & 0x4) {
        rfcs.push({ number: 3306, text: 'Unicast-Prefix-based IPv6 Multicast Addresses' });
      }
      if (flags & 0x8) {
        rfcs.push({ number: 3956, text: 'Embedding the Rendezvous Point (RP) Address' });
      }
    } else if (firstHextet >= 0x2000 && firstHextet <= 0x3fff) {
      type = 'Global Unicast';
      details.push('Global Unicast (2000::/3)');
      details.push('Currently allocated range for global unicast addresses');
      details.push('IANA unicast assignments limited to this range');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture', section: 'section-2.5.4' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
      
      // Check for specific allocations
      if (expanded.startsWith('2001:0000:')) {
        type = 'Teredo';
        details = ['Teredo Tunneling (2001::/32)'];
        rfcs = [{ number: 4380, text: 'Teredo: Tunneling IPv6 over UDP' }];
        
        // Decode Teredo (if full address)
        if (!expanded.endsWith('::')) {
          const serverIPv4 = `${parseInt(hextets[1].substring(0, 2), 16)}.${parseInt(hextets[1].substring(2, 4), 16)}.${parseInt(hextets[2].substring(0, 2), 16)}.${parseInt(hextets[2].substring(2, 4), 16)}`;
          const flags = parseInt(hextets[3], 16);
          const obfuscatedPort = parseInt(hextets[4], 16) ^ 0xffff;
          const clientIPv4 = [
            parseInt(hextets[5].substring(0, 2), 16) ^ 0xff,
            parseInt(hextets[5].substring(2, 4), 16) ^ 0xff,
            parseInt(hextets[6].substring(0, 2), 16) ^ 0xff,
            parseInt(hextets[6].substring(2, 4), 16) ^ 0xff
          ].join('.');
          
          details.push(`Teredo Server: ${serverIPv4}`);
          details.push(`Client IPv4: ${clientIPv4}`);
          details.push(`Client Port: ${obfuscatedPort}`);
          details.push(`Flags: 0x${flags.toString(16)}`);
          embeddedIPv4 = clientIPv4;
        }
      } else if (expanded.startsWith('2001:0002:')) {
        type = 'Benchmarking';
        details = ['Benchmarking (2001:2::/48)'];
        rfcs = [{ number: 5180, text: 'IPv6 Benchmarking Methodology' }];
      } else if (expanded.startsWith('2001:0db8:')) {
        type = 'Documentation';
        details = ['Documentation Prefix (2001:db8::/32)'];
        details.push('Reserved for use in documentation and examples');
        rfcs = [{ number: 3849, text: 'IPv6 Address Prefix Reserved for Documentation' }];
      } else if (expanded.startsWith('2001:0010:') || expanded.startsWith('2001:0020:')) {
        type = 'ORCHIDv2';
        details = ['Overlay Routable Cryptographic Hash Identifiers v2'];
        details.push(expanded.startsWith('2001:0010:') ? '2001:10::/28 (Deprecated ORCHID)' : '2001:20::/28 (ORCHIDv2)');
        rfcs = [{ number: 7343, text: 'An IPv6 Prefix for Overlay Routable Cryptographic Hash Identifiers Version 2' }];
      } else if (expanded.startsWith('2002:')) {
        type = '6to4';
        details = ['6to4 Addressing (2002::/16)'];
        rfcs = [{ number: 3056, text: 'Connection of IPv6 Domains via IPv4 Clouds' }];
        
        // Extract embedded IPv4
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
      details.push('Unique Local Address (fc00::/7)');
      
      if (firstHextet >= 0xfd00) {
        details.push('Locally assigned (fd00::/8)');
        details.push('40-bit random Global ID provides uniqueness');
        
        // Extract Global ID
        const globalId = hextets[0].substring(2) + hextets[1] + hextets[2].substring(0, 2);
        details.push(`Global ID: ${globalId}`);
        details.push(`Subnet ID: ${hextets[2].substring(2)}${hextets[3]}`);
      } else {
        details.push('Reserved for future definition (fc00::/8)');
      }
      rfcs.push({ number: 4193, text: 'Unique Local IPv6 Unicast Addresses' });
      rfcs.push({ number: 8190, text: 'Updates to the Special-Purpose IP Address Registries' });
    } else if (expanded.startsWith('0064:ff9b:0000:0000:0000:0000:')) {
      type = 'IPv4-IPv6 Translation';
      details.push('Well-Known Prefix for IPv4/IPv6 Translation (64:ff9b::/96)');
      rfcs.push({ number: 6052, text: 'IPv6 Addressing of IPv4/IPv6 Translators' });
      
      // Extract embedded IPv4
      const v4part = hextets.slice(6).join('');
      if (v4part.length === 8) {
        embeddedIPv4 = [
          parseInt(v4part.substring(0, 2), 16),
          parseInt(v4part.substring(2, 4), 16),
          parseInt(v4part.substring(4, 6), 16),
          parseInt(v4part.substring(6, 8), 16)
        ].join('.');
        details.push(`Embedded IPv4: ${embeddedIPv4}`);
      }
    } else if (expanded.startsWith('0064:ff9b:0001:')) {
      type = 'IPv4-IPv6 Translation';
      details.push('IPv4/IPv6 Translation with Well-Known Prefix (64:ff9b:1::/48)');
      rfcs.push({ number: 8215, text: 'Local-Use IPv4/IPv6 Translation Prefix' });
    } else if (expanded === '0100:0000:0000:0000:0000:0000:0000:0000') {
      type = 'Discard-Only';
      details.push('Discard-Only Address Block (100::/64)');
      details.push('Black hole prefix for discard routing');
      rfcs.push({ number: 6666, text: 'A Discard Prefix for IPv6' });
    } else if (firstHextet >= 0x4000 && firstHextet <= 0x5fff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (4000::/3)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0x6000 && firstHextet <= 0x7fff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (6000::/3)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0x8000 && firstHextet <= 0x9fff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (8000::/3)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xa000 && firstHextet <= 0xbfff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (a000::/3)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xc000 && firstHextet <= 0xdfff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (c000::/3)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xe000 && firstHextet <= 0xefff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (e000::/4)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xf000 && firstHextet <= 0xf7ff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (f000::/5)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xf800 && firstHextet <= 0xfbff) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (f800::/6)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (firstHextet >= 0xfe00 && firstHextet <= 0xfe7f) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF (fe00::/9)');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
      rfcs.push({ number: 3513, text: 'Internet Protocol Version 6 (IPv6) Addressing Architecture' });
    } else if (!type) {
      type = 'Reserved by IETF';
      details.push('Reserved by IETF');
      details.push('Not allocated for use at this time');
      rfcs.push({ number: 4291, text: 'IP Version 6 Addressing Architecture' });
    }
    
    // Check for addresses in reserved ranges that have been allocated
    if ((firstHextet < 0x2000 || firstHextet >= 0x4000) && firstHextet < 0xfc00) {
      // Check specific allocations in reserved space
      if (expanded.startsWith('0100:0000:0000:0000:')) {
        // Already handled above
      } else if (expanded.startsWith('0200:') && firstHextet <= 0x03ff) {
        type = 'Reserved by IETF (formerly OSI NSAP)';
        details = ['Reserved by IETF (200::/7)'];
        details.push('Deprecated December 2004 - formerly OSI NSAP-mapped prefix');
        rfcs = [{ number: 4048, text: 'RFC 3513-Based Reserved IPv6 Unicast Address Format' }];
        rfcs.push({ number: 4548, text: 'Internet Code Point (ICP) Assignments for NSAP Addresses' });
      }
    }
    
    // Check for "dead:beef::" specifically
    if (ip.toLowerCase().startsWith('dead:beef::')) {
      details.push('Note: Common example address used in documentation');
      details.push('Valid Global Unicast address but often used as placeholder');
    }
    
    const result = {
      version: 6,
      address: ip,
      expanded,
      type,
      scope,
      binary,
      hextets,
      details,
      rfcs,
      macAddress,
      embeddedIPv4
    };
    
    cache.set(cacheKey, result);
    return result;
  };

  useEffect(() => {
    const trimmed = input.trim().toLowerCase();
    
    // Filter suggestions based on category
    let filtered = suggestions;
    if (selectedCategory !== 'all') {
      filtered = suggestions.filter(s => s.cat === selectedCategory);
    }
    
    // Further filter by input if there is any
    if (trimmed.length > 0) {
      filtered = filtered.filter(s => 
        s.ip.toLowerCase().includes(trimmed) ||
        s.desc.toLowerCase().includes(trimmed)
      );
    }
    
    setFilteredSuggestions(filtered);
    
    // Show suggestions when input is focused or when category changes
    if (trimmed.length > 0 || selectedCategory !== 'all') {
      setShowSuggestions(true);
    }
    
    // Analyze the input
    if (input) {
      const upperTrimmed = input.trim();
      if (ipv4Regex.test(upperTrimmed)) {
        setAnalysis(analyzeIPv4(upperTrimmed));
        setIsExpanded(true);
      } else if (ipv6Regex.test(upperTrimmed) || upperTrimmed.includes('::')) {
        setAnalysis(analyzeIPv6(upperTrimmed));
        setIsExpanded(true);
      } else {
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }
  }, [input, selectedCategory]);

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion.ip);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (analysis) {
      setIsExpanded(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Terminal Header */}
      <div className="border-b border-green-800 bg-gray-900 px-2 sm:px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="hidden sm:block" />
          <span className="text-green-500 text-xs sm:text-sm">ip6.wtf - IPv6 Address Analyzer</span>
        </div>
        <div className="text-gray-500 hidden sm:block">
          {new Date().toLocaleString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </div>
      </div>

      <div className={`transition-all duration-500 ${isExpanded ? 'pt-4 sm:pt-8' : 'pt-16 sm:pt-32'}`}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          {/* Logo/Title */}
          <div className={`text-center transition-all duration-500 ${isExpanded ? 'mb-4 sm:mb-6' : 'mb-8 sm:mb-12'}`}>
            <h1 className={`font-bold text-green-400 transition-all ${isExpanded ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-6xl'}`}>
              ip6.wtf
            </h1>
            {!isExpanded && (
              <p className="text-green-600 mt-2 text-xs sm:text-sm px-4">
                [ IPv6 Address Analysis ]
              </p>
            )}
          </div>

          {/* Search Form */}
          <div className={`transition-all duration-500 ${isExpanded ? 'mb-6' : 'mb-12'}`}>
            <div className="relative max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row items-stretch bg-gray-900 border border-green-600 rounded">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-green-400 px-3 py-2 border-b sm:border-b-0 sm:border-r border-green-600 focus:outline-none text-sm"
                >
                  {Object.entries(suggestionCategories).map(([key, label]) => (
                    <option key={key} value={key} className="bg-gray-900">
                      {label}
                    </option>
                  ))}
                </select>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => {
                    if (selectedCategory !== 'all' || input.trim().length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onClick={() => {
                    if (selectedCategory !== 'all' || input.trim().length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicks on suggestions
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Enter IP address..."
                  className="flex-1 bg-transparent px-4 py-3 text-green-400 placeholder-green-700 focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 text-green-400 hover:bg-green-900 transition-colors border-t sm:border-t-0 sm:border-l border-green-600"
                >
                  ANALYZE
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-green-600 rounded max-h-64 overflow-y-auto">
                  {filteredSuggestions.slice(0, 10).map((suggestion, i) => (
                    <div
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 hover:bg-green-900 cursor-pointer flex justify-between items-center text-sm"
                    >
                      <span className="text-green-400">{suggestion.ip}</span>
                      <span className="text-green-600">[{suggestion.desc}]</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {!isExpanded && (
            <div className="text-center">
              <button
                onClick={() => {
                  const random = suggestions[Math.floor(Math.random() * suggestions.length)];
                  setInput(random.ip);
                }}
                className="text-green-600 hover:text-green-400 text-sm"
              >
                [ Try Random Address ]
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && isExpanded && (
            <div className="space-y-4">
              {/* Main Info */}
              <div className="bg-gray-900 border border-green-600 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-500">## ANALYSIS RESULT ##</span>
                  <span className="text-green-600 text-sm">IPv{analysis.version}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Address:</span>
                    <div className="text-green-400 break-all">{analysis.address}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Type:</span>
                    <div className="text-green-400">{analysis.type}</div>
                  </div>
                  {analysis.classInfo && (
                    <div>
                      <span className="text-green-600">Class:</span>
                      <div className="text-green-400">{analysis.classInfo}</div>
                    </div>
                  )}
                  {analysis.scope && (
                    <div>
                      <span className="text-green-600">Scope:</span>
                      <div className="text-green-400">{analysis.scope}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Form for IPv6 */}
              {analysis.version === 6 && analysis.expanded !== analysis.address && (
                <div className="bg-gray-900 border border-green-600 p-4">
                  <div className="text-green-600 text-sm mb-2">Canonical Form:</div>
                  <div className="text-green-400 text-xs break-all">{analysis.expanded}</div>
                </div>
              )}

              {/* Binary Toggle */}
              <div className="bg-gray-900 border border-green-600 p-4">
                <button
                  onClick={() => setShowBinary(!showBinary)}
                  className="flex items-center gap-2 text-green-500 hover:text-green-400 text-sm"
                >
                  {showBinary ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  BINARY REPRESENTATION
                </button>
                
                {showBinary && (
                  <div className="mt-3">
                    <div className="text-green-400 text-xs font-mono break-all">
                      {analysis.binary}
                    </div>
                    {analysis.version === 4 && (
                      <div className="text-green-600 text-xs mt-2">
                        Decimal: {analysis.decimal.toLocaleString()} | Hex: {analysis.hex}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* IPv4-to-IPv6 Translations */}
              {analysis.version === 4 && analysis.ipv6Translations && (
                <div className="bg-gray-900 border border-green-600 p-4">
                  <div className="text-green-500 text-sm mb-2">## IPv6 REPRESENTATIONS ##</div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-green-600">IPv4-Mapped:</span>
                      <div className="text-green-400 ml-4">
                        {analysis.ipv6Translations.mappedCanonical}
                        <a href={rfcLink(4291, 'section-2.5.5.2')} target="_blank" rel="noopener noreferrer" className="text-green-600 ml-2 hover:text-green-400">
                          [RFC 4291 §2.5.5.2] <ExternalLink size={10} className="inline" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600">IPv4-Compatible:</span>
                      <div className="text-green-400 ml-4">
                        {analysis.ipv6Translations.compatibleCanonical}
                        <a href={rfcLink(4291, 'section-2.5.5.1')} target="_blank" rel="noopener noreferrer" className="text-green-600 ml-2 hover:text-green-400">
                          [RFC 4291 §2.5.5.1 - Deprecated] <ExternalLink size={10} className="inline" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600">6to4:</span>
                      <div className="text-green-400 ml-4">
                        {analysis.ipv6Translations.sixToFour}
                        <a href={rfcLink(3056)} target="_blank" rel="noopener noreferrer" className="text-green-600 ml-2 hover:text-green-400">
                          [RFC 3056] <ExternalLink size={10} className="inline" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600">Well-Known Prefix:</span>
                      <div className="text-green-400 ml-4">
                        {analysis.ipv6Translations.wellKnownCanonical}
                        <a href={rfcLink(6052)} target="_blank" rel="noopener noreferrer" className="text-green-600 ml-2 hover:text-green-400">
                          [RFC 6052] <ExternalLink size={10} className="inline" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MAC Address / Embedded IPv4 Info */}
              {(analysis.macAddress || analysis.embeddedIPv4) && (
                <div className="bg-gray-900 border border-green-600 p-4">
                  <div className="text-green-500 text-sm mb-2">## EMBEDDED DATA ##</div>
                  {analysis.macAddress && (
                    <div className="text-xs">
                      <span className="text-green-600">MAC Address:</span>
                      <div className="text-green-400 ml-4">{analysis.macAddress}</div>
                      <div className="text-green-600 ml-4 text-xs mt-1">
                        Derived using Modified EUI-64 format
                      </div>
                    </div>
                  )}
                  {analysis.embeddedIPv4 && (
                    <div className="text-xs mt-2">
                      <span className="text-green-600">Embedded IPv4:</span>
                      <div className="text-green-400 ml-4">{analysis.embeddedIPv4}</div>
                    </div>
                  )}
                </div>
              )}

              {/* RFC References */}
              {analysis.rfcs && analysis.rfcs.length > 0 && (
                <div className="bg-gray-900 border border-green-600 p-4">
                  <div className="text-green-500 text-sm mb-2">## STANDARDS REFERENCES ##</div>
                  {analysis.rfcs.map((rfc, i) => (
                    <div key={i} className="text-green-400 text-xs flex items-center">
                      <span className="mr-2">&gt;</span>
                      <a 
                        href={rfcLink(rfc.number, rfc.section)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-green-300 flex items-center gap-1 break-all"
                      >
                        <span>RFC {rfc.number}: {rfc.text}</span>
                        <ExternalLink size={10} className="flex-shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="bg-gray-900 border border-green-600 p-4">
                <div className="text-green-500 text-sm mb-2">## TECHNICAL DETAILS ##</div>
                {analysis.details.map((detail, i) => (
                  <div key={i} className="text-green-400 text-xs">
                    &gt; {detail}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setInput('');
                    setIsExpanded(false);
                    setAnalysis(null);
                    inputRef.current?.focus();
                  }}
                  className="text-green-600 hover:text-green-400 text-sm"
                >
                  [ New Query ]
                </button>
                <button
                  onClick={() => {
                    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
                    setInput(random.ip);
                  }}
                  className="text-green-600 hover:text-green-400 text-sm"
                >
                  [ Random ]
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {!analysis && input && isExpanded && (
            <div className="bg-gray-900 border border-red-600 p-4 text-center">
              <div className="text-red-400">ERROR: Invalid IP address format</div>
              <button
                onClick={() => {
                  setInput('');
                  setIsExpanded(false);
                }}
                className="text-red-600 hover:text-red-400 text-sm mt-2"
              >
                [ Clear ]
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-green-800 px-2 sm:px-4 py-1 text-xs text-green-600">
        <div className="flex justify-between items-center">
          <span className="hidden sm:inline">Cache: {cache.size} entries</span>
          <span className="sm:hidden">{cache.size}</span>
          <a 
            href="https://rotko.net" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-400 transition-colors"
          >
            <span className="hidden sm:inline">💕 rotko.net</span>
            <span className="sm:hidden">💕 rotko.net</span>
          </a>
          <a 
            href="https://github.com/rotkonetworks/ip6.wtf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-400 transition-colors flex items-center gap-1"
          >
            <span className="hidden sm:inline">src</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default IPAnalyzer;
