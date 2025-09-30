'use client';

import React from 'react';
import AnimalCrossingPostcard from '@/components/AnimalCrossingPostcard';
import { useAuth } from '@/hooks/useAuth';

export default function PostcardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📮</div>
          <p className="text-gray-800 text-xl font-medium">Getting your workspace ready...</p>
        </div>
      </div>
    );
  }

  // With seamless auth, user should always exist once loading is complete
  return <AnimalCrossingPostcard />;
}
