'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RegisterCredentials } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function RegisterForm({ onSuccess, redirectTo = '/' }: RegisterFormProps) {
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: '',
    username: '',
    password: '',
    location_sharing_preference: 'state'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password confirmation
    if (credentials.password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await register(credentials);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectTo);
        }
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleLocationPreferenceChange = (value: 'state' | 'country' | 'anonymous') => {
    setCredentials(prev => ({
      ...prev,
      location_sharing_preference: value
    }));
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Join Honk!</h2>
        <p className="text-white/70">
          Create your account to start sending messages with duck couriers
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-2xl p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <label htmlFor="email" className="block text-sm font-medium text-white/90">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={credentials.email}
            onChange={handleChange('email')}
            placeholder="your@email.com"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="username" className="block text-sm font-medium text-white/90">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={credentials.username}
            onChange={handleChange('username')}
            placeholder="your_username"
            required
            disabled={loading}
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, underscores, and hyphens"
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="password" className="block text-sm font-medium text-white/90">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={credentials.password}
            onChange={handleChange('password')}
            placeholder="Your password"
            required
            disabled={loading}
            minLength={8}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
          />
          <p className="text-sm text-white/60">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-white/90">
            Location Sharing Preference
          </label>
          <select
            value={credentials.location_sharing_preference}
            onChange={(e) => handleLocationPreferenceChange(e.target.value as 'state' | 'country' | 'anonymous')}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
          >
            <option value="state" className="bg-gray-800 text-white">Share State/Province</option>
            <option value="country" className="bg-gray-800 text-white">Share Country Only</option>
            <option value="anonymous" className="bg-gray-800 text-white">Anonymous Location</option>
          </select>
          <p className="text-sm text-white/60">
            This controls how much location information others can see when you send messages
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-semibold text-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}