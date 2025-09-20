'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { User } from '@/types';

interface LeaderboardEntry {
  rank: number;
  user: Pick<User, 'id' | 'username' | 'total_journey_points' | 'current_rank' | 'countries_visited' | 'states_visited'>;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  total_shown: number;
  limit: number;
}

interface LeaderboardProps {
  limit?: number;
  currentUserId?: string;
}

export function Leaderboard({ limit = 10, currentUserId }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/leaderboard?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-500">#{rank}</span>;
    }
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

  const getEntryBackground = (entry: LeaderboardEntry) => {
    if (entry.user.id === currentUserId) {
      return 'bg-blue-50 border-blue-200 border-2';
    }
    if (entry.rank <= 3) {
      return 'bg-gradient-to-r from-yellow-50 to-orange-50';
    }
    return 'bg-gray-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Top {data.total_shown} aviators by journey points
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.leaderboard.map((entry) => (
            <div
              key={entry.user.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${getEntryBackground(entry)}`}
            >
              {/* Rank Icon */}
              <div className="flex-shrink-0">
                {getRankIcon(entry.rank)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {entry.user.username}
                    {entry.user.id === currentUserId && (
                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                    )}
                  </p>
                  <Badge 
                    className={getRankColor(entry.user.current_rank)} 
                    variant="secondary"
                  >
                    {entry.user.current_rank}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{entry.user.countries_visited.length} countries</span>
                  <span>{entry.user.states_visited.length} states</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatNumber(entry.user.total_journey_points)}
                </p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          ))}
        </div>

        {data.leaderboard.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No aviators on the leaderboard yet.</p>
            <p className="text-sm">Be the first to send a message!</p>
          </div>
        )}

        {data.total_shown >= data.limit && (
          <div className="text-center mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Showing top {data.limit} aviators
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Leaderboard;