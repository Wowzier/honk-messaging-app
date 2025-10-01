'use client';

import React from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserProfileForm } from '@/components/forms/UserProfileForm';

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();

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
    return null; // useRequireAuth will redirect to the home screen for a fresh courier ID
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.username}! 🦆
          </h1>
          <p className="text-gray-600">Manage your aviator profile</p>
        </div>
        
        <UserProfileForm />
      </div>
    </div>
  );
}