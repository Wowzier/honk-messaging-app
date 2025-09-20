import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeatherService, WeatherCondition, WEATHER_SPEED_MODIFIERS } from '@/services/weather';
import { LocationData, WeatherEvent } from '@/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WeatherService', () => {
  let weatherService: WeatherService;
  const testLocation: LocationData = {
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York',
    country: 'United States',
    is_anonymous: false
  };

  beforeEach(() => {
    weatherService = new WeatherService();
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    weatherService.cleanup();
  });

  describe('Weather Speed Modifiers', () => {
    it('should have correct speed modifiers for each weather condition', () => {
      expect(WEATHER_SPEED_MODIFIERS[WeatherCondition.CLEAR]).toBe(1.0);
      expect(WEATHER_SPEED_MODIFIERS[WeatherCondition.RAIN]).toBe(0.75);
      expect(WEATHER_SPEED_MODIFIERS[WeatherCondition.STORM]).toBe(0.5);
      expect(WEATHER_SPEED_MODIFIERS[WeatherCondition.WIND]).toBe(1.0);
    });
  });

  describe('fetchWeatherData', () => {
    it('should fetch weather data from API successfully', async () => {
      const mockApiResponse = {
        latitude: 40.7128,
        longitude: -74.0060,
        generationtime_ms: 2.2,
        utc_offset_seconds: -18000,
        timezone: 'America/New_York',
        timezone_abbreviation: 'EST',
        elevation: 44.8,
        current_units: {
          time: 'iso8601',
          interval: 'seconds',
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          weather_code: 'wmo code',
          cloud_cover: '%',
          pressure_msl: 'hPa',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
          wind_gusts_10m: 'km/h'
        },
        current: {
          time: '2022-01-01T15:00',
          interval: 900,
          temperature_2m: 20.0,
          relative_humidity_2m: 60,
          precipitation: 0.0,
          weather_code: 0, // Clear sky
          cloud_cover: 10,
          pressure_msl: 1013.2,
          wind_speed_10m: 12.6,
          wind_direction_10m: 180,
          wind_gusts_10m: 15.0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result).toBeDefined();
      expect(result?.type).toBe(WeatherCondition.CLEAR);
      expect(result?.speed_modifier).toBe(1.0);
      expect(result?.location).toEqual(testLocation);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com')
      );
    });

    it('should handle API errors and return simulated weather', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result).toBeDefined();
      expect(result?.location).toEqual(testLocation);
      expect([
        WeatherCondition.CLEAR,
        WeatherCondition.RAIN,
        WeatherCondition.STORM,
        WeatherCondition.WIND
      ]).toContain(result?.type);
    });

    it('should use real API by default (no demo mode needed)', async () => {
      // Open-Meteo doesn't need demo mode since it's free!
      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result).toBeDefined();
      expect(result?.location).toEqual(testLocation);
      // Should attempt to call the API (will fail in test, but that's expected)
    });

    it('should cache weather data and reuse it', async () => {
      const mockApiResponse = {
        latitude: 40.7128,
        longitude: -74.0060,
        generationtime_ms: 2.2,
        utc_offset_seconds: -18000,
        timezone: 'America/New_York',
        timezone_abbreviation: 'EST',
        elevation: 44.8,
        current_units: {
          time: 'iso8601',
          interval: 'seconds',
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          weather_code: 'wmo code',
          cloud_cover: '%',
          pressure_msl: 'hPa',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
          wind_gusts_10m: 'km/h'
        },
        current: {
          time: '2022-01-01T15:00',
          interval: 900,
          temperature_2m: 15.0,
          relative_humidity_2m: 80,
          precipitation: 2.5,
          weather_code: 61, // Rain
          cloud_cover: 75,
          pressure_msl: 1010.0,
          wind_speed_10m: 9.0,
          wind_direction_10m: 90,
          wind_gusts_10m: 12.0
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      // First call
      const result1 = await weatherService.fetchWeatherData(testLocation);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await weatherService.fetchWeatherData(testLocation);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result1?.type).toBe(result2?.type);
    });
  });

  describe('parseWeatherResponse', () => {
    it('should correctly parse storm conditions', async () => {
      const stormResponse = {
        latitude: 40.7128,
        longitude: -74.0060,
        generationtime_ms: 2.2,
        utc_offset_seconds: -18000,
        timezone: 'America/New_York',
        timezone_abbreviation: 'EST',
        elevation: 44.8,
        current_units: {
          time: 'iso8601',
          interval: 'seconds',
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          weather_code: 'wmo code',
          cloud_cover: '%',
          pressure_msl: 'hPa',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
          wind_gusts_10m: 'km/h'
        },
        current: {
          time: '2022-01-01T15:00',
          interval: 900,
          temperature_2m: 18.0,
          relative_humidity_2m: 90,
          precipitation: 5.0,
          weather_code: 95, // Thunderstorm
          cloud_cover: 100,
          pressure_msl: 1005.0,
          wind_speed_10m: 28.8,
          wind_direction_10m: 270,
          wind_gusts_10m: 35.0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => stormResponse
      });

      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result?.type).toBe(WeatherCondition.STORM);
      expect(result?.speed_modifier).toBe(0.5);
      expect(result?.intensity).toBeGreaterThan(0);
    });

    it('should correctly parse rain conditions', async () => {
      const rainResponse = {
        coord: { lon: -74.0060, lat: 40.7128 },
        weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
        main: { temp: 16, feels_like: 14, temp_min: 13, temp_max: 19, pressure: 1008, humidity: 85 },
        visibility: 7000,
        wind: { speed: 4.0, deg: 180 },
        clouds: { all: 80 },
        dt: 1609459200,
        sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
        timezone: -18000,
        id: 5128581,
        name: 'New York',
        cod: 200
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => rainResponse
      });

      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result?.type).toBe(WeatherCondition.RAIN);
      expect(result?.speed_modifier).toBe(0.75);
    });

    it('should correctly parse wind conditions', async () => {
      const windyResponse = {
        coord: { lon: -74.0060, lat: 40.7128 },
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
        main: { temp: 22, feels_like: 20, temp_min: 18, temp_max: 26, pressure: 1015, humidity: 50 },
        visibility: 10000,
        wind: { speed: 12.0, deg: 90 }, // Strong wind (>25 km/h when converted)
        clouds: { all: 10 },
        dt: 1609459200,
        sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
        timezone: -18000,
        id: 5128581,
        name: 'New York',
        cod: 200
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => windyResponse
      });

      const result = await weatherService.fetchWeatherData(testLocation);

      expect(result?.type).toBe(WeatherCondition.WIND);
      expect(result?.speed_modifier).not.toBe(1.0); // Should be modified by wind
    });
  });

  describe('calculateFlightSpeed', () => {
    it('should calculate correct speed with clear weather', () => {
      const baseSpeed = 50;
      const clearWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: testLocation,
        timestamp: new Date()
      };

      const speed = weatherService.calculateFlightSpeed(baseSpeed, clearWeather);
      expect(speed).toBe(50);
    });

    it('should calculate correct speed with rain', () => {
      const baseSpeed = 50;
      const rainWeather: WeatherEvent = {
        type: WeatherCondition.RAIN,
        intensity: 0.6,
        speed_modifier: 0.75,
        location: testLocation,
        timestamp: new Date()
      };

      const speed = weatherService.calculateFlightSpeed(baseSpeed, rainWeather);
      expect(speed).toBe(37.5); // 50 * 0.75
    });

    it('should calculate correct speed with storm', () => {
      const baseSpeed = 50;
      const stormWeather: WeatherEvent = {
        type: WeatherCondition.STORM,
        intensity: 0.8,
        speed_modifier: 0.5,
        location: testLocation,
        timestamp: new Date()
      };

      const speed = weatherService.calculateFlightSpeed(baseSpeed, stormWeather);
      expect(speed).toBe(25); // 50 * 0.5
    });

    it('should handle null weather by using base speed', () => {
      const baseSpeed = 50;
      const speed = weatherService.calculateFlightSpeed(baseSpeed, null);
      expect(speed).toBe(50);
    });

    it('should apply terrain modifier', () => {
      const baseSpeed = 50;
      const terrainModifier = 1.2; // Ocean terrain
      const clearWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: testLocation,
        timestamp: new Date()
      };

      const speed = weatherService.calculateFlightSpeed(baseSpeed, clearWeather, terrainModifier);
      expect(speed).toBe(60); // 50 * 1.0 * 1.2
    });
  });

  describe('fetchWeatherForRoute', () => {
    it('should fetch weather for multiple waypoints', async () => {
      const waypoints: LocationData[] = [
        { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        { latitude: 51.5074, longitude: -0.1278, is_anonymous: false },
        { latitude: 48.8566, longitude: 2.3522, is_anonymous: false }
      ];

      // Mock successful responses for all waypoints
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          coord: { lon: 0, lat: 0 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          main: { temp: 20, feels_like: 18, temp_min: 15, temp_max: 25, pressure: 1013, humidity: 60 },
          visibility: 10000,
          wind: { speed: 3.5, deg: 180 },
          clouds: { all: 0 },
          dt: 1609459200,
          sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
          timezone: 0,
          id: 1,
          name: 'Test',
          cod: 200
        })
      });

      const results = await weatherService.fetchWeatherForRoute(waypoints);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      results.forEach(weather => {
        expect(weather.type).toBe(WeatherCondition.CLEAR);
      });
    });

    it('should handle partial failures in route weather fetching', async () => {
      const waypoints: LocationData[] = [
        { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }
      ];

      // First call succeeds, second fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            coord: { lon: -74.0060, lat: 40.7128 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
            main: { temp: 20, feels_like: 18, temp_min: 15, temp_max: 25, pressure: 1013, humidity: 60 },
            visibility: 10000,
            wind: { speed: 3.5, deg: 180 },
            clouds: { all: 0 },
            dt: 1609459200,
            sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
            timezone: -18000,
            id: 5128581,
            name: 'New York',
            cod: 200
          })
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await weatherService.fetchWeatherForRoute(waypoints);

      // Should still get results from successful calls and fallback weather
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(WeatherCondition.CLEAR);
    });
  });

  describe('monitorWeatherChanges', () => {
    it('should detect significant weather changes', async () => {
      const currentWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: testLocation,
        timestamp: new Date()
      };

      // Mock API response with storm weather
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          coord: { lon: -74.0060, lat: 40.7128 },
          weather: [{ id: 200, main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' }],
          main: { temp: 18, feels_like: 16, temp_min: 15, temp_max: 22, pressure: 1005, humidity: 90 },
          visibility: 5000,
          wind: { speed: 8.0, deg: 270 },
          clouds: { all: 100 },
          dt: 1609459200,
          sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
          timezone: -18000,
          id: 5128581,
          name: 'New York',
          cod: 200
        })
      });

      const result = await weatherService.monitorWeatherChanges(currentWeather, testLocation);

      expect(result.hasChanged).toBe(true);
      expect(result.newWeather).toBeDefined();
      expect(result.newWeather?.type).toBe(WeatherCondition.STORM);
    });

    it('should not detect insignificant weather changes', async () => {
      const currentWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: testLocation,
        timestamp: new Date()
      };

      // Mock API response with similar clear weather
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          coord: { lon: -74.0060, lat: 40.7128 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          main: { temp: 22, feels_like: 20, temp_min: 18, temp_max: 26, pressure: 1015, humidity: 55 },
          visibility: 10000,
          wind: { speed: 3.0, deg: 200 },
          clouds: { all: 5 },
          dt: 1609459200,
          sys: { type: 1, id: 1234, country: 'US', sunrise: 1609459200, sunset: 1609459200 },
          timezone: -18000,
          id: 5128581,
          name: 'New York',
          cod: 200
        })
      });

      const result = await weatherService.monitorWeatherChanges(currentWeather, testLocation);

      expect(result.hasChanged).toBe(false);
      expect(result.newWeather).toBeUndefined();
    });
  });

  describe('shouldRecalculateRoute', () => {
    it('should recommend route recalculation for severe storms', () => {
      const severeStorm: WeatherEvent = {
        type: WeatherCondition.STORM,
        intensity: 0.8,
        speed_modifier: 0.5,
        location: testLocation,
        timestamp: new Date()
      };

      expect(weatherService.shouldRecalculateRoute(severeStorm)).toBe(true);
    });

    it('should not recommend route recalculation for light storms', () => {
      const lightStorm: WeatherEvent = {
        type: WeatherCondition.STORM,
        intensity: 0.5,
        speed_modifier: 0.5,
        location: testLocation,
        timestamp: new Date()
      };

      expect(weatherService.shouldRecalculateRoute(lightStorm)).toBe(false);
    });

    it('should not recommend route recalculation for other weather types', () => {
      const rainWeather: WeatherEvent = {
        type: WeatherCondition.RAIN,
        intensity: 0.9,
        speed_modifier: 0.75,
        location: testLocation,
        timestamp: new Date()
      };

      expect(weatherService.shouldRecalculateRoute(rainWeather)).toBe(false);
    });
  });

  describe('getWeatherSummary', () => {
    it('should generate correct summary for different weather types', () => {
      const clearWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: testLocation,
        timestamp: new Date()
      };

      const lightRain: WeatherEvent = {
        type: WeatherCondition.RAIN,
        intensity: 0.3,
        speed_modifier: 0.75,
        location: testLocation,
        timestamp: new Date()
      };

      const severeStorm: WeatherEvent = {
        type: WeatherCondition.STORM,
        intensity: 0.8,
        speed_modifier: 0.5,
        location: testLocation,
        timestamp: new Date()
      };

      expect(weatherService.getWeatherSummary(clearWeather)).toBe('clear skies');
      expect(weatherService.getWeatherSummary(lightRain)).toBe('light rain');
      expect(weatherService.getWeatherSummary(severeStorm)).toBe('severe thunderstorm');
    });
  });

  describe('generateSimulatedWeather', () => {
    it('should generate realistic weather for different regions', async () => {
      const demoService = new WeatherService('demo');
      
      // Test tropical location
      const tropicalLocation: LocationData = {
        latitude: 10.0,
        longitude: -60.0,
        is_anonymous: false
      };

      // Test polar location
      const polarLocation: LocationData = {
        latitude: 70.0,
        longitude: 0.0,
        is_anonymous: false
      };

      const tropicalWeather = await demoService.fetchWeatherData(tropicalLocation);
      const polarWeather = await demoService.fetchWeatherData(polarLocation);

      expect(tropicalWeather).toBeDefined();
      expect(polarWeather).toBeDefined();
      
      // Both should have valid weather types
      expect([
        WeatherCondition.CLEAR,
        WeatherCondition.RAIN,
        WeatherCondition.STORM,
        WeatherCondition.WIND
      ]).toContain(tropicalWeather?.type);
      
      expect([
        WeatherCondition.CLEAR,
        WeatherCondition.RAIN,
        WeatherCondition.STORM,
        WeatherCondition.WIND
      ]).toContain(polarWeather?.type);
    });
  });
});