'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ComposeHonkExample } from '@/components/messaging/ComposeHonkExample';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ComposePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to compose a message</h1>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">🦆 Compose Honk</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user.username}!</span>
            <Link href="/profile">
              <Button variant="outline">Profile</Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <ComposeHonkExample />
        </main>
      </div>
    </div>
  );
}