// Learn.tsx
import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { TerminalHeader, SiteFooter, parseMarkdown, TerminalButton, LinkButton, navigate } from './shared';

const articles = [
  { slug: 'ipv6', title: 'IPv6', file: 'ipv6.md' },
  { slug: 'notation', title: 'Notation', file: 'notation.md' },
  { slug: 'icmpv6', title: 'ICMPv6', file: 'icmpv6.md' },
  { slug: 'addrgen', title: 'Address Generation', file: 'addrgen.md' },
  { slug: 'ndp', title: 'NDP', file: 'ndp.md' },
  { slug: 'subnetting', title: 'Subnetting', file: 'subnetting.md' },
  { slug: 'routing', title: 'Routing', file: 'routing.md' }
];

const Learn = () => {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkHashForArticle = () => {
      const hash = window.location.hash.slice(1); // Remove #
      const path = hash.replace('/learn/', '').replace('/learn', '');
      if (path && path !== '' && path !== '/') {
        const article = articles.find(a => a.slug === path);
        if (article) setSelectedArticle(article);
      }
    };

    checkHashForArticle();
    
    // Listen for hash changes
    const handleHashChange = () => checkHashForArticle();
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      loadArticle(selectedArticle);
      navigate(`/learn/${selectedArticle.slug}`);
    } else {
      navigate('/learn');
    }
  }, [selectedArticle]);

  const loadArticle = async (article) => {
    setLoading(true);
    try {
      const response = await fetch(`/articles/ipv6/${article.file}`);
      const text = await response.text();
      setContent(text);
    } catch (err) {
      setContent(`# ${article.title}\n\nError loading content.`);
    }
    setLoading(false);
  };

  const resetView = () => {
    setSelectedArticle(null);
    setContent('');
  };

  const navigateToArticle = (direction) => {
    const currentIndex = articles.findIndex(a => a.slug === selectedArticle.slug);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < articles.length) {
      setSelectedArticle(articles[newIndex]);
    }
  };

  const breadcrumbs = ['learn'];
  if (selectedArticle) breadcrumbs.push(selectedArticle.slug);

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <TerminalHeader title="learn" breadcrumbs={breadcrumbs} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!selectedArticle ? (
          <>
            <h1 className="text-3xl font-bold text-green-400 mb-2">## IPv6 Documentation</h1>
            <p className="text-green-600 mb-8">Technical articles and references</p>

            <div className="space-y-2">
              {articles.map((article, i) => (
                <div
                  key={article.slug}
                  onClick={() => setSelectedArticle(article)}
                  className="bg-gray-900 border border-green-600 p-4 hover:border-green-400 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">[{String(i + 1).padStart(2, '0')}]</span>
                      <h2 className="text-green-400 font-bold group-hover:text-green-300">{article.title}</h2>
                    </div>
                    <ChevronRight size={16} className="text-green-600 group-hover:text-green-400" />
                  </div>
                  <div className="text-green-600 text-xs mt-1 ml-12">{article.file}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <LinkButton to="/">
                [ Back to Analyzer ]
              </LinkButton>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <TerminalButton onClick={resetView} className="flex items-center gap-1">
                <ChevronRight size={14} className="rotate-180" />
                [ Back to Articles ]
              </TerminalButton>
            </div>

            {loading && <div className="text-green-400 text-center py-8">Loading article...</div>}

            {!loading && content && (
              <article
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
              />
            )}

            <div className="mt-12 pt-8 border-t border-green-800 flex justify-between items-center">
              <TerminalButton onClick={resetView}>[ Back to Articles ]</TerminalButton>

              <div className="flex gap-4">
                {selectedArticle && articles.findIndex(a => a.slug === selectedArticle.slug) > 0 && (
                  <TerminalButton onClick={() => navigateToArticle(-1)}>[ ← Previous ]</TerminalButton>
                )}
                {selectedArticle && articles.findIndex(a => a.slug === selectedArticle.slug) < articles.length - 1 && (
                  <TerminalButton onClick={() => navigateToArticle(1)}>[ Next → ]</TerminalButton>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <SiteFooter 
        leftContent={selectedArticle ? `Reading: ${selectedArticle.title}` : `${articles.length} articles`}
      />
    </div>
  );
};

export default Learn;
