import { describe, it, expect, beforeEach } from 'vitest';
import { 
  FlightRoutingService, 
  TerrainType, 
  TERRAIN_MODIFIERS
} from '@/services/routing';
import { LocationData } from '@/types';

describe('FlightRoutingService - Core Requirements', () => {
  let routingService: FlightRoutingService;

  beforeEach(() => {
    routingService = new FlightRoutingService();
  });

  describe('Requirement 3.1: Route calculation using Dijkstra\'s algorithm', () => {
    it('should calculate routes between nearby locations', () => {
      const start: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London
      const end: LocationData = { latitude: 48.8566, longitude: 2.3522, is_anonymous: false }; // Paris

      const result = routingService.calculateRoute(start, end);

      expect(result).not.toBeNull();
      expect(result!.waypoints.length).toBeGreaterThan(0);
      expect(result!.totalDistance).toBeGreaterThan(300); // ~344km between London and Paris
      expect(result!.totalDistance).toBeLessThan(500);
    });

    it('should calculate routes between medium distance locations', () => {
      const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
      const end: LocationData = { latitude: 34.0522, longitude: -118.2437, is_anonymous: false }; // Los Angeles

      const result = routingService.calculateRoute(start, end);

      expect(result).not.toBeNull();
      expect(result!.waypoints.length).toBeGreaterThan(0);
      expect(result!.totalDistance).toBeGreaterThan(3000); // ~3944km between NY and LA
      expect(result!.totalDistance).toBeLessThan(5000);
    });

    it('should handle identical locations', () => {
      const location: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false };

      const result = routingService.calculateRoute(location, location);

      expect(result).not.toBeNull();
      expect(result!.totalDistance).toBeLessThan(0.1);
      expect(result!.waypoints.length).toBe(2);
    });
  });

  describe('Requirement 3.2: Waypoint generation along great circle routes', () => {
    it('should generate waypoints with proper structure', () => {
      const start: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
      const end: LocationData = { latitude: 10, longitude: 10, is_anonymous: false };

      const waypoints = routingService.generateWaypoints(start, end, 500);

      expect(waypoints.length).toBeGreaterThan(1);
      waypoints.forEach(waypoint => {
        expect(waypoint).toHaveProperty('id');
        expect(waypoint).toHaveProperty('location');
        expect(waypoint).toHaveProperty('terrain');
        expect(waypoint).toHaveProperty('altitude');
        expect(waypoint.altitude).toBeGreaterThan(0);
      });
    });

    it('should respect maximum segment distance', () => {
      const start: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
      const end: LocationData = { latitude: 0, longitude: 20, is_anonymous: false }; // ~2222km

      const waypoints = routingService.generateWaypoints(start, end, 500);
      
      expect(waypoints.length).toBeGreaterThanOrEqual(5); // Should need multiple segments
    });
  });

  describe('Terrain difficulty calculation', () => {
    it('should apply correct terrain modifiers', () => {
      expect(TERRAIN_MODIFIERS[TerrainType.OCEAN]).toBe(1.2); // Easier
      expect(TERRAIN_MODIFIERS[TerrainType.LAND]).toBe(1.0); // Baseline
      expect(TERRAIN_MODIFIERS[TerrainType.MOUNTAIN]).toBe(0.7); // Harder
      expect(TERRAIN_MODIFIERS[TerrainType.DESERT]).toBe(0.8); // Harder
    });

    it('should detect different terrain types', () => {
      const oceanLocation: LocationData = { latitude: 30, longitude: -40, is_anonymous: false };
      const mountainLocation: LocationData = { latitude: 40, longitude: -110, is_anonymous: false };
      const desertLocation: LocationData = { latitude: 23, longitude: 15, is_anonymous: false };
      const landLocation: LocationData = { latitude: 45, longitude: 2, is_anonymous: false };

      const oceanWaypoints = routingService.generateWaypoints(oceanLocation, oceanLocation, 100);
      const mountainWaypoints = routingService.generateWaypoints(mountainLocation, mountainLocation, 100);
      const desertWaypoints = routingService.generateWaypoints(desertLocation, desertLocation, 100);
      const landWaypoints = routingService.generateWaypoints(landLocation, landLocation, 100);

      expect(oceanWaypoints[0].terrain).toBe(TerrainType.OCEAN);
      expect(mountainWaypoints[0].terrain).toBe(TerrainType.MOUNTAIN);
      expect(desertWaypoints[0].terrain).toBe(TerrainType.DESERT);
      expect(landWaypoints[0].terrain).toBe(TerrainType.LAND);
    });
  });

  describe('Route optimization and path reconstruction', () => {
    it('should return valid route structure', () => {
      const start: LocationData = { latitude: 52.5200, longitude: 13.4050, is_anonymous: false }; // Berlin
      const end: LocationData = { latitude: 41.9028, longitude: 12.4964, is_anonymous: false }; // Rome

      const result = routingService.calculateRoute(start, end);

      expect(result).not.toBeNull();
      expect(result!).toHaveProperty('path');
      expect(result!).toHaveProperty('totalDistance');
      expect(result!).toHaveProperty('totalCost');
      expect(result!).toHaveProperty('waypoints');
      
      expect(result!.path.length).toBeGreaterThan(0);
      expect(result!.totalDistance).toBeGreaterThan(0);
      expect(result!.totalCost).toBeGreaterThan(0);
      expect(result!.waypoints.length).toBe(result!.path.length);
    });

    it('should generate waypoints with proper timestamps', () => {
      const start: LocationData = { latitude: 55.7558, longitude: 37.6176, is_anonymous: false }; // Moscow
      const end: LocationData = { latitude: 59.9311, longitude: 30.3609, is_anonymous: false }; // St. Petersburg

      const result = routingService.calculateRoute(start, end);

      expect(result).not.toBeNull();
      result!.waypoints.forEach((waypoint, index) => {
        expect(waypoint.timestamp).toBeInstanceOf(Date);
        if (index > 0) {
          expect(waypoint.timestamp.getTime()).toBeGreaterThanOrEqual(
            result!.waypoints[index - 1].timestamp.getTime()
          );
        }
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very short distances', () => {
      const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false };
      const end: LocationData = { latitude: 40.7129, longitude: -74.0061, is_anonymous: false }; // ~100m

      const result = routingService.calculateRoute(start, end);

      expect(result).not.toBeNull();
      expect(result!.totalDistance).toBeLessThan(1);
      expect(result!.waypoints.length).toBe(2);
    });

    it('should handle route recalculation', () => {
      const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
      const current: LocationData = { latitude: 42.3601, longitude: -71.0589, is_anonymous: false }; // Boston
      const end: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London

      const recalculatedRoute = routingService.recalculateRoute(current, end);

      expect(recalculatedRoute).not.toBeNull();
      expect(recalculatedRoute!.waypoints.length).toBeGreaterThan(0);
    });
  });
});