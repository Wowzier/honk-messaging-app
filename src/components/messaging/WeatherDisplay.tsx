'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { weatherService, WeatherCondition } from '@/services/weather';
import { LocationData, WeatherEvent } from '@/types';
import { GeolocationService, GeolocationError } from '@/services/geolocation';

interface WeatherDisplayProps {
    location?: LocationData;
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

const getWeatherIcon = (condition: string): string => {
    switch (condition) {
        case 'clear':
            return '☀️';
        case 'rain':
            return '🌧️';
        case 'storm':
            return '⛈️';
        case 'wind':
            return '💨';
        default:
            return '🌤️';
    }
};

const getSpeedEffectColor = (modifier: number): string => {
    if (modifier < 0.7) return 'text-red-500'; // Severe reduction
    if (modifier < 0.9) return 'text-orange-500'; // Moderate reduction
    if (modifier > 1.1) return 'text-green-500'; // Speed boost
    return 'text-blue-500'; // Normal/slight change
};

export function WeatherDisplay({ location, className = '' }: WeatherDisplayProps) {
    const [weather, setWeather] = useState<WeatherEvent | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('New York');
    const [flightSpeed, setFlightSpeed] = useState<number>(50);
    const [userLocation, setUserLocation] = useState<LocationData | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        const getUserLocation = async () => {
            try {
                setLoading(true);
                const location = await GeolocationService.getCurrentLocation();
                setUserLocation(location);
                setLocationError(null);
                await fetchWeather(location);
            } catch (error) {
                setLocationError((error as GeolocationError).message);
                // Fallback to New York if location access is denied
                const defaultLocation = DEMO_LOCATIONS[selectedCity as keyof typeof DEMO_LOCATIONS];
                await fetchWeather(defaultLocation);
            } finally {
                setLoading(false);
            }
        };

        getUserLocation();
    }, []);

    const fetchWeather = async (loc: LocationData) => {
        setLoading(true);
        try {
            const weatherData = await weatherService.fetchWeatherData(loc);
            setWeather(weatherData);

            if (weatherData) {
                const speed = weatherService.calculateFlightSpeed(50, weatherData);
                setFlightSpeed(speed);
            }
        } catch (error) {
            console.error('Failed to fetch weather:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentLocation = location || DEMO_LOCATIONS[selectedCity as keyof typeof DEMO_LOCATIONS];
        fetchWeather(currentLocation);
    }, [location, selectedCity]);

    const handleCityChange = (city: string) => {
        setSelectedCity(city);
    };

    const handleRefresh = () => {
        const currentLocation = location || DEMO_LOCATIONS[selectedCity as keyof typeof DEMO_LOCATIONS];
        fetchWeather(currentLocation);
    };

    const speedEffect = weather ? Math.round((weather.speed_modifier - 1) * 100) : 0;
    const speedEffectText = speedEffect > 0 ? `+${speedEffect}%` : `${speedEffect}%`;

    return (
        <Card className={`w-full max-w-md ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    🌤️ Flight Weather Conditions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Location Status */}
                <div className="space-y-2">
                    {userLocation ? (
                        <div className="flex items-center justify-between p-2 bg-green-50 text-green-700 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>Using your current location</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserLocation(null)}
                                className="text-green-700 hover:text-green-800"
                            >
                                Change
                            </Button>
                        </div>
                    ) : locationError ? (
                        <div className="flex items-center justify-between p-2 bg-orange-50 text-orange-700 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{locationError}</span>
                            </div>
                        </div>
                    ) : null}
                    
                    {/* City Selector (if no user location) */}
                    {!userLocation && (
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(DEMO_LOCATIONS).map((city) => (
                                <Button
                                    key={city}
                                    variant={selectedCity === city ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleCityChange(city)}
                                    disabled={loading}
                                >
                                    {city}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weather Display */}
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        <span className="ml-2">Checking weather...</span>
                    </div>
                ) : weather ? (
                    <div className="space-y-3">
                        {/* Current Weather */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{getWeatherIcon(weather.type)}</span>
                                <div>
                                    <div className="font-semibold capitalize">{weather.type}</div>
                                    <div className="text-sm text-gray-600">
                                        {weatherService.getWeatherSummary(weather)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Intensity</div>
                                <div className="font-semibold">
                                    {Math.round(weather.intensity * 100)}%
                                </div>
                            </div>
                        </div>

                        {/* Flight Speed Impact */}
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">🦆 Duck Flight Speed</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={loading}
                                >
                                    🔄 Refresh
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-600">Base Speed</div>
                                    <div className="font-semibold">50 km/h</div>
                                </div>
                                <div>
                                    <div className="text-gray-600">Current Speed</div>
                                    <div className="font-semibold">{Math.round(flightSpeed)} km/h</div>
                                </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-blue-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Weather Effect:</span>
                                    <span className={`font-semibold ${getSpeedEffectColor(weather.speed_modifier)}`}>
                                        {speedEffectText}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Weather Conditions Explanation */}
                        <div className="text-xs text-gray-500 space-y-1">
                            <div>☀️ Clear: Normal speed (100%)</div>
                            <div>🌧️ Rain: Slower speed (75%)</div>
                            <div>⛈️ Storm: Much slower (50%)</div>
                            <div>💨 Wind: Variable speed (±25%)</div>
                        </div>

                        {/* Route Recalculation Warning */}
                        {weather && weatherService.shouldRecalculateRoute(weather) && (
                            <div className="p-2 bg-orange-100 border border-orange-300 rounded text-orange-800 text-sm">
                                ⚠️ Severe weather detected! Route recalculation recommended.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        Failed to load weather data
                    </div>
                )}
            </CardContent>
        </Card>
    );
}