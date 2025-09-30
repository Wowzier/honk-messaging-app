'use client';

import React from 'react';
import { InboxCarousel } from '@/components/messaging/InboxCarousel';
import { useAuth } from '@/hooks/useAuth';

export default function InboxPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-journal-paper to-journal-paper-alt">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">📬</div>
          <div className="text-2xl font-bold text-gray-700">Getting your workspace ready...</div>
        </div>
      </div>
    );
  }

  return <InboxCarousel />;
}