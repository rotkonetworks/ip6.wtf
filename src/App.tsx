// App.tsx with Hash-based routing for GitHub Pages
import React, { useEffect, useState } from 'react';
import IPAnalyzer from "./IPAnalyzer";
import Learn from "./Learn";

export function App() {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const getHashPath = () => {
      const hash = window.location.hash.slice(1); // Remove #
      return hash || '/';
    };

    // Set initial path
    setCurrentPath(getHashPath());

    // Listen for hash changes
    const handleHashChange = () => {
      setCurrentPath(getHashPath());
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Don't render until we have the path
  if (!currentPath) return null;

  return currentPath.startsWith('/learn') ? <Learn /> : <IPAnalyzer />;
}

export default App;
