'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, MapPin, Plane, Award } from 'lucide-react';
import { User, AviatorRankDefinition, UserReward } from '@/types';

interface UserStatsData {
  user: User;
  current_rank: AviatorRankDefinition;
  next_rank?: AviatorRankDefinition;
  progress_to_next: number;
  points_needed: number;
  achievements: UserReward[];
}

interface UserStatsProps {
  userId: string;
}

export function UserStats({ userId }: UserStatsProps) {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}/stats`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user statistics');
        }

        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getRankColor = (rankName: string) => {
    const colors: Record<string, string> = {
      'Fledgling Courier': 'bg-gray-100 text-gray-800',
      'Novice Navigator': 'bg-blue-100 text-blue-800',
      'Skilled Skywriter': 'bg-green-100 text-green-800',
      'Veteran Voyager': 'bg-purple-100 text-purple-800',
      'Master Messenger': 'bg-orange-100 text-orange-800',
      'Elite Explorer': 'bg-red-100 text-red-800',
      'Legendary Aviator': 'bg-yellow-100 text-yellow-800'
    };
    return colors[rankName] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Current Rank and Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Aviator Rank
          </CardTitle>
          <CardDescription>Your current rank and progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={getRankColor(stats.current_rank.name)} variant="secondary">
              {stats.current_rank.name}
            </Badge>
            <span className="text-sm text-gray-600">
              {formatNumber(stats.user.total_journey_points)} Journey Points
            </span>
          </div>

          {stats.next_rank && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {stats.next_rank.name}</span>
                <span>{stats.progress_to_next.toFixed(1)}%</span>
              </div>
              <Progress value={stats.progress_to_next} className="h-2" />
              <p className="text-xs text-gray-500">
                {formatNumber(stats.points_needed)} more points needed
              </p>
            </div>
          )}

          {!stats.next_rank && (
            <div className="text-center py-4">
              <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">
                Maximum Rank Achieved! 🎉
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Flights Sent</p>
                <p className="text-lg font-semibold">{formatNumber(stats.user.total_flights_sent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Distance Traveled</p>
                <p className="text-lg font-semibold">
                  {formatNumber(Math.round(stats.user.total_distance_traveled))} km
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Countries Visited</p>
                <p className="text-lg font-semibold">{stats.user.countries_visited.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Visited */}
      <Card>
        <CardHeader>
          <CardTitle>Locations Visited</CardTitle>
          <CardDescription>Countries and states you've reached</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Countries ({stats.user.countries_visited.length})</h4>
              <div className="flex flex-wrap gap-1">
                {stats.user.countries_visited.length > 0 ? (
                  stats.user.countries_visited.map((country) => (
                    <Badge key={country} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No countries visited yet</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">States/Regions ({stats.user.states_visited.length})</h4>
              <div className="flex flex-wrap gap-1">
                {stats.user.states_visited.length > 0 ? (
                  stats.user.states_visited.map((state) => (
                    <Badge key={state} variant="outline" className="text-xs">
                      {state}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No states/regions visited yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements and Rewards */}
      {stats.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Rewards unlocked through your journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium capitalize">
                      {achievement.reward_id.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {achievement.reward_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Rank Rewards */}
      {stats.current_rank.rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Rank Benefits</CardTitle>
            <CardDescription>Features unlocked at your current rank</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.current_rank.rewards.map((reward) => (
                <Badge key={reward} variant="outline" className="justify-center p-2">
                  {reward.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserStats;