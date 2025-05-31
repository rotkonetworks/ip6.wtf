// shared.tsx - Common components and utilities

import React from 'react';
import { Terminal, FileText } from 'lucide-react';

// Constants
export const SITE_NAME = 'ip6.wtf';
export const SITE_URL = 'https://rotko.net';
export const GITHUB_URL = 'https://github.com/rotkonetworks/ip6.wtf';

// Navigation helper for hash-based routing
export const navigate = (path) => {
  window.location.hash = path;
};

// Terminal Header Component
export const TerminalHeader = ({ title, breadcrumbs = [] }) => {
  const time = new Date().toLocaleString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  return (
    <div className="border-b border-green-800 bg-gray-900 px-2 sm:px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        {title === 'analyzer' ? (
          <Terminal size={14} className="hidden sm:block" />
        ) : (
          <FileText size={14} />
        )}
        <a 
          href="#/" 
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          className="text-green-500 hover:text-green-400 text-xs sm:text-sm"
        >
          {title === 'analyzer' ? `${SITE_NAME} - IPv6 Address Analyzer` : SITE_NAME}
        </a>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span className="text-green-600 mx-1">/</span>
            <span className="text-green-500">{crumb}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="text-gray-500 hidden sm:block">{time}</div>
    </div>
  );
};

// Site Footer Component
export const SiteFooter = ({ leftContent, showCache = false, cacheSize = 0 }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-green-800 px-2 sm:px-4 py-1 text-xs text-green-600">
    <div className="flex justify-between items-center">
      <span className={showCache ? "hidden sm:inline" : ""}>
        {showCache ? `Cache: ${cacheSize} entries` : leftContent}
      </span>
      {showCache && <span className="sm:hidden">{cacheSize}</span>}
      <a 
        href="#/learn" 
        onClick={(e) => { e.preventDefault(); navigate('/learn'); }}
        className="text-green-600 hover:text-green-400 transition-colors"
      >
        [ learn ]
      </a>
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-400 transition-colors">
        <span className="hidden sm:inline">💕 rotko.net</span>
        <span className="sm:hidden">💕</span>
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-400 transition-colors flex items-center gap-1">
        <span className="hidden sm:inline">src</span>
      </a>
    </div>
  </div>
);

// Button Component
export const TerminalButton = ({ onClick, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`text-green-600 hover:text-green-400 text-sm ${className}`}
  >
    {children}
  </button>
);

// Link Button Component for navigation
export const LinkButton = ({ to, children, className = "" }) => (
  <a
    href={`#${to}`}
    onClick={(e) => { e.preventDefault(); navigate(to); }}
    className={`text-green-600 hover:text-green-400 text-sm ${className}`}
  >
    {children}
  </a>
);

// Markdown Parser - custom implementation
export const parseMarkdown = (text) => {
  let html = text;
  const codeBlocks = [];
  const inlineCode = [];
  
  // Step 1: Extract code blocks to protect them
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang, code: code.trim() });
    return `__CODE_BLOCK_${index}__`;
  });
  
  // Step 2: Extract inline code
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCode.length;
    inlineCode.push(code);
    return `__INLINE_CODE_${index}__`;
  });
  
  // Step 3: Process markdown elements
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip code block placeholders
    if (line.trim().match(/^__CODE_BLOCK_\d+__$/)) {
      if (inList) {
        inList = false;
      }
      processedLines.push(line);
      continue;
    }
    
    // Headers
    if (line.match(/^#{1,6}\s/)) {
      if (inList) inList = false;
      const level = line.match(/^(#+)/)[1].length;
      const text = line.replace(/^#+\s+/, '');
      const sizes = {
        1: 'text-2xl mt-8 mb-4',
        2: 'text-xl mt-8 mb-3',
        3: 'text-lg mt-6 mb-2',
        4: 'text-md mt-4 mb-2',
        5: 'text-sm mt-3 mb-1',
        6: 'text-sm mt-2 mb-1'
      };
      line = `<h${level} class="text-green-400 font-bold ${sizes[level]}">${text}</h${level}>`;
    }
    // Lists
    else if (line.match(/^[\*\-]\s/)) {
      const text = line.replace(/^[\*\-]\s+/, '');
      if (!inList) {
        processedLines.push('<ul class="my-2 ml-4 list-disc text-green-400">');
        inList = true;
      }
      line = `<li class="text-green-400">${text}</li>`;
    }
    // Blockquotes
    else if (line.match(/^>\s/)) {
      if (inList) inList = false;
      const text = line.replace(/^>\s+/, '');
      line = `<blockquote class="border-l-4 border-green-600 pl-4 my-4 text-green-500 italic">${text}</blockquote>`;
    }
    // HR
    else if (line.match(/^[\-\*_]{3,}$/)) {
      if (inList) inList = false;
      line = '<hr class="border-t border-green-600 my-8">';
    }
    // Empty line
    else if (line.trim() === '') {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push('');
      continue;
    }
    // Paragraph
    else if (line.trim() && !line.includes('<')) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      line = `<p class="text-green-400 mb-4 leading-relaxed">${line}</p>`;
    }
    
    // Process inline elements
    line = line
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-green-300">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="text-green-500">$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-500 hover:text-green-400 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    processedLines.push(line);
  }
  
  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  html = processedLines.join('\n');
  
  // Step 4: Restore code blocks
  codeBlocks.forEach((block, i) => {
    const escaped = block.code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const codeHtml = `<pre class="bg-gray-900 border border-green-600 p-4 my-4 overflow-x-auto"><code class="text-green-400 text-xs font-mono">${escaped}</code></pre>`;
    html = html.replace(`__CODE_BLOCK_${i}__`, codeHtml);
  });
  
  // Step 5: Restore inline code
  inlineCode.forEach((code, i) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const codeHtml = `<code class="bg-gray-900 text-green-400 px-1 py-0.5 text-sm font-mono border border-green-800">${escaped}</code>`;
    html = html.replace(`__INLINE_CODE_${i}__`, codeHtml);
  });
  
  return html;
};

// RFC Link Helper
export const rfcLink = (rfcNumber, section = '') => {
  const base = `https://www.rfc-editor.org/rfc/rfc${rfcNumber}.html`;
  return section ? `${base}#${section}` : base;
};
