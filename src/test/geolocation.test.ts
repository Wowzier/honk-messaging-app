import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeolocationService, GeolocationError } from '@/services/geolocation';
import { LocationData } from '@/types';

// Mock the navigator.geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// Mock position data
const mockPosition: GeolocationPosition = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

describe('GeolocationService', () => {
  beforeEach(() => {
    // Ensure navigator exists
    if (!global.navigator) {
      (global as any).navigator = {};
    }
    
    // Mock navigator.geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is supported', () => {
      expect(GeolocationService.isGeolocationSupported()).toBe(true);
    });

    it('should return false when geolocation is not supported', () => {
      // Remove geolocation from navigator
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      expect(GeolocationService.isGeolocationSupported()).toBe(false);
      
      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('getCurrentLocation', () => {
    it('should return location data on success', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const location = await GeolocationService.getCurrentLocation();

      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        is_anonymous: false,
      });
    });

    it('should use default options when none provided', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      await GeolocationService.getCurrentLocation();

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });

    it('should merge custom options with defaults', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      await GeolocationService.getCurrentLocation({ timeout: 5000 });

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    });

    it('should throw error when geolocation is not supported', async () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      await expect(GeolocationService.getCurrentLocation()).rejects.toEqual({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED',
      });
      
      // Restore navigator
      global.navigator = originalNavigator;
    });

    it('should handle PERMISSION_DENIED error', async () => {
      const mockError: GeolocationPositionError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(GeolocationService.getCurrentLocation()).rejects.toEqual({
        code: 1,
        message: 'Location access denied by user',
        type: 'PERMISSION_DENIED',
      });
    });

    it('should handle POSITION_UNAVAILABLE error', async () => {
      const mockError: GeolocationPositionError = {
        code: 2,
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(GeolocationService.getCurrentLocation()).rejects.toEqual({
        code: 2,
        message: 'Location information is unavailable',
        type: 'POSITION_UNAVAILABLE',
      });
    });

    it('should handle TIMEOUT error', async () => {
      const mockError: GeolocationPositionError = {
        code: 3,
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await expect(GeolocationService.getCurrentLocation()).rejects.toEqual({
        code: 3,
        message: 'Location request timed out',
        type: 'TIMEOUT',
      });
    });
  });

  describe('watchPosition', () => {
    it('should call onSuccess with location data', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const watchId = 123;

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition);
        return watchId;
      });

      const result = GeolocationService.watchPosition(onSuccess, onError);

      expect(result).toBe(watchId);
      expect(onSuccess).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194,
        is_anonymous: false,
      });
    });

    it('should call onError when geolocation is not supported', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const result = GeolocationService.watchPosition(onSuccess, onError);

      expect(result).toBe(-1);
      expect(onError).toHaveBeenCalledWith({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED',
      });
      
      // Restore navigator
      global.navigator = originalNavigator;
    });

    it('should handle position errors', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const mockError: GeolocationPositionError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.watchPosition.mockImplementation((success, error) => {
        error(mockError);
        return 123;
      });

      GeolocationService.watchPosition(onSuccess, onError);

      expect(onError).toHaveBeenCalledWith({
        code: 1,
        message: 'Location access denied by user',
        type: 'PERMISSION_DENIED',
      });
    });
  });

  describe('clearWatch', () => {
    it('should call navigator.geolocation.clearWatch when supported', () => {
      const watchId = 123;
      GeolocationService.clearWatch(watchId);

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should not throw when geolocation is not supported', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      expect(() => GeolocationService.clearWatch(123)).not.toThrow();
      
      // Restore navigator
      global.navigator = originalNavigator;
    });
  });
});