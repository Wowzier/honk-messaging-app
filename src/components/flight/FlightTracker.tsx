'use client';

import React, { useEffect, useState } from 'react';
import { useFlightProgress, useWebSocketStatus } from '@/hooks/useWebSocket';
import { FlightProgress } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plane, 
  MapPin, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Cloud,
  CloudRain,
  Zap,
  Wind
} from 'lucide-react';

interface FlightTrackerProps {
  messageId: string;
  userId?: string;
  onDelivered?: (progress: FlightProgress) => void;
  showConnectionStatus?: boolean;
}

/**
 * Real-time flight tracker component
 */
export function FlightTracker({ 
  messageId, 
  userId, 
  onDelivered,
  showConnectionStatus = true 
}: FlightTrackerProps) {
  const { progress, isDelivered, error, isSubscribed, refresh } = useFlightProgress(messageId, userId);
  const { status, reconnect, isConnected } = useWebSocketStatus();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Update last update time when progress changes
  useEffect(() => {
    if (progress) {
      setLastUpdate(new Date());
    }
  }, [progress]);

  // Call onDelivered callback when flight is delivered
  useEffect(() => {
    if (isDelivered && progress && onDelivered) {
      onDelivered(progress);
    }
  }, [isDelivered, progress, onDelivered]);

  // Get weather icon based on weather type
  const getWeatherIcon = (weatherType: string) => {
    switch (weatherType) {
      case 'storm':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'rain':
        return <CloudRain className="h-4 w-4 text-blue-500" />;
      case 'wind':
        return <Wind className="h-4 w-4 text-gray-500" />;
      case 'clear':
      default:
        return <Cloud className="h-4 w-4 text-gray-400" />;
    }
  };

  // Format estimated arrival time
  const formatEstimatedArrival = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Arriving now';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Format coordinates for display
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  };

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <WifiOff className="h-5 w-5" />
            Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 animate-pulse" />
            Loading Flight Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className={`h-5 w-5 ${isDelivered ? 'text-green-600' : 'text-blue-600'}`} />
            {isDelivered ? 'Message Delivered!' : 'Duck in Flight'}
          </div>
          {showConnectionStatus && (
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{Math.round(progress.progress_percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                isDelivered ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>

        {/* Current Location */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Current Position</p>
            <p className="text-xs text-gray-600 truncate">
              {formatCoordinates(progress.current_position.latitude, progress.current_position.longitude)}
            </p>
            {progress.current_position.country && (
              <p className="text-xs text-gray-500">
                {progress.current_position.state && `${progress.current_position.state}, `}
                {progress.current_position.country}
              </p>
            )}
          </div>
        </div>

        {/* Estimated Arrival */}
        {!isDelivered && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Estimated Arrival</p>
              <p className="text-xs text-gray-600">
                {formatEstimatedArrival(progress.estimated_arrival)}
              </p>
            </div>
          </div>
        )}

        {/* Weather Conditions */}
        {progress.current_weather && (
          <div className="flex items-center gap-2">
            {getWeatherIcon(progress.current_weather.type)}
            <div>
              <p className="text-sm font-medium">Weather</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-600 capitalize">
                  {progress.current_weather.type}
                </p>
                <Badge 
                  variant={progress.current_weather.speed_modifier < 1 ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {progress.current_weather.speed_modifier < 1 ? 'Slowing' : 
                   progress.current_weather.speed_modifier > 1 ? 'Boosting' : 'Normal'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isSubscribed && isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {isSubscribed && isConnected ? 'Live updates' : 'Offline'}
          </div>
          {lastUpdate && (
            <span>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Reconnect Button */}
        {!isConnected && (
          <Button 
            onClick={reconnect} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconnect
          </Button>
        )}

        {/* Delivery Status */}
        {isDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800">
              🎉 Your message has been delivered successfully!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Delivered at {progress.estimated_arrival.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FlightTracker;