// IPAnalyzer.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { TerminalHeader, SiteFooter, TerminalButton, LinkButton, rfcLink } from './shared';
import { analyzeIPv4, analyzeIPv6, ipv4Regex, ipv6Regex } from './ipAnalysis';
import { suggestions, suggestionCategories } from './suggestions';

const IPAnalyzer = () => {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [showBinary, setShowBinary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const cache = useMemo(() => new Map(), []);
  const inputRef = useRef(null);

  useEffect(() => {
    const path = window.location.pathname.substring(1);
    if (path && (ipv4Regex.test(path) || ipv6Regex.test(path) || path.includes('::'))) {
      setInput(decodeURIComponent(path));
    }
  }, []);

  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.cat === selectedCategory);
    }
    
    const trimmed = input.trim().toLowerCase();
    if (trimmed.length > 0) {
      filtered = filtered.filter(s => 
        s.ip.toLowerCase().includes(trimmed) ||
        s.desc.toLowerCase().includes(trimmed)
      );
    }
    
    return filtered;
  }, [input, selectedCategory]);

  useEffect(() => {
    if (input) {
      const trimmed = input.trim();
      if (ipv4Regex.test(trimmed)) {
        setAnalysis(analyzeIPv4(trimmed, cache));
        setIsExpanded(true);
        setShowSuggestions(false);
      } else if (ipv6Regex.test(trimmed) || trimmed.includes('::')) {
        setAnalysis(analyzeIPv6(trimmed, cache));
        setIsExpanded(true);
        setShowSuggestions(false);
      } else {
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
      setIsExpanded(false);
    }
  }, [input, cache]);

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion.ip);
    setShowSuggestions(false);
  };

  const resetAnalysis = () => {
    setInput('');
    setIsExpanded(false);
    setAnalysis(null);
    inputRef.current?.focus();
  };

  const randomAddress = () => {
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    setInput(random.ip);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <TerminalHeader title="analyzer" />

      <div className={`transition-all duration-500 ${isExpanded ? 'pt-4 sm:pt-8' : 'pt-16 sm:pt-32'}`}>
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          {/* Logo */}
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
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setInput('');
                    setShowSuggestions(true);
                  }}
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
                    if (selectedCategory !== 'all' || input.trim().length > 0 || filteredSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Enter IP address..."
                  className="flex-1 bg-transparent px-4 py-3 text-green-400 placeholder-green-700 focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                
                <button
                  onClick={() => analysis && setIsExpanded(true)}
                  className="px-6 py-3 text-green-400 hover:bg-green-900 transition-colors border-t sm:border-t-0 sm:border-l border-green-600"
                >
                  ANALYZE
                </button>
              </div>

              {/* Suggestions */}
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
            <div className="text-center space-x-4">
              <TerminalButton onClick={randomAddress}>[ Try Random Address ]</TerminalButton>
                              <LinkButton to="/learn">[ Learn IPv6 ]</LinkButton>
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

              {/* Embedded Data */}
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

              {/* Technical Details */}
              <div className="bg-gray-900 border border-green-600 p-4">
                <div className="text-green-500 text-sm mb-2">## TECHNICAL DETAILS ##</div>
                {analysis.details.map((detail, i) => (
                  <div key={i} className="text-green-400 text-xs">
                    &gt; {detail}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center pb-8">
                <TerminalButton onClick={resetAnalysis}>[ New Query ]</TerminalButton>
                <TerminalButton onClick={randomAddress}>[ Random ]</TerminalButton>
                <LinkButton to="/learn">[ Learn ]</LinkButton>
              </div>
            </div>
          )}

          {/* Error State */}
          {!analysis && input && isExpanded && (
            <div className="bg-gray-900 border border-red-600 p-4 text-center">
              <div className="text-red-400">ERROR: Invalid IP address format</div>
              <TerminalButton onClick={resetAnalysis} className="text-red-600 hover:text-red-400 mt-2">
                [ Clear ]
              </TerminalButton>
            </div>
          )}
        </div>
      </div>

      <SiteFooter showCache={true} cacheSize={cache.size} />
    </div>
  );
};

export default IPAnalyzer;
