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
import { GeolocationService } from '@/services/geolocation';
import { weatherService } from '@/services/weather';
import { getLocationDescription, getDirectionDescription } from '@/utils/location-utils';
import { FlightMap } from './FlightMap';

interface FlightTrackerProps {
  messageId?: string;
  startLocation?: LocationData;
  endLocation?: LocationData;
  className?: string;
}

const DEMO_LOCATIONS = {
  'New York': {
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York',
    country: 'United States',
    is_anonymous: false
  },
  'London': {
    latitude: 51.5074,
    longitude: -0.1278,
    state: 'London',
    country: 'United Kingdom',
    is_anonymous: false
  },
  'Tokyo': {
    latitude: 35.6762,
    longitude: 139.6503,
    state: 'Tokyo',
    country: 'Japan',
    is_anonymous: false
  },
  'Sydney': {
    latitude: -33.8688,
    longitude: 151.2093,
    state: 'New South Wales',
    country: 'Australia',
    is_anonymous: false
  }
};

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
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [destinationCity, setDestinationCity] = useState<string>('London');
  const [flightLogs, setFlightLogs] = useState<Array<{
    timestamp: Date;
    message: string;
    type: 'info' | 'weather' | 'milestone';
  }>>([]);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await GeolocationService.getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.error('Failed to get user location:', error);
        // Fallback to NYC
        setUserLocation(DEMO_LOCATIONS['New York']);
      }
    };

    getUserLocation();
  }, []);

  const startDemoFlight = async () => {
    if (!userLocation) return;
    
    const destination = DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS];
    const demoFlightId = `demo-flight-${Date.now()}`;
    
    try {
      // Initialize flight first
      const flight = await clientFlightEngine.initializeFlight(
        demoFlightId,
        userLocation,
        DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS]
      );

      if (!flight) {
        throw new Error('Failed to initialize flight');
      }

      // Now that we have a valid flight, set up the UI state
      setFlightId(demoFlightId);
      setIsFlightActive(true);
      setFlightProgress({
        message_id: demoFlightId,
        current_position: flight.current_position,
        progress_percentage: flight.progress_percentage,
        estimated_arrival: flight.estimated_arrival,
        current_weather: flight.weather_events[flight.weather_events.length - 1]
      });
      setWeatherEvents(flight.weather_events);
      setFlightLogs([{
        timestamp: new Date(),
        message: `🚀 Starting flight from your location to ${destinationCity}`,
        type: 'info'
      }]);
      
      // Register progress callback
      clientFlightEngine.onFlightProgress(demoFlightId, (progress) => {
        setFlightProgress(progress);
        
        // Add location update to logs
        const locationDesc = getLocationDescription(progress.current_position);
        const destLocation = DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS];
        const directionDesc = getDirectionDescription(progress.current_position, destLocation);
        
        setFlightLogs(prev => [
          ...prev,
          {
            timestamp: new Date(),
            message: `🦆 Your duck is ${locationDesc}, ${directionDesc}`,
            type: 'info'
          }
        ]);

        // Collect weather events
        if (progress.current_weather) {
          setWeatherEvents(prev => {
            const exists = prev.some(w => 
              w.timestamp.getTime() === progress.current_weather!.timestamp.getTime()
            );
            if (!exists) {
              // Add weather event to logs
              setFlightLogs(logs => [
                ...logs,
                {
                  timestamp: new Date(),
                  message: `🌤️ Weather update: ${weatherService.getWeatherSummary(progress.current_weather!)}`,
                  type: 'weather'
                }
              ]);
              return [...prev, progress.current_weather!];
            }
            return prev;
          });
        }

        // Add milestone updates
        if (progress.progress_percentage % 25 === 0) {
          setFlightLogs(logs => [
            ...logs,
            {
              timestamp: new Date(),
              message: `🎯 Flight milestone: ${progress.progress_percentage}% complete!`,
              type: 'milestone'
            }
          ]);
        }
      });

      console.log('Demo flight started:', flight);
    } catch (error) {
      console.error('Failed to start demo flight:', error);
      setIsFlightActive(false);
      setFlightProgress(null);
    }
  };

  const stopDemoFlight = () => {
    if (flightId) {
      clientFlightEngine.cancelFlight(flightId);
      clientFlightEngine.removeFlightCallback(flightId);
      
      // Add final log entry
      setFlightLogs(prev => [
        ...prev,
        {
          timestamp: new Date(),
          message: '🛑 Flight tracking stopped',
          type: 'info'
        }
      ]);
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
          <div className="space-y-4">
            {userLocation ? (
              <>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="font-medium">Your Location</div>
                      <div className="text-sm text-gray-600">
                        {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Select Destination:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(DEMO_LOCATIONS)
                      .filter(city => 
                        JSON.stringify(DEMO_LOCATIONS[city as keyof typeof DEMO_LOCATIONS]) !== 
                        JSON.stringify(userLocation)
                      )
                      .map((city) => (
                        <Button
                          key={city}
                          variant={destinationCity === city ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDestinationCity(city)}
                          className="w-full"
                        >
                          {city}
                        </Button>
                      ))}
                  </div>
                </div>
                
                <Button 
                  onClick={() => startDemoFlight()}
                  className="w-full"
                  size="lg"
                >
                  🚀 Start Flight to {destinationCity}
                </Button>
              </>
            ) : (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                <div className="text-sm text-gray-600">Getting your location...</div>
              </div>
            )}
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

            {/* Flight Map */}
            {flightProgress && (
              <div className="mb-6">
                <FlightMap
                  currentPosition={flightProgress.current_position}
                  startLocation={userLocation!}
                  endLocation={DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS]}
                  waypoints={[]}
                  className="mb-4"
                />
              </div>
            )}

            {/* Flight Logs */}
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center justify-between">
                <span>Flight Logs</span>
                {flightLogs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFlightLogs([])}
                    className="text-xs"
                  >
                    Clear logs
                  </Button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                {flightLogs.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-2">
                    Waiting for flight updates...
                  </div>
                ) : (
                  flightLogs.slice().reverse().map((log, index) => (
                    <div 
                      key={index} 
                      className={`text-sm p-2 rounded-lg transition-all duration-300 ${
                        log.type === 'weather' ? 'bg-blue-50 text-blue-700' :
                        log.type === 'milestone' ? 'bg-green-50 text-green-700' :
                        'bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span>{log.message}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Weather Events Summary */}
            {weatherEvents.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Weather Summary</div>
                <div className="text-xs p-2 bg-blue-50 rounded-lg">
                  <div className="font-medium mb-1">Current Conditions:</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getWeatherIcon(weatherEvents[weatherEvents.length - 1].type)}</span>
                    <span>{weatherService.getWeatherSummary(weatherEvents[weatherEvents.length - 1])}</span>
                  </div>
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