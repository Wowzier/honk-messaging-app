// src/components/FileRouter.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Page {
  name: string;
  path: string;
}

const pages: Page[] = [
  { name: 'Home', path: '/' },
  { name: 'Home', path: '/home' },
  { name: 'Compose', path: '/compose' },
  { name: 'Conversations', path: '/conversations' },
  { name: 'Demo', path: '/demo' },
  { name: 'Inbox', path: '/inbox' },
  { name: 'Login', path: '/login' },
  { name: 'Postcard', path: '/postcard' },
  { name: 'Profile', path: '/profile' },
  { name: 'Ranking', path: '/ranking' },
  { name: 'Register', path: '/register' },
  { name: 'Reply', path: '/reply' },
  { name: 'Weather Demo', path: '/weather-demo' },
  { name: 'Weather Search', path: '/weather-search' },
  { name: 'Websocket Demo', path: '/websocket-demo' },
];

interface FileRouterProps {
  children: React.ReactNode;
}

export default function FileRouter({ children }: FileRouterProps) {
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pages.some(page => page.path === pathname)) {
      setError(`Page not found: ${pathname}`);
    } else {
      setError(null);
    }
  }, [pathname]);

  return (
    <>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {children}
    </>
  );
}