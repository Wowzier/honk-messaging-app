import { LocationData, WeatherEvent } from '@/types';

/**
 * Weather condition types that affect flight speed
 */
export enum WeatherCondition {
  CLEAR = 'clear',
  RAIN = 'rain',
  STORM = 'storm',
  WIND = 'wind'
}

/**
 * Weather speed modifiers based on requirements
 */
export const WEATHER_SPEED_MODIFIERS: Record<WeatherCondition, number> = {
  [WeatherCondition.CLEAR]: 1.0,    // Normal speed
  [WeatherCondition.RAIN]: 0.75,    // 25% speed reduction (Requirement 3.6)
  [WeatherCondition.STORM]: 0.5,    // 50% speed reduction (Requirement 3.5)
  [WeatherCondition.WIND]: 1.0      // Variable speed ±25% (Requirement 3.7)
};

/**
 * Open-Meteo API response interface
 */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
}

/**
 * Cached weather data
 */
interface CachedWeatherData {
  data: WeatherEvent;
  timestamp: number;
  expiresAt: number;
}

/**
 * Weather service for fetching and processing weather data
 */
export class WeatherService {
  private baseUrl: string = 'https://api.open-meteo.com/v1/forecast';
  private cache: Map<string, CachedWeatherData> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes cache

  constructor() {
    // No API key needed for Open-Meteo!
  }

  /**
   * Fetch weather data for a specific location
   */
  async fetchWeatherData(location: LocationData): Promise<WeatherEvent | null> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(location);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }

      // Fetch from Open-Meteo API (no API key needed!)
      const url = `${this.baseUrl}?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=auto&temperature_unit=fahrenheit`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Weather API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: OpenMeteoResponse = await response.json();
      const weatherEvent = this.parseOpenMeteoResponse(data, location);

      // Cache the result
      this.cacheWeatherData(cacheKey, weatherEvent);

      return weatherEvent;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  /**
   * Parse Open-Meteo API response into WeatherEvent
   */
  private parseOpenMeteoResponse(data: OpenMeteoResponse, location: LocationData): WeatherEvent {
    const current = data.current_weather;
    const weatherCode = current.weathercode;
    const windSpeedKmh = current.windspeed; // Already in km/h
    const windDirection = current.winddirection;
    const temperature = current.temperature;

    // Determine weather type and intensity based on WMO weather codes
    let type: WeatherCondition;
    let intensity: number;
    let speedModifier: number;

    // WMO Weather interpretation codes (WW)
    switch (weatherCode) {
      case 0: // Clear sky
        type = WeatherCondition.CLEAR;
        intensity = 0;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR];
        break;

      case 1: // Mainly clear
      case 2: // Partly cloudy
      case 3: // Overcast
        type = WeatherCondition.CLEAR;
        intensity = weatherCode / 3; // 0.33 for mainly clear, 0.67 for partly cloudy, 1 for overcast
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR];
        break;

      case 45: // Fog
      case 48: // Depositing rime fog
        type = WeatherCondition.WIND;
        intensity = 0.3;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.WIND] * 0.8;
        break;

      case 51: // Drizzle: Light
      case 53: // Drizzle: Moderate
      case 55: // Drizzle: Dense
        type = WeatherCondition.RAIN;
        intensity = (weatherCode - 51) / 4 + 0.3; // 0.3 to 0.5 intensity
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN];
        break;

      case 56: // Freezing Drizzle: Light
      case 57: // Freezing Drizzle: Dense
        type = WeatherCondition.RAIN;
        intensity = weatherCode === 56 ? 0.4 : 0.6;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN] * 0.8;
        break;

      case 61: // Rain: Slight
      case 63: // Rain: Moderate
      case 65: // Rain: Heavy
        type = WeatherCondition.RAIN;
        intensity = (weatherCode - 61) / 4 + 0.5; // 0.5 to 0.7 intensity
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN];
        break;

      case 66: // Freezing Rain: Light
      case 67: // Freezing Rain: Heavy
        type = WeatherCondition.RAIN;
        intensity = weatherCode === 66 ? 0.6 : 0.8;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN] * 0.8;
        break;

      case 71: // Snow fall: Slight
      case 73: // Snow fall: Moderate
      case 75: // Snow fall: Heavy
        type = WeatherCondition.RAIN; // Treating snow as rain for duck flight
        intensity = (weatherCode - 71) / 4 + 0.4; // 0.4 to 0.6 intensity
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN] * 0.9;
        break;

      case 77: // Snow grains
        type = WeatherCondition.RAIN;
        intensity = 0.5;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN] * 0.9;
        break;

      case 80: // Rain showers: Slight
      case 81: // Rain showers: Moderate
      case 82: // Rain showers: Violent
        type = WeatherCondition.RAIN;
        intensity = (weatherCode - 80) / 2 + 0.6; // 0.6 to 0.8 intensity
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN];
        break;

      case 85: // Snow showers: Slight
      case 86: // Snow showers: Heavy
        type = WeatherCondition.RAIN;
        intensity = weatherCode === 85 ? 0.5 : 0.7;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN] * 0.9;
        break;

      case 95: // Thunderstorm: Slight or moderate
        type = WeatherCondition.STORM;
        intensity = 0.7;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.STORM];
        break;

      case 96: // Thunderstorm with slight hail
      case 99: // Thunderstorm with heavy hail
        type = WeatherCondition.STORM;
        intensity = weatherCode === 96 ? 0.8 : 1.0;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.STORM];
        break;

      default:
        // Check for strong winds regardless of weather code
        if (windSpeedKmh > 25) {
      type = WeatherCondition.WIND;
      intensity = Math.min(1.0, windSpeedKmh / 50); // Normalize to 0-1
      // Wind affects speed by ±25% based on direction (simplified)
      speedModifier = 1.0 + this.calculateWindEffect(windDirection, windSpeedKmh);
        } else {
          // Default to clear weather
          type = WeatherCondition.CLEAR;
          intensity = 0;
          speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR];
        }
    }

    return {
      type,
      intensity,
      speed_modifier: speedModifier,
      location,
      timestamp: new Date(),
      details: {
        temperature: current.temperature,
        windSpeed: current.windspeed,
        windDirection: current.winddirection,
        weatherCode: current.weathercode
      }
    };
  }

  /**
   * Calculate wind effect on flight speed
   * Simplified model: headwind reduces speed, tailwind increases it
   */
  private calculateWindEffect(windDirection: number, windSpeedKmh: number): number {
    // Simplified calculation - in reality would need flight direction
    // For now, use wind speed to determine effect magnitude
    const maxEffect = 0.25; // ±25% as per requirement 3.7
    const normalizedSpeed = Math.min(windSpeedKmh / 50, 1.0);

    // Random factor to simulate varying wind effects
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1

    return randomFactor * maxEffect * normalizedSpeed;
  }

  /**
   * Simplified ocean detection for weather patterns
   */
  private isOverOcean(latitude: number, longitude: number): boolean {
    // Very basic ocean detection - same as routing service
    if (longitude > -60 && longitude < -10 && latitude > 10 && latitude < 60) return true;
    if ((longitude > 140 || longitude < -140) && Math.abs(latitude) < 60) return true;
    if (longitude > 60 && longitude < 100 && latitude > -40 && latitude < 20) return true;
    return false;
  }

  /**
   * Generate cache key for location
   */
  private getCacheKey(location: LocationData): string {
    // Round to 2 decimal places to group nearby locations
    const lat = Math.round(location.latitude * 100) / 100;
    const lon = Math.round(location.longitude * 100) / 100;
    return `${lat},${lon}`;
  }

  /**
   * Cache weather data
   */
  private cacheWeatherData(key: string, data: WeatherEvent): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.cacheTimeout
    });
  }

  /**
   * Clear expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get weather data for multiple locations (for route monitoring)
   */
  async fetchWeatherForRoute(waypoints: LocationData[]): Promise<WeatherEvent[]> {
    const weatherPromises = waypoints.map(waypoint =>
      this.fetchWeatherData(waypoint)
    );

    const results = await Promise.allSettled(weatherPromises);

    return results
      .filter((result): result is PromiseFulfilledResult<WeatherEvent | null> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  /**
   * Calculate flight speed with weather conditions
   */
  calculateFlightSpeed(
    baseSpeedKmh: number,
    weather: WeatherEvent | null,
    terrainModifier: number = 1.0
  ): number {
    if (!weather) {
      return baseSpeedKmh * terrainModifier;
    }

    return baseSpeedKmh * weather.speed_modifier * terrainModifier;
  }

  /**
   * Monitor weather changes for active flights
   */
  async monitorWeatherChanges(
    currentWeather: WeatherEvent,
    location: LocationData,
    thresholdChange: number = 0.3
  ): Promise<{ hasChanged: boolean; newWeather?: WeatherEvent }> {
    const newWeather = await this.fetchWeatherData(location);

    if (!newWeather) {
      return { hasChanged: false };
    }

    // Check if weather has changed significantly
    const speedDifference = Math.abs(
      newWeather.speed_modifier - currentWeather.speed_modifier
    );

    const hasChanged = speedDifference >= thresholdChange;

    return {
      hasChanged,
      newWeather: hasChanged ? newWeather : undefined
    };
  }

  /**
   * Determine if weather conditions require route recalculation
   */
  shouldRecalculateRoute(weather: WeatherEvent): boolean {
    // Recalculate for severe weather conditions
    return weather.type === WeatherCondition.STORM && weather.intensity > 0.7;
  }

  /**
   * Get weather summary for display based on WMO weather codes
   */
  getWeatherSummary(weather: WeatherEvent): string {
    const intensityDesc = weather.intensity > 0.7 ? 'severe' :
      weather.intensity > 0.4 ? 'moderate' : 'light';

    // Store the weatherCode for more specific descriptions
    const weatherCode = weather.details?.weatherCode;

    switch (weather.type) {
      case WeatherCondition.STORM:
        if (weatherCode === 96) return 'thunderstorm with slight hail';
        if (weatherCode === 99) return 'thunderstorm with heavy hail';
        return `${intensityDesc} thunderstorm`;
        
      case WeatherCondition.RAIN:
        // Drizzle
        if (weatherCode >= 51 && weatherCode <= 55) {
          return `${intensityDesc} drizzle`;
        }
        // Freezing Drizzle
        if (weatherCode === 56 || weatherCode === 57) {
          return `${intensityDesc} freezing drizzle`;
        }
        // Regular Rain
        if (weatherCode >= 61 && weatherCode <= 65) {
          return `${intensityDesc} rain`;
        }
        // Freezing Rain
        if (weatherCode === 66 || weatherCode === 67) {
          return `${intensityDesc} freezing rain`;
        }
        // Snow
        if (weatherCode >= 71 && weatherCode <= 75) {
          return `${intensityDesc} snow`;
        }
        if (weatherCode === 77) {
          return 'snow grains';
        }
        // Rain Showers
        if (weatherCode >= 80 && weatherCode <= 82) {
          if (weatherCode === 82) return 'violent rain showers';
          return `${intensityDesc} rain showers`;
        }
        // Snow Showers
        if (weatherCode === 85 || weatherCode === 86) {
          return `${intensityDesc} snow showers`;
        }
        return `${intensityDesc} rain`; // fallback

      case WeatherCondition.WIND:
        if (weatherCode === 45 || weatherCode === 48) {
          return weatherCode === 48 ? 'freezing fog' : 'fog';
        }
        return `${intensityDesc} winds`;

      case WeatherCondition.CLEAR:
        if (weather.intensity > 0.8) return 'overcast';
        if (weather.intensity > 0.4) return 'partly cloudy';
        if (weather.intensity > 0) return 'mainly clear';
        return 'clear skies';

      default:
        return 'clear skies';
    }
  }

  /**
   * Cleanup method to be called periodically
   */
  cleanup(): void {
    this.cleanupCache();
  }
}

/**
 * Singleton instance of the weather service
 */
export const weatherService = new WeatherService();