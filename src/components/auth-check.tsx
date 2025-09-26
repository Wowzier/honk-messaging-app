"use client";

import { useEffect, useState } from 'react';

interface User {
  email: string;
  username: string;
}

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is logged in, show logged in state
  if (user) {
    return (
      <main className="p-inset h-[100dvh] w-full">
        <div className="relative h-full w-full flex items-center justify-center">
          <div className="text-center max-w-2xl p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <h1 className="font-serif text-6xl italic text-white mb-6">Welcome to Honk!</h1>
            <p className="text-xl text-white/80 mb-8">
              Hello, <span className="text-white font-semibold">{user.username}</span>! 
              You're successfully logged in.
            </p>
            <p className="text-white/70 mb-8">
              This is where your duck courier dashboard would be. For now, enjoy this beautiful welcome screen!
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                window.location.reload();
              }}
              className="px-8 py-3 bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full shadow-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    );
  }

  // If not logged in, show the auth form
  return <>{children}</>;
}