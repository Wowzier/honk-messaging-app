import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  calculateDestination,
  calculateMidpoint,
  isTooBoringDistance,
  formatDistance,
  getDistanceCategory,
  getDistanceWeight,
} from '@/utils/distance';
import { LocationData } from '@/types';

describe('Distance Utilities', () => {
  // Test locations
  const sanFrancisco: LocationData = {
    latitude: 37.7749,
    longitude: -122.4194,
    is_anonymous: false,
  };

  const newYork: LocationData = {
    latitude: 40.7128,
    longitude: -74.0060,
    is_anonymous: false,
  };

  const london: LocationData = {
    latitude: 51.5074,
    longitude: -0.1278,
    is_anonymous: false,
  };

  const tokyo: LocationData = {
    latitude: 35.6762,
    longitude: 139.6503,
    is_anonymous: false,
  };

  describe('calculateDistance', () => {
    it('should calculate distance between San Francisco and New York', () => {
      const distance = calculateDistance(sanFrancisco, newYork);
      // Expected distance is approximately 4129 km
      expect(distance).toBeCloseTo(4129, 0);
    });

    it('should calculate distance between New York and London', () => {
      const distance = calculateDistance(newYork, london);
      // Expected distance is approximately 5570 km
      expect(distance).toBeCloseTo(5570, 0);
    });

    it('should calculate distance between San Francisco and Tokyo', () => {
      const distance = calculateDistance(sanFrancisco, tokyo);
      // Expected distance is approximately 8275 km
      expect(distance).toBeCloseTo(8275, 0);
    });

    it('should return 0 for identical locations', () => {
      const distance = calculateDistance(sanFrancisco, sanFrancisco);
      expect(distance).toBe(0);
    });

    it('should handle locations across the international date line', () => {
      const eastLocation: LocationData = {
        latitude: 35.6762,
        longitude: 179.0,
        is_anonymous: false,
      };
      const westLocation: LocationData = {
        latitude: 35.6762,
        longitude: -179.0,
        is_anonymous: false,
      };
      
      const distance = calculateDistance(eastLocation, westLocation);
      // Should be a short distance, not halfway around the world
      expect(distance).toBeLessThan(500);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing from San Francisco to New York', () => {
      const bearing = calculateBearing(sanFrancisco, newYork);
      // Expected bearing is approximately 70 degrees (northeast)
      expect(bearing).toBeCloseTo(70, 0);
    });

    it('should calculate bearing from New York to London', () => {
      const bearing = calculateBearing(newYork, london);
      // Expected bearing is approximately 51 degrees (northeast)
      expect(bearing).toBeCloseTo(51, 0);
    });

    it('should return bearing between 0 and 360 degrees', () => {
      const bearing = calculateBearing(tokyo, sanFrancisco);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should handle identical locations', () => {
      const bearing = calculateBearing(sanFrancisco, sanFrancisco);
      expect(bearing).toBe(0);
    });
  });

  describe('calculateDestination', () => {
    it('should calculate destination point from bearing and distance', () => {
      const distance = 1000; // 1000 km
      const bearing = 90; // Due east
      
      const destination = calculateDestination(sanFrancisco, distance, bearing);
      
      // Should be approximately 1000km east of San Francisco
      // Due to Earth's curvature, latitude will change slightly when going due east
      expect(Math.abs(destination.latitude - sanFrancisco.latitude)).toBeLessThan(1);
      expect(destination.longitude).toBeGreaterThan(sanFrancisco.longitude);
      
      // Verify the distance is correct
      const actualDistance = calculateDistance(sanFrancisco, destination);
      expect(actualDistance).toBeCloseTo(distance, 1);
    });

    it('should preserve anonymity setting', () => {
      const anonymousStart: LocationData = {
        ...sanFrancisco,
        is_anonymous: true,
      };
      
      const destination = calculateDestination(anonymousStart, 100, 0);
      expect(destination.is_anonymous).toBe(true);
    });
  });

  describe('calculateMidpoint', () => {
    it('should calculate midpoint between two locations', () => {
      const midpoint = calculateMidpoint(sanFrancisco, newYork);
      
      // Midpoint should be roughly in the middle of the US
      expect(midpoint.latitude).toBeCloseTo(41.8, 0);
      expect(midpoint.longitude).toBeCloseTo(-98.8, 0);
    });

    it('should preserve anonymity if either location is anonymous', () => {
      const anonymousLocation: LocationData = {
        ...sanFrancisco,
        is_anonymous: true,
      };
      
      const midpoint = calculateMidpoint(anonymousLocation, newYork);
      expect(midpoint.is_anonymous).toBe(true);
    });
  });

  describe('isTooBoringDistance', () => {
    it('should return true for distances less than 500km', () => {
      expect(isTooBoringDistance(100)).toBe(true);
      expect(isTooBoringDistance(499)).toBe(true);
    });

    it('should return false for distances 500km or greater', () => {
      expect(isTooBoringDistance(500)).toBe(false);
      expect(isTooBoringDistance(1000)).toBe(false);
    });
  });

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.123)).toBe('123m');
    });

    it('should format distances less than 10km with one decimal place', () => {
      expect(formatDistance(1.5)).toBe('1.5km');
      expect(formatDistance(9.7)).toBe('9.7km');
    });

    it('should format distances 10km or greater as whole numbers', () => {
      expect(formatDistance(10.7)).toBe('11km');
      expect(formatDistance(1234.5)).toBe('1235km');
    });
  });

  describe('getDistanceCategory', () => {
    it('should categorize distances correctly', () => {
      expect(getDistanceCategory(50)).toBe('local');
      expect(getDistanceCategory(300)).toBe('regional');
      expect(getDistanceCategory(1000)).toBe('national');
      expect(getDistanceCategory(5000)).toBe('continental');
      expect(getDistanceCategory(10000)).toBe('intercontinental');
    });

    it('should handle boundary values', () => {
      expect(getDistanceCategory(100)).toBe('regional');
      expect(getDistanceCategory(500)).toBe('national');
      expect(getDistanceCategory(2000)).toBe('continental');
      expect(getDistanceCategory(8000)).toBe('intercontinental');
    });
  });

  describe('getDistanceWeight', () => {
    it('should assign higher weights to longer distances', () => {
      const localWeight = getDistanceWeight(50);
      const regionalWeight = getDistanceWeight(300);
      const nationalWeight = getDistanceWeight(1000);
      const continentalWeight = getDistanceWeight(5000);
      const intercontinentalWeight = getDistanceWeight(10000);

      expect(localWeight).toBeLessThan(regionalWeight);
      expect(regionalWeight).toBeLessThan(nationalWeight);
      expect(nationalWeight).toBeLessThan(continentalWeight);
      expect(continentalWeight).toBeLessThan(intercontinentalWeight);
    });

    it('should return expected weight values', () => {
      expect(getDistanceWeight(50)).toBe(0.1); // local
      expect(getDistanceWeight(300)).toBe(0.3); // regional
      expect(getDistanceWeight(1000)).toBe(1.0); // national
      expect(getDistanceWeight(5000)).toBe(2.0); // continental
      expect(getDistanceWeight(10000)).toBe(3.0); // intercontinental
    });
  });
});