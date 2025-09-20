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
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    precipitation: string;
    weather_code: string;
    cloud_cover: string;
    pressure_msl: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    wind_gusts_10m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
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
      const url = `${this.baseUrl}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Weather API request failed: ${response.status} ${response.statusText}`);
        return this.generateSimulatedWeather(location);
      }

      const data: OpenMeteoResponse = await response.json();
      const weatherEvent = this.parseOpenMeteoResponse(data, location);

      // Cache the result
      this.cacheWeatherData(cacheKey, weatherEvent);

      return weatherEvent;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Return simulated weather as fallback
      return this.generateSimulatedWeather(location);
    }
  }

  /**
   * Parse Open-Meteo API response into WeatherEvent
   */
  private parseOpenMeteoResponse(data: OpenMeteoResponse, location: LocationData): WeatherEvent {
    const current = data.current;
    const weatherCode = current.weather_code;
    const windSpeedKmh = current.wind_speed_10m; // Already in km/h
    const windDirection = current.wind_direction_10m;
    const precipitation = current.precipitation;
    const humidity = current.relative_humidity_2m;

    // Determine weather type and intensity based on WMO weather codes
    let type: WeatherCondition;
    let intensity: number;
    let speedModifier: number;

    // WMO Weather codes classification
    if (weatherCode >= 95) { // Thunderstorm codes (95, 96, 99)
      type = WeatherCondition.STORM;
      intensity = Math.min(1.0, (humidity / 100) * 1.2 + (precipitation / 10));
      speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.STORM];
    } else if (weatherCode >= 51 && weatherCode <= 67) { // Rain/drizzle codes (51-67)
      type = WeatherCondition.RAIN;
      intensity = Math.min(1.0, (precipitation / 5) + (humidity / 100));
      speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN];
    } else if (windSpeedKmh > 25) { // Strong wind threshold
      type = WeatherCondition.WIND;
      intensity = Math.min(1.0, windSpeedKmh / 50); // Normalize to 0-1
      // Wind affects speed by ±25% based on direction (simplified)
      const windEffect = this.calculateWindEffect(windDirection, windSpeedKmh);
      speedModifier = 1.0 + windEffect;
    } else {
      type = WeatherCondition.CLEAR;
      intensity = 0;
      speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR];
    }

    return {
      type,
      intensity,
      speed_modifier: speedModifier,
      location,
      timestamp: new Date()
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
   * Generate simulated weather data for demo/fallback purposes
   */
  private generateSimulatedWeather(location: LocationData): WeatherEvent {
    const weatherTypes = [
      WeatherCondition.CLEAR,
      WeatherCondition.RAIN,
      WeatherCondition.STORM,
      WeatherCondition.WIND
    ];

    // Weight weather types based on location (simplified)
    const weights = this.getWeatherWeights(location);
    const type = this.weightedRandomSelect(weatherTypes, weights);

    let intensity: number;
    let speedModifier: number;

    switch (type) {
      case WeatherCondition.STORM:
        intensity = 0.6 + Math.random() * 0.4; // 0.6-1.0
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.STORM];
        break;
      case WeatherCondition.RAIN:
        intensity = 0.3 + Math.random() * 0.5; // 0.3-0.8
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN];
        break;
      case WeatherCondition.WIND:
        intensity = 0.4 + Math.random() * 0.6; // 0.4-1.0
        // Random wind effect ±25%
        const windEffect = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25
        speedModifier = 1.0 + windEffect;
        break;
      default:
        intensity = 0;
        speedModifier = WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR];
    }

    return {
      type,
      intensity,
      speed_modifier: speedModifier,
      location,
      timestamp: new Date()
    };
  }

  /**
   * Get weather probability weights based on location
   */
  private getWeatherWeights(location: LocationData): number[] {
    const { latitude, longitude } = location;

    // Simplified weather patterns based on geography
    // [CLEAR, RAIN, STORM, WIND]

    // Tropical regions (more storms and rain)
    if (Math.abs(latitude) < 23.5) {
      return [0.4, 0.3, 0.2, 0.1];
    }

    // Polar regions (more wind and storms)
    if (Math.abs(latitude) > 60) {
      return [0.3, 0.2, 0.2, 0.3];
    }

    // Ocean areas (more wind)
    if (this.isOverOcean(latitude, longitude)) {
      return [0.4, 0.2, 0.1, 0.3];
    }

    // Default temperate climate
    return [0.5, 0.25, 0.1, 0.15];
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
   * Weighted random selection
   */
  private weightedRandomSelect<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
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
   * Get weather summary for display
   */
  getWeatherSummary(weather: WeatherEvent): string {
    const intensityDesc = weather.intensity > 0.7 ? 'severe' :
      weather.intensity > 0.4 ? 'moderate' : 'light';

    switch (weather.type) {
      case WeatherCondition.STORM:
        return `${intensityDesc} thunderstorm`;
      case WeatherCondition.RAIN:
        return `${intensityDesc} rain`;
      case WeatherCondition.WIND:
        return `${intensityDesc} winds`;
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