import { describe, it, expect, beforeEach } from 'vitest';
import {
    FlightRoutingService,
    TerrainType,
    TERRAIN_MODIFIERS,
    GraphNode,
    PathResult
} from '@/services/routing';
import { LocationData } from '@/types';

describe('FlightRoutingService', () => {
    let routingService: FlightRoutingService;

    beforeEach(() => {
        routingService = new FlightRoutingService();
    });

    describe('generateWaypoints', () => {
        it('should generate waypoints along a great circle route', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const end: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London

            const waypoints = routingService.generateWaypoints(start, end, 1000);

            expect(waypoints.length).toBeGreaterThan(2);
            expect(waypoints[0].location).toEqual(start);
            expect(waypoints[waypoints.length - 1].location).toEqual(end);

            // Check that waypoints have proper structure
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
            const end: LocationData = { latitude: 0, longitude: 10, is_anonymous: false }; // ~1111km

            const waypoints = routingService.generateWaypoints(start, end, 500);

            // Should have at least 3 waypoints for this distance with 500km segments
            expect(waypoints.length).toBeGreaterThanOrEqual(3);
        });

        it('should handle short distances', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false };
            const end: LocationData = { latitude: 40.7589, longitude: -73.9851, is_anonymous: false }; // ~6km

            const waypoints = routingService.generateWaypoints(start, end, 500);

            expect(waypoints.length).toBe(2); // Just start and end for short distances
        });
    });

    describe('terrain detection', () => {
        it('should detect ocean terrain', () => {
            const oceanLocation: LocationData = { latitude: 30, longitude: -40, is_anonymous: false }; // Atlantic
            const waypoints = routingService.generateWaypoints(oceanLocation, oceanLocation, 100);

            expect(waypoints[0].terrain).toBe(TerrainType.OCEAN);
        });

        it('should detect mountain terrain', () => {
            const mountainLocation: LocationData = { latitude: 40, longitude: -110, is_anonymous: false }; // Rocky Mountains
            const waypoints = routingService.generateWaypoints(mountainLocation, mountainLocation, 100);

            expect(waypoints[0].terrain).toBe(TerrainType.MOUNTAIN);
        });

        it('should detect desert terrain', () => {
            const desertLocation: LocationData = { latitude: 23, longitude: 15, is_anonymous: false }; // Sahara
            const waypoints = routingService.generateWaypoints(desertLocation, desertLocation, 100);

            expect(waypoints[0].terrain).toBe(TerrainType.DESERT);
        });

        it('should default to land terrain for unknown areas', () => {
            const landLocation: LocationData = { latitude: 45, longitude: 2, is_anonymous: false }; // France
            const waypoints = routingService.generateWaypoints(landLocation, landLocation, 100);

            expect(waypoints[0].terrain).toBe(TerrainType.LAND);
        });
    });

    describe('altitude calculation', () => {
        it('should assign appropriate altitudes based on terrain', () => {
            const locations = [
                { lat: 30, lon: -40, expectedTerrain: TerrainType.OCEAN, expectedAltitude: 100 },
                { lat: 40, lon: -110, expectedTerrain: TerrainType.MOUNTAIN, expectedAltitude: 3000 },
                { lat: 23, lon: 15, expectedTerrain: TerrainType.DESERT, expectedAltitude: 1000 },
                { lat: 45, lon: 2, expectedTerrain: TerrainType.LAND, expectedAltitude: 600 }
            ];

            locations.forEach(({ lat, lon, expectedTerrain, expectedAltitude }) => {
                const location: LocationData = { latitude: lat, longitude: lon, is_anonymous: false };
                const waypoints = routingService.generateWaypoints(location, location, 100);

                expect(waypoints[0].terrain).toBe(expectedTerrain);
                expect(waypoints[0].altitude).toBe(expectedAltitude);
            });
        });
    });

    describe('buildGraph', () => {
        it('should create nodes and edges from waypoints', () => {
            const start: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
            const end: LocationData = { latitude: 1, longitude: 1, is_anonymous: false };

            const waypoints = routingService.generateWaypoints(start, end, 100);
            routingService.buildGraph(waypoints);

            // Graph should be built (we can't directly test private members, but we can test the result)
            const result = routingService.findOptimalPath(waypoints[0].id, waypoints[waypoints.length - 1].id);
            expect(result).not.toBeNull();
        });
    });

    describe('findOptimalPath (Dijkstra\'s algorithm)', () => {
        it('should find a path between two points', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const end: LocationData = { latitude: 34.0522, longitude: -118.2437, is_anonymous: false }; // Los Angeles

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.path.length).toBeGreaterThan(1);
            expect(result!.totalDistance).toBeGreaterThan(0);
            expect(result!.totalCost).toBeGreaterThan(0);
            expect(result!.waypoints.length).toBe(result!.path.length);
        });

        it('should return null for invalid node IDs', () => {
            const start: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
            const end: LocationData = { latitude: 1, longitude: 1, is_anonymous: false };

            const waypoints = routingService.generateWaypoints(start, end, 100);
            routingService.buildGraph(waypoints);

            const result = routingService.findOptimalPath('invalid_start', 'invalid_end');
            expect(result).toBeNull();
        });

        it('should handle single waypoint routes', () => {
            const location: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
            const waypoints = routingService.generateWaypoints(location, location, 100);

            expect(waypoints.length).toBe(2); // Start and end are the same, but we still get 2 waypoints
        });
    });

    describe('calculateRoute', () => {
        it('should calculate complete route with waypoints', () => {
            const start: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London
            const end: LocationData = { latitude: 48.8566, longitude: 2.3522, is_anonymous: false }; // Paris

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.waypoints.length).toBeGreaterThan(0);

            // Check waypoint structure
            result!.waypoints.forEach(waypoint => {
                expect(waypoint).toHaveProperty('latitude');
                expect(waypoint).toHaveProperty('longitude');
                expect(waypoint).toHaveProperty('altitude');
                expect(waypoint).toHaveProperty('timestamp');
                expect(waypoint.altitude).toBeGreaterThan(0);
            });

            // First waypoint should be near start location
            const firstWaypoint = result!.waypoints[0];
            expect(Math.abs(firstWaypoint.latitude - start.latitude)).toBeLessThan(0.1);
            expect(Math.abs(firstWaypoint.longitude - start.longitude)).toBeLessThan(0.1);

            // Last waypoint should be near end location
            const lastWaypoint = result!.waypoints[result!.waypoints.length - 1];
            expect(Math.abs(lastWaypoint.latitude - end.latitude)).toBeLessThan(0.1);
            expect(Math.abs(lastWaypoint.longitude - end.longitude)).toBeLessThan(0.1);
        });

        it('should handle transcontinental routes', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const end: LocationData = { latitude: 35.6762, longitude: 139.6503, is_anonymous: false }; // Tokyo

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeGreaterThan(10000); // Should be over 10,000km
            expect(result!.waypoints.length).toBeGreaterThan(5); // Should have multiple waypoints
        });

        it('should handle polar routes', () => {
            const start: LocationData = { latitude: 70, longitude: -100, is_anonymous: false }; // Arctic
            const end: LocationData = { latitude: 60, longitude: 100, is_anonymous: false }; // Siberia

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeGreaterThan(0);
        });
    });

    describe('recalculateRoute', () => {
        it('should recalculate route from current position', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const current: LocationData = { latitude: 42.3601, longitude: -71.0589, is_anonymous: false }; // Boston
            const end: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London

            const originalRoute = routingService.calculateRoute(start, end);
            const recalculatedRoute = routingService.recalculateRoute(current, end);

            expect(originalRoute).not.toBeNull();
            expect(recalculatedRoute).not.toBeNull();
            expect(recalculatedRoute!.totalDistance).toBeLessThan(originalRoute!.totalDistance);
        });

        it('should avoid specified areas when recalculating', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const end: LocationData = { latitude: 51.5074, longitude: -0.1278, is_anonymous: false }; // London
            const avoidArea: LocationData = { latitude: 45, longitude: -35, is_anonymous: false }; // Mid-Atlantic

            const normalRoute = routingService.recalculateRoute(start, end);
            const avoidingRoute = routingService.recalculateRoute(start, end, [avoidArea]);

            expect(normalRoute).not.toBeNull();
            expect(avoidingRoute).not.toBeNull();

            // Routes might be different, but both should be valid
            expect(avoidingRoute!.waypoints.length).toBeGreaterThan(0);
        });
    });

    describe('terrain modifiers', () => {
        it('should apply correct terrain modifiers', () => {
            expect(TERRAIN_MODIFIERS[TerrainType.OCEAN]).toBe(1.2);
            expect(TERRAIN_MODIFIERS[TerrainType.LAND]).toBe(1.0);
            expect(TERRAIN_MODIFIERS[TerrainType.MOUNTAIN]).toBe(0.7);
            expect(TERRAIN_MODIFIERS[TerrainType.DESERT]).toBe(0.8);
            expect(TERRAIN_MODIFIERS[TerrainType.FOREST]).toBe(0.9);
            expect(TERRAIN_MODIFIERS[TerrainType.URBAN]).toBe(0.95);
        });

        it('should prefer ocean routes over mountain routes', () => {
            // Create two routes: one over ocean, one over mountains
            const start: LocationData = { latitude: 30, longitude: -80, is_anonymous: false }; // Atlantic coast
            const oceanEnd: LocationData = { latitude: 30, longitude: -40, is_anonymous: false }; // Mid-Atlantic
            const mountainEnd: LocationData = { latitude: 40, longitude: -110, is_anonymous: false }; // Rocky Mountains

            const oceanRoute = routingService.calculateRoute(start, oceanEnd);
            const mountainRoute = routingService.calculateRoute(start, mountainEnd);

            expect(oceanRoute).not.toBeNull();
            expect(mountainRoute).not.toBeNull();

            // Ocean route should have lower cost per km due to terrain modifier
            const oceanCostPerKm = oceanRoute!.totalCost / oceanRoute!.totalDistance;
            const mountainCostPerKm = mountainRoute!.totalCost / mountainRoute!.totalDistance;

            expect(oceanCostPerKm).toBeLessThan(mountainCostPerKm);
        });
    });

    describe('edge cases', () => {
        it('should handle identical start and end locations', () => {
            const location: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false };

            const result = routingService.calculateRoute(location, location);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeLessThan(0.1); // Very small distance due to identical locations
            expect(result!.waypoints.length).toBe(2); // Start and end waypoints
        });

        it('should handle very short distances', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false };
            const end: LocationData = { latitude: 40.7129, longitude: -74.0061, is_anonymous: false }; // ~100m away

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeLessThan(1); // Less than 1km
            expect(result!.waypoints.length).toBe(2); // Just start and end
        });

        it('should handle antipodal points', () => {
            const start: LocationData = { latitude: 40.7128, longitude: -74.0060, is_anonymous: false }; // New York
            const end: LocationData = { latitude: -40.7128, longitude: 105.9940, is_anonymous: false }; // Antipodal point

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeGreaterThan(19000); // Should be close to half Earth's circumference
        });

        it('should handle routes crossing the international date line', () => {
            const start: LocationData = { latitude: 35.6762, longitude: 139.6503, is_anonymous: false }; // Tokyo
            const end: LocationData = { latitude: 37.7749, longitude: -122.4194, is_anonymous: false }; // San Francisco

            const result = routingService.calculateRoute(start, end);

            expect(result).not.toBeNull();
            expect(result!.totalDistance).toBeGreaterThan(8000); // Trans-Pacific distance
            expect(result!.waypoints.length).toBeGreaterThan(5);
        });
    });

    describe('performance', () => {
        it('should handle large numbers of waypoints efficiently', () => {
            const start: LocationData = { latitude: 0, longitude: 0, is_anonymous: false };
            const end: LocationData = { latitude: 0, longitude: 180, is_anonymous: false }; // Half way around the world

            const startTime = Date.now();
            const result = routingService.calculateRoute(start, end);
            const endTime = Date.now();

            expect(result).not.toBeNull();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle multiple route calculations', () => {
            const locations = [
                { latitude: 40.7128, longitude: -74.0060 }, // New York
                { latitude: 51.5074, longitude: -0.1278 },  // London
                { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
                { latitude: -33.8688, longitude: 151.2093 }, // Sydney
                { latitude: 55.7558, longitude: 37.6176 }   // Moscow
            ];

            const startTime = Date.now();

            for (let i = 0; i < locations.length - 1; i++) {
                const start: LocationData = { ...locations[i], is_anonymous: false };
                const end: LocationData = { ...locations[i + 1], is_anonymous: false };

                const result = routingService.calculateRoute(start, end);
                expect(result).not.toBeNull();
            }

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(2000); // Should complete all routes within 2 seconds
        });
    });
});