'use client';

import React from 'react';
import { Inbox } from '@/components/messaging';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function InboxPage() {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect to the home screen for a fresh courier ID
  }

  return <Inbox />;
}