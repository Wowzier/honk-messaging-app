'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { weatherService, WeatherCondition } from '@/services/weather';
import { LocationData, WeatherEvent } from '@/types';

interface WeatherSearchProps {
  className?: string;
}

// Popular cities for quick testing
const QUICK_CITIES = [
  { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'USA' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'UK' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'Australia' },
  { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France' },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, country: 'UAE' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'Brazil' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, country: 'India' }
];

const getWeatherEmoji = (condition: WeatherCondition): string => {
  switch (condition) {
    case WeatherCondition.CLEAR:
      return '☀️';
    case WeatherCondition.RAIN:
      return '🌧️';
    case WeatherCondition.STORM:
      return '⛈️';
    case WeatherCondition.WIND:
      return '💨';
    default:
      return '🌤️';
  }
};

const getWeatherDescription = (condition: WeatherCondition): string => {
  switch (condition) {
    case WeatherCondition.CLEAR:
      return 'Clear skies - perfect flying weather!';
    case WeatherCondition.RAIN:
      return 'Rainy conditions - ducks fly 25% slower';
    case WeatherCondition.STORM:
      return 'Stormy weather - ducks fly 50% slower!';
    case WeatherCondition.WIND:
      return 'Windy conditions - speed varies ±25%';
    default:
      return 'Unknown weather conditions';
  }
};

const getSpeedColor = (modifier: number): string => {
  if (modifier < 0.7) return 'text-red-600 font-bold'; // Very slow
  if (modifier < 0.9) return 'text-orange-600 font-semibold'; // Slow
  if (modifier > 1.1) return 'text-green-600 font-semibold'; // Fast
  return 'text-blue-600'; // Normal
};

export function WeatherSearch({ className = '' }: WeatherSearchProps) {
  const [weather, setWeather] = useState<WeatherEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [lastSearched, setLastSearched] = useState<string>('');

  const searchWeather = async (lat: number, lon: number, cityName: string) => {
    setLoading(true);
    setLastSearched(cityName);
    
    try {
      const location: LocationData = {
        latitude: lat,
        longitude: lon,
        is_anonymous: false
      };
      
      const weatherData = await weatherService.fetchWeatherData(location);
      setWeather(weatherData);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSearch = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    
    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid latitude and longitude values');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90');
      return;
    }
    
    if (lon < -180 || lon > 180) {
      alert('Longitude must be between -180 and 180');
      return;
    }
    
    searchWeather(lat, lon, `${lat}, ${lon}`);
  };

  const flightSpeed = weather ? weatherService.calculateFlightSpeed(50, weather) : 50;
  const speedEffect = weather ? Math.round((weather.speed_modifier - 1) * 100) : 0;
  const speedEffectText = speedEffect > 0 ? `+${speedEffect}%` : `${speedEffect}%`;

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          🌍 Weather Search - Test Open-Meteo API
        </CardTitle>
        <p className="text-gray-600">
          Search weather conditions anywhere in the world to test duck flight speeds!
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Quick City Buttons */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">🏙️ Quick City Search</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_CITIES.map((city) => (
              <Button
                key={city.name}
                variant="outline"
                size="sm"
                onClick={() => searchWeather(city.lat, city.lon, city.name)}
                disabled={loading}
                className="text-left justify-start"
              >
                {city.name}
                <span className="text-xs text-gray-500 ml-1">({city.country})</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Coordinates Search */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-lg">📍 Custom Coordinates</h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm text-gray-600">Latitude (-90 to 90)</label>
              <Input
                type="number"
                placeholder="e.g. 40.7128"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                step="0.0001"
                min="-90"
                max="90"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600">Longitude (-180 to 180)</label>
              <Input
                type="number"
                placeholder="e.g. -74.0060"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                step="0.0001"
                min="-180"
                max="180"
              />
            </div>
            <Button 
              onClick={handleCustomSearch}
              disabled={loading || !customLat || !customLon}
            >
              Search
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            💡 Tip: You can find coordinates on Google Maps by right-clicking any location
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-3">Fetching weather for {lastSearched}...</span>
          </div>
        )}

        {/* Weather Results */}
        {weather && !loading && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">🌤️ Weather Results for {lastSearched}</h3>
              <span className="text-sm text-gray-500">
                Powered by Open-Meteo API
              </span>
            </div>

            {/* Main Weather Display */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Weather Condition */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-6xl">{getWeatherEmoji(weather.type)}</span>
                  <div>
                    <h4 className="text-2xl font-bold capitalize">{weather.type}</h4>
                    <p className="text-gray-600">{getWeatherDescription(weather.type)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Intensity:</span>
                    <span className="font-semibold">{Math.round(weather.intensity * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Condition:</span>
                    <span className="font-semibold">{weatherService.getWeatherSummary(weather)}</span>
                  </div>
                </div>
              </div>

              {/* Flight Impact */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">🦆</span>
                  <h4 className="text-2xl font-bold">Duck Flight Impact</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Base Speed:</span>
                    <span className="font-semibold">50 km/h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Weather Effect:</span>
                    <span className={getSpeedColor(weather.speed_modifier)}>
                      {speedEffectText}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-gray-600">Actual Speed:</span>
                    <span className={`text-xl font-bold ${getSpeedColor(weather.speed_modifier)}`}>
                      {Math.round(flightSpeed)} km/h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Recalculation Warning */}
            {weatherService.shouldRecalculateRoute(weather) && (
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-orange-800">Severe Weather Alert!</h4>
                    <p className="text-orange-700">
                      Route recalculation recommended due to dangerous weather conditions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔧 Technical Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Coordinates:</span>
                  <div className="font-mono">
                    {weather.location.latitude.toFixed(4)}, {weather.location.longitude.toFixed(4)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Speed Modifier:</span>
                  <div className="font-mono">{weather.speed_modifier.toFixed(2)}x</div>
                </div>
                <div>
                  <span className="text-gray-600">Timestamp:</span>
                  <div className="font-mono">{weather.timestamp.toLocaleTimeString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">API Source:</span>
                  <div className="font-mono">Open-Meteo</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 How to Use</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Click any city button for instant weather data</li>
            <li>• Enter custom coordinates to test any location worldwide</li>
            <li>• Watch how different weather affects duck flight speeds</li>
            <li>• All data comes from Open-Meteo's free API (no key needed!)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}