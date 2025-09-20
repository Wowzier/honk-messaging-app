import { describe, it, expect, vi } from 'vitest';
import {
  formatLocationForSharing,
  anonymizeLocation,
  getLocationDisplayString,
  isValidLocation,
  normalizeLongitude,
  clampLatitude,
  createSafeLocation,
  generateRandomLocation,
  isLocationInBounds,
  createBoundingBox,
  mockReverseGeocode,
} from '@/utils/location';
import { LocationData } from '@/types';

describe('Location Utilities', () => {
  const testLocation: LocationData = {
    latitude: 37.7749,
    longitude: -122.4194,
    is_anonymous: false,
  };

  const testGeocodeResult = {
    state: 'California',
    country: 'United States',
    city: 'San Francisco',
  };

  describe('formatLocationForSharing', () => {
    it('should format location for state sharing', () => {
      const result = formatLocationForSharing(testLocation, 'state', testGeocodeResult);
      
      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        state: 'California',
        country: 'United States',
        is_anonymous: false,
      });
    });

    it('should format location for country sharing', () => {
      const result = formatLocationForSharing(testLocation, 'country', testGeocodeResult);
      
      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        country: 'United States',
        is_anonymous: false,
      });
    });

    it('should format location for anonymous sharing', () => {
      const result = formatLocationForSharing(testLocation, 'anonymous', testGeocodeResult);
      
      expect(result.is_anonymous).toBe(true);
      expect(result.latitude).toBeCloseTo(37.77, 2);
      expect(result.longitude).toBeCloseTo(-122.42, 2);
      expect(result.state).toBeUndefined();
      expect(result.country).toBeUndefined();
    });

    it('should handle missing geocode result', () => {
      const result = formatLocationForSharing(testLocation, 'state');
      
      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        state: undefined,
        country: undefined,
        is_anonymous: false,
      });
    });
  });

  describe('anonymizeLocation', () => {
    it('should reduce location precision', () => {
      const result = anonymizeLocation(testLocation);
      
      expect(result.latitude).toBe(37.77);
      expect(result.longitude).toBe(-122.42);
      expect(result.is_anonymous).toBe(true);
    });

    it('should handle edge cases', () => {
      const edgeLocation: LocationData = {
        latitude: 37.7777777,
        longitude: -122.4444444,
        is_anonymous: false,
      };
      
      const result = anonymizeLocation(edgeLocation);
      
      expect(result.latitude).toBe(37.78);
      expect(result.longitude).toBe(-122.44);
    });
  });

  describe('getLocationDisplayString', () => {
    it('should display anonymous location', () => {
      const anonymousLocation: LocationData = {
        ...testLocation,
        is_anonymous: true,
      };
      
      const result = getLocationDisplayString(anonymousLocation);
      expect(result).toBe('Anonymous Location');
    });

    it('should display state and country', () => {
      const locationWithState: LocationData = {
        ...testLocation,
        state: 'California',
        country: 'United States',
      };
      
      const result = getLocationDisplayString(locationWithState);
      expect(result).toBe('California, United States');
    });

    it('should display country only', () => {
      const locationWithCountry: LocationData = {
        ...testLocation,
        country: 'United States',
      };
      
      const result = getLocationDisplayString(locationWithCountry);
      expect(result).toBe('United States');
    });

    it('should display coordinates as fallback', () => {
      const result = getLocationDisplayString(testLocation);
      expect(result).toBe('37.8°, -122.4°');
    });
  });

  describe('isValidLocation', () => {
    it('should validate correct locations', () => {
      expect(isValidLocation(testLocation)).toBe(true);
      expect(isValidLocation({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidLocation({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isValidLocation({ latitude: -90, longitude: -180 })).toBe(true);
    });

    it('should reject invalid locations', () => {
      expect(isValidLocation({})).toBe(false);
      expect(isValidLocation({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidLocation({ latitude: -91, longitude: 0 })).toBe(false);
      expect(isValidLocation({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidLocation({ latitude: 0, longitude: -181 })).toBe(false);
    });
  });

  describe('normalizeLongitude', () => {
    it('should normalize longitude to -180 to 180 range', () => {
      expect(normalizeLongitude(0)).toBe(0);
      expect(normalizeLongitude(180)).toBe(180);
      expect(normalizeLongitude(-180)).toBe(-180);
      expect(normalizeLongitude(181)).toBe(-179);
      expect(normalizeLongitude(-181)).toBe(179);
      expect(normalizeLongitude(360)).toBe(0);
      expect(normalizeLongitude(-360)).toBe(0);
      expect(normalizeLongitude(540)).toBe(180);
    });
  });

  describe('clampLatitude', () => {
    it('should clamp latitude to -90 to 90 range', () => {
      expect(clampLatitude(0)).toBe(0);
      expect(clampLatitude(90)).toBe(90);
      expect(clampLatitude(-90)).toBe(-90);
      expect(clampLatitude(91)).toBe(90);
      expect(clampLatitude(-91)).toBe(-90);
      expect(clampLatitude(180)).toBe(90);
    });
  });

  describe('createSafeLocation', () => {
    it('should create location with normalized coordinates', () => {
      const result = createSafeLocation(91, 181, true);
      
      expect(result.latitude).toBe(90);
      expect(result.longitude).toBe(-179);
      expect(result.is_anonymous).toBe(true);
    });

    it('should default to non-anonymous', () => {
      const result = createSafeLocation(37.7749, -122.4194);
      
      expect(result.is_anonymous).toBe(false);
    });
  });

  describe('generateRandomLocation', () => {
    it('should generate location within bounds', () => {
      const bounds = {
        north: 40,
        south: 30,
        east: -120,
        west: -130,
      };
      
      const location = generateRandomLocation(bounds);
      
      expect(location.latitude).toBeGreaterThanOrEqual(30);
      expect(location.latitude).toBeLessThanOrEqual(40);
      expect(location.longitude).toBeGreaterThanOrEqual(-130);
      expect(location.longitude).toBeLessThanOrEqual(-120);
    });
  });

  describe('isLocationInBounds', () => {
    const bounds = {
      north: 40,
      south: 30,
      east: -120,
      west: -130,
    };

    it('should return true for locations within bounds', () => {
      const insideLocation: LocationData = {
        latitude: 35,
        longitude: -125,
        is_anonymous: false,
      };
      
      expect(isLocationInBounds(insideLocation, bounds)).toBe(true);
    });

    it('should return false for locations outside bounds', () => {
      const outsideLocation: LocationData = {
        latitude: 45,
        longitude: -125,
        is_anonymous: false,
      };
      
      expect(isLocationInBounds(outsideLocation, bounds)).toBe(false);
    });

    it('should handle boundary locations', () => {
      const boundaryLocation: LocationData = {
        latitude: 40,
        longitude: -120,
        is_anonymous: false,
      };
      
      expect(isLocationInBounds(boundaryLocation, bounds)).toBe(true);
    });
  });

  describe('createBoundingBox', () => {
    it('should create bounding box around center point', () => {
      const center: LocationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        is_anonymous: false,
      };
      
      const bounds = createBoundingBox(center, 100); // 100km radius
      
      expect(bounds.north).toBeGreaterThan(center.latitude);
      expect(bounds.south).toBeLessThan(center.latitude);
      expect(bounds.east).toBeGreaterThan(center.longitude);
      expect(bounds.west).toBeLessThan(center.longitude);
    });

    it('should handle locations near poles', () => {
      const nearNorthPole: LocationData = {
        latitude: 89,
        longitude: 0,
        is_anonymous: false,
      };
      
      const bounds = createBoundingBox(nearNorthPole, 100);
      
      expect(bounds.north).toBeCloseTo(90, 0); // Clamped to pole
      expect(bounds.south).toBeLessThan(89);
    });
  });

  describe('mockReverseGeocode', () => {
    it('should return geocoding result for US coordinates', async () => {
      const usLocation: LocationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        is_anonymous: false,
      };
      
      const result = await mockReverseGeocode(usLocation);
      
      expect(result.country).toBe('United States');
      expect(result.state).toBeDefined();
    });

    it('should return geocoding result for Canadian coordinates', async () => {
      const canadaLocation: LocationData = {
        latitude: 45.4215,
        longitude: -75.6972,
        is_anonymous: false,
      };
      
      const result = await mockReverseGeocode(canadaLocation);
      
      expect(result.country).toBe('Canada');
    });

    it('should return geocoding result for European coordinates', async () => {
      const europeLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        is_anonymous: false,
      };
      
      const result = await mockReverseGeocode(europeLocation);
      
      expect(result.country).toBe('Europe');
    });

    it('should handle unknown locations', async () => {
      const unknownLocation: LocationData = {
        latitude: -30,
        longitude: 150,
        is_anonymous: false,
      };
      
      const result = await mockReverseGeocode(unknownLocation);
      
      expect(result.country).toBe('Unknown');
      expect(result.state).toBe('Unknown');
    });

    it('should simulate API delay', async () => {
      const startTime = Date.now();
      await mockReverseGeocode(testLocation);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});