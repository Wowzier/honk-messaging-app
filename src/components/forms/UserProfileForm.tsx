'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function UserProfileForm() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    location_sharing_preference: 'state',
    opt_out_random: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username,
        location_sharing_preference: user.location_sharing_preference,
        opt_out_random: user.opt_out_random,
        current_location: user.current_location
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile(profile);
      
      if (result) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000); // Hide success message after 3 seconds
      } else {
        setError('Failed to update profile. Username might already be taken.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UserProfile) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProfile(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleLocationPreferenceChange = (value: 'state' | 'country' | 'anonymous') => {
    setProfile(prev => ({
      ...prev,
      location_sharing_preference: value
    }));
  };

  const handleOptOutChange = (checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      opt_out_random: checked
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={profile.username}
                onChange={handleChange('username')}
                placeholder="your_username"
                required
                disabled={loading}
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                title="Username can only contain letters, numbers, underscores, and hyphens"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationPreference">Location Sharing Preference</Label>
              <Select
                value={profile.location_sharing_preference}
                onValueChange={handleLocationPreferenceChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose location sharing preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="state">Share State/Province</SelectItem>
                  <SelectItem value="country">Share Country Only</SelectItem>
                  <SelectItem value="anonymous">Anonymous Location</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This controls how much location information others can see when you send messages
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="optOutRandom">Opt out of random messages</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, you won&apos;t receive random messages from other users
                </p>
              </div>
              <Switch
                id="optOutRandom"
                checked={profile.opt_out_random}
                onCheckedChange={handleOptOutChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Aviator Stats</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Current Rank</p>
                <p className="font-medium">{user.current_rank}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Journey Points</p>
                <p className="font-medium">{user.total_journey_points.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}