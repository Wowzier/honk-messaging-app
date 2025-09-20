'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Progress component (simple implementation)
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`bg-gray-200 rounded-full overflow-hidden ${className}`}>
    <div 
      className="bg-blue-500 h-full transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
import { clientFlightEngine } from '@/services/clientFlightEngine';

import { LocationData, FlightProgress, WeatherEvent } from '@/types';

interface FlightTrackerProps {
  messageId?: string;
  startLocation?: LocationData;
  endLocation?: LocationData;
  className?: string;
}

const DEMO_ROUTES = {
  'NYC → London': {
    start: {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    },
    end: {
      latitude: 51.5074,
      longitude: -0.1278,
      state: 'London',
      country: 'United Kingdom',
      is_anonymous: false
    }
  },
  'Tokyo → Sydney': {
    start: {
      latitude: 35.6762,
      longitude: 139.6503,
      state: 'Tokyo',
      country: 'Japan',
      is_anonymous: false
    },
    end: {
      latitude: -33.8688,
      longitude: 151.2093,
      state: 'New South Wales',
      country: 'Australia',
      is_anonymous: false
    }
  },
  'London → NYC': {
    start: {
      latitude: 51.5074,
      longitude: -0.1278,
      state: 'London',
      country: 'United Kingdom',
      is_anonymous: false
    },
    end: {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    }
  }
};

export function FlightTracker({ 
  messageId, 
  startLocation, 
  endLocation, 
  className = '' 
}: FlightTrackerProps) {
  const [flightProgress, setFlightProgress] = useState<FlightProgress | null>(null);
  const [isFlightActive, setIsFlightActive] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>('NYC → London');
  const [flightId, setFlightId] = useState<string>('');
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);

  const startDemoFlight = async (routeName: string) => {
    const route = DEMO_ROUTES[routeName as keyof typeof DEMO_ROUTES];
    const demoFlightId = `demo-flight-${Date.now()}`;
    
    setFlightId(demoFlightId);
    setIsFlightActive(true);
    setFlightProgress(null);
    setWeatherEvents([]);

    try {
      // Register progress callback
      clientFlightEngine.onFlightProgress(demoFlightId, (progress) => {
        setFlightProgress(progress);
        
        // Collect weather events
        if (progress.current_weather) {
          setWeatherEvents(prev => {
            const exists = prev.some(w => 
              w.timestamp.getTime() === progress.current_weather!.timestamp.getTime()
            );
            if (!exists) {
              return [...prev, progress.current_weather!];
            }
            return prev;
          });
        }
      });

      // Initialize flight
      const flight = await clientFlightEngine.initializeFlight(
        demoFlightId,
        route.start,
        route.end
      );

      if (!flight) {
        throw new Error('Failed to initialize flight');
      }

      console.log('Demo flight started:', flight);
    } catch (error) {
      console.error('Failed to start demo flight:', error);
      setIsFlightActive(false);
    }
  };

  const stopDemoFlight = () => {
    if (flightId) {
      clientFlightEngine.cancelFlight(flightId);
      clientFlightEngine.removeFlightCallback(flightId);
    }
    setIsFlightActive(false);
    setFlightProgress(null);
    setFlightId('');
    setWeatherEvents([]);
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getWeatherIcon = (type: string): string => {
    switch (type) {
      case 'clear': return '☀️';
      case 'rain': return '🌧️';
      case 'storm': return '⛈️';
      case 'wind': return '💨';
      default: return '🌤️';
    }
  };

  const getWeatherSummary = (weather: WeatherEvent): string => {
    const intensity = Math.round(weather.intensity * 100);
    switch (weather.type) {
      case 'clear': return 'Clear skies';
      case 'rain': return `Light to moderate rain (${intensity}% intensity)`;
      case 'storm': return `Thunderstorm (${intensity}% intensity)`;
      case 'wind': return `Windy conditions (${intensity}% intensity)`;
      default: return `${weather.type} (${intensity}% intensity)`;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flightId) {
        clientFlightEngine.cancelFlight(flightId);
        clientFlightEngine.removeFlightCallback(flightId);
      }
    };
  }, [flightId]);

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🦆 Duck Flight Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Selector */}
        {!isFlightActive && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Select Demo Route:</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(DEMO_ROUTES).map((route) => (
                <Button
                  key={route}
                  variant={selectedRoute === route ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRoute(route)}
                >
                  {route}
                </Button>
              ))}
            </div>
            <Button 
              onClick={() => startDemoFlight(selectedRoute)}
              className="w-full"
            >
              🚀 Start Demo Flight
            </Button>
          </div>
        )}

        {/* Active Flight Display */}
        {isFlightActive && (
          <div className="space-y-4">
            {/* Flight Progress */}
            {flightProgress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Flight Progress</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopDemoFlight}
                  >
                    Cancel Flight
                  </Button>
                </div>
                
                <Progress 
                  value={flightProgress.progress_percentage} 
                  className="w-full h-3"
                />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Progress</div>
                    <div className="font-semibold">
                      {flightProgress.progress_percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">ETA</div>
                    <div className="font-semibold">
                      {formatDuration(
                        new Date(flightProgress.estimated_arrival).getTime() - Date.now()
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Position */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Current Position</div>
                  <div className="text-xs text-gray-600">
                    {flightProgress.current_position.latitude.toFixed(4)}, {' '}
                    {flightProgress.current_position.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Current Weather */}
                {flightProgress.current_weather && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {getWeatherIcon(flightProgress.current_weather.type)}
                      </span>
                      <span className="font-medium">Current Weather</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        Condition: {getWeatherSummary(flightProgress.current_weather)}
                      </div>
                      <div>
                        Speed Effect: {Math.round((flightProgress.current_weather.speed_modifier - 1) * 100)}%
                      </div>
                      <div>
                        Intensity: {Math.round(flightProgress.current_weather.intensity * 100)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <span className="ml-2">Initializing flight...</span>
              </div>
            )}

            {/* Weather Events Log */}
            {weatherEvents.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Weather Events</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {weatherEvents.slice(-5).map((event, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-100 rounded">
                      <span className="mr-2">{getWeatherIcon(event.type)}</span>
                      {weatherService.getWeatherSummary(event)} - 
                      Speed: {Math.round((event.speed_modifier - 1) * 100)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          💡 This demo shows how weather conditions affect duck flight speed in real-time. 
          Different weather types will change the flight speed and may trigger route recalculations.
        </div>
      </CardContent>
    </Card>
  );
}