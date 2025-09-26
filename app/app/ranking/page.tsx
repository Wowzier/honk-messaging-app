import React from 'react';
import { UserStats, Leaderboard } from '@/components/ranking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target } from 'lucide-react';
import { AVIATOR_RANKS, BONUS_CONFIG } from '@/services/ranking';

export default function RankingPage() {
  // For demo purposes, using a mock user ID
  const mockUserId = 'demo-user-1';

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Aviator Rankings</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Track your journey across the skies, earn points for every kilometer traveled, 
          and advance through the aviator ranks as you send messages around the world.
        </p>
      </div>

      {/* Ranking System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            How Journey Points Work
          </CardTitle>
          <CardDescription>
            Earn points for every message delivery and unlock new ranks and rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{BONUS_CONFIG.BASE_POINTS_PER_KM}</div>
              <div className="text-sm text-gray-600">Point per kilometer</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+{Math.round(BONUS_CONFIG.WEATHER_BONUS_MULTIPLIER * 100)}%</div>
              <div className="text-sm text-gray-600">Weather bonus</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{BONUS_CONFIG.LONG_DISTANCE_BONUS.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Long distance bonus</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{BONUS_CONFIG.NEW_LOCATION_BONUS}</div>
              <div className="text-sm text-gray-600">New location bonus</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Base Points:</strong> Earn 1 point for every kilometer your duck flies</p>
            <p><strong>Weather Bonus:</strong> Get 25% extra points when flying through storms, rain, or strong winds</p>
            <p><strong>Long Distance Bonus:</strong> Earn 5,000 bonus points for journeys over 10,000km</p>
            <p><strong>New Location Bonus:</strong> Get 500 points for each new country or state you reach</p>
          </div>
        </CardContent>
      </Card>

      {/* Aviator Ranks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Aviator Ranks
          </CardTitle>
          <CardDescription>
            Progress through the ranks and unlock new features and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AVIATOR_RANKS.map((rank, index) => (
              <div key={rank.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{rank.name}</h4>
                    <p className="text-sm text-gray-600">
                      {rank.min_points.toLocaleString()} points
                      {index < AVIATOR_RANKS.length - 1 && 
                        ` - ${(AVIATOR_RANKS[index + 1].min_points - 1).toLocaleString()} points`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rank.rewards.map((reward) => (
                    <Badge key={reward} variant="outline" className="text-xs">
                      {reward.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Stats and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
          <UserStats userId={mockUserId} />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Top Aviators</h2>
          <Leaderboard limit={10} currentUserId={mockUserId} />
        </div>
      </div>

      {/* Tips and Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Earning More Points</CardTitle>
          <CardDescription>
            Maximize your journey points with these strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">🌍 Explore New Places</h4>
              <p className="text-sm text-gray-600">
                Send messages to countries and states you haven't visited before to earn 500 bonus points each.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🌊 Go the Distance</h4>
              <p className="text-sm text-gray-600">
                Long international flights over 10,000km earn a massive 5,000 point bonus on top of base points.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">⛈️ Brave the Weather</h4>
              <p className="text-sm text-gray-600">
                Flying through storms and adverse weather conditions gives you 25% extra points for the journey.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🎯 Consistency Pays</h4>
              <p className="text-sm text-gray-600">
                Regular messaging helps you discover new routes and weather patterns for maximum point earning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}