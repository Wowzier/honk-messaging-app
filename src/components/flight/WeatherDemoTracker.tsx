'use client';

import React, { useEffect, useState } from 'react';
import { FlightProgress, LocationData, WeatherEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plane, 
  MapPin, 
  Clock, 
  RefreshCw,
  Cloud,
  CloudRain,
  Zap,
  Wind
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Import WeatherMap dynamically to avoid SSR issues with Leaflet
const WeatherMap = dynamic(
  () => import('./WeatherMap'),
  { ssr: false }
);
import { clientFlightEngine } from '@/services/clientFlightEngine';
import { weatherService } from '@/services/weather';
import { GeolocationService } from '@/services/geolocation';

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

/**
 * Weather demo flight tracker component
 */
export function WeatherDemoTracker() {
  const [progress, setProgress] = useState<FlightProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [demoId, setDemoId] = useState<string>('');
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [destinationCity, setDestinationCity] = useState<string>('London');
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);
  const [flightLogs, setFlightLogs] = useState<Array<{
    timestamp: Date;
    message: string;
    type: 'info' | 'weather' | 'milestone';
  }>>([]);

  // Get user's location on mount
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

  // Start a demo flight
  const startDemoFlight = async () => {
    if (!userLocation) return;
    
    const destination = DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS];
    const newDemoId = `weather-demo-${Date.now()}`;
    
    try {
      const flight = await clientFlightEngine.initializeFlight(
        newDemoId,
        userLocation,
        destination
      );

      if (!flight) {
        throw new Error('Failed to initialize flight');
      }

      setDemoId(newDemoId);
      setIsActive(true);
      setProgress({
        message_id: newDemoId,
        current_position: flight.current_position,
        progress_percentage: flight.progress_percentage,
        estimated_arrival: flight.estimated_arrival,
        current_weather: flight.weather_events[flight.weather_events.length - 1]
      });

      setWeatherEvents(flight.weather_events);
      setFlightLogs([{
        timestamp: new Date(),
        message: `🚀 Starting weather demo flight to ${destinationCity}`,
        type: 'info'
      }]);

      // Register progress callback
      clientFlightEngine.onFlightProgress(newDemoId, (flightProgress) => {
        setProgress(flightProgress);
        
        // Log weather changes
        if (flightProgress.current_weather) {
          const currentWeather = flightProgress.current_weather;
          if (currentWeather) {
            setWeatherEvents(prev => {
              const exists = prev.some(w => 
                w.timestamp.getTime() === currentWeather.timestamp.getTime()
              );
              if (!exists) {
                setFlightLogs(logs => [
                  ...logs,
                  {
                    timestamp: new Date(),
                    message: `🌤️ Weather update: ${weatherService.getWeatherSummary(currentWeather)}`,
                    type: 'weather'
                  }
                ]);
                return [...prev, currentWeather];
              }
              return prev;
            });
          }
        }

        // Log milestones
        if (flightProgress.progress_percentage % 25 === 0) {
          setFlightLogs(logs => [
            ...logs,
            {
              timestamp: new Date(),
              message: `🎯 Flight milestone: ${flightProgress.progress_percentage}% complete!`,
              type: 'milestone'
            }
          ]);
        }
      });

    } catch (error) {
      console.error('Failed to start demo flight:', error);
      setIsActive(false);
      setProgress(null);
    }
  };

  // Stop the demo flight
  const stopDemoFlight = () => {
    if (demoId) {
      clientFlightEngine.cancelFlight(demoId);
      clientFlightEngine.removeFlightCallback(demoId);
      setFlightLogs(prev => [
        ...prev,
        {
          timestamp: new Date(),
          message: '🛑 Demo flight stopped',
          type: 'info'
        }
      ]);
    }
    setIsActive(false);
    setProgress(null);
    setDemoId('');
    setWeatherEvents([]);
  };

  // Format coordinates for display
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  };

  // Format remaining time
  const formatTimeRemaining = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Arriving now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            Weather Demo Flight
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Flight Setup */}
        {!isActive && (
          <div className="space-y-4">
            {userLocation ? (
              <>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="font-medium">Your Location</div>
                      <div className="text-sm text-gray-600">
                        {formatCoordinates(userLocation.latitude, userLocation.longitude)}
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
                  onClick={startDemoFlight}
                  className="w-full"
                  size="lg"
                >
                  🚀 Start Weather Demo Flight
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
        {isActive && progress && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Flight Progress</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopDemoFlight}
              >
                Stop Demo
              </Button>
            </div>
            
            {/* Map */}
            <WeatherMap
              currentPosition={progress.current_position}
              destinationPosition={DEMO_LOCATIONS[destinationCity as keyof typeof DEMO_LOCATIONS]}
              flightPath={weatherEvents.map(event => [event.location.latitude, event.location.longitude])}
            />
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{Math.round(progress.progress_percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 bg-blue-500"
                  style={{ width: `${progress.progress_percentage}%` }}
                />
              </div>
            </div>

            {/* Current Location */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Current Position</p>
                <p className="text-xs text-gray-600">
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

            {/* Weather Conditions */}
            {progress.current_weather && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <WeatherIcon type={progress.current_weather.type} />
                  <span className="font-medium">Current Weather</span>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    Condition: {weatherService.getWeatherSummary(progress.current_weather)}
                  </div>
                  <div>
                    Speed Effect: {Math.round((progress.current_weather.speed_modifier - 1) * 100)}%
                  </div>
                  <div>
                    Intensity: {Math.round(progress.current_weather.intensity * 100)}%
                  </div>
                </div>
              </div>
            )}

            {/* Time Remaining */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Time Remaining</p>
                <p className="text-xs text-gray-600">
                  {formatTimeRemaining(progress.estimated_arrival)}
                </p>
              </div>
            </div>

            {/* Flight Logs */}
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center justify-between">
                <span>Flight Log</span>
                {flightLogs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFlightLogs([])}
                    className="text-xs"
                  >
                    Clear log
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
                      className={`text-sm p-2 rounded-lg ${
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

            {/* Weather Summary */}
            {weatherEvents.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Weather Effects</div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(new Set(weatherEvents.map(w => w.type))).map(type => (
                    <div key={type} className="p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <WeatherIcon type={type} />
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Weather icon component
function WeatherIcon({ type }: { type: string }) {
  switch (type) {
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
}