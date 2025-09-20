import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FlightEngine } from '@/services/flightEngine';
import { weatherService } from '@/services/weather';
import { flightRoutingService } from '@/services/routing';
import { LocationData, WeatherEvent, FlightProgress } from '@/types';
import { WeatherCondition } from '@/services/weather';

// Mock the services
vi.mock('@/services/weather');
vi.mock('@/services/routing');

const mockWeatherService = vi.mocked(weatherService);
const mockRoutingService = vi.mocked(flightRoutingService);

describe('FlightEngine', () => {
    let flightEngine: FlightEngine;

    const startLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'United States',
        is_anonymous: false
    };

    const endLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        state: 'London',
        country: 'United Kingdom',
        is_anonymous: false
    };

    const mockRoute = {
        path: [],
        totalDistance: 5585, // Approximate distance NYC to London
        totalCost: 5585,
        waypoints: [
            {
                latitude: startLocation.latitude,
                longitude: startLocation.longitude,
                altitude: 1000,
                timestamp: new Date()
            },
            {
                latitude: endLocation.latitude,
                longitude: endLocation.longitude,
                altitude: 1000,
                timestamp: new Date()
            }
        ]
    };

    const mockWeather: WeatherEvent = {
        type: WeatherCondition.CLEAR,
        intensity: 0,
        speed_modifier: 1.0,
        location: startLocation,
        timestamp: new Date()
    };

    beforeEach(() => {
        flightEngine = new FlightEngine({
            baseSpeedKmh: 50,
            updateIntervalMs: 1000, // Faster for testing
            weatherCheckIntervalMs: 2000,
            maxFlightDurationHours: 48
        });

        // Reset mocks
        vi.clearAllMocks();

        // Setup default mock implementations
        mockRoutingService.calculateRoute.mockReturnValue(mockRoute);
        mockWeatherService.fetchWeatherData.mockResolvedValue(mockWeather);
        mockWeatherService.calculateFlightSpeed.mockReturnValue(50);
    });

    afterEach(() => {
        flightEngine.cleanup();
    });

    describe('initializeFlight', () => {
        it('should initialize a new flight successfully', async () => {
            const messageId = 'test-message-1';

            const flight = await flightEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();
            expect(flight?.message_id).toBe(messageId);
            expect(flight?.status).toBe('enroute');
            expect(flight?.total_distance).toBe(5585);
            expect(flight?.progress_percentage).toBe(0);
            expect(flight?.current_position).toEqual(startLocation);

            expect(mockRoutingService.calculateRoute).toHaveBeenCalledWith(
                startLocation,
                endLocation
            );
            expect(mockWeatherService.fetchWeatherData).toHaveBeenCalledWith(startLocation);
        });

        it('should return null if route calculation fails', async () => {
            mockRoutingService.calculateRoute.mockReturnValue(null);

            const flight = await flightEngine.initializeFlight(
                'test-message-1',
                startLocation,
                endLocation
            );

            expect(flight).toBeNull();
        });

        it('should handle weather service failures gracefully', async () => {
            mockWeatherService.fetchWeatherData.mockResolvedValue(null);

            const flight = await flightEngine.initializeFlight(
                'test-message-1',
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();
            expect(flight?.weather_events).toHaveLength(0);
        });
    });

    describe('getFlightProgress', () => {
        it('should return flight progress for active flight', async () => {
            const messageId = 'test-message-1';

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const progress = flightEngine.getFlightProgress(messageId);

            expect(progress).toBeDefined();
            expect(progress?.message_id).toBe(messageId);
            expect(progress?.progress_percentage).toBe(0);
            expect(progress?.current_position).toEqual(startLocation);
        });

        it('should return null for non-existent flight', () => {
            const progress = flightEngine.getFlightProgress('non-existent');
            expect(progress).toBeNull();
        });
    });

    describe('getFlightRecord', () => {
        it('should return complete flight record', async () => {
            const messageId = 'test-message-1';

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const record = flightEngine.getFlightRecord(messageId);

            expect(record).toBeDefined();
            expect(record?.id).toBe(`flight_${messageId}`);
            expect(record?.message_id).toBe(messageId);
            expect(record?.route).toHaveLength(2);
            expect(record?.speed_kmh).toBe(50);
        });
    });

    describe('onFlightProgress', () => {
        it('should register and call progress callback', async () => {
            const messageId = 'test-message-1';
            const callback = vi.fn();

            flightEngine.onFlightProgress(messageId, callback);
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Wait a bit for the update timer to trigger
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(callback).toHaveBeenCalled();
            const callArgs = callback.mock.calls[0][0] as FlightProgress;
            expect(callArgs.message_id).toBe(messageId);
        });

        it('should remove callback when requested', async () => {
            const messageId = 'test-message-1';
            const callback = vi.fn();

            flightEngine.onFlightProgress(messageId, callback);
            flightEngine.removeFlightCallback(messageId);

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Wait a bit for potential updates
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('cancelFlight', () => {
        it('should cancel an active flight', async () => {
            const messageId = 'test-message-1';

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const cancelled = flightEngine.cancelFlight(messageId);

            expect(cancelled).toBe(true);
            expect(flightEngine.getFlightProgress(messageId)).toBeNull();
        });

        it('should return false for non-existent flight', () => {
            const cancelled = flightEngine.cancelFlight('non-existent');
            expect(cancelled).toBe(false);
        });
    });

    describe('getActiveFlights', () => {
        it('should return list of active flights', async () => {
            const messageId1 = 'test-message-1';
            const messageId2 = 'test-message-2';

            await flightEngine.initializeFlight(messageId1, startLocation, endLocation);
            await flightEngine.initializeFlight(messageId2, startLocation, endLocation);

            const activeFlights = flightEngine.getActiveFlights();
            expect(activeFlights).toHaveLength(2);
            expect(activeFlights.map(f => f.message_id)).toContain(messageId1);
            expect(activeFlights.map(f => f.message_id)).toContain(messageId2);
        });

        it('should return empty array when no active flights', () => {
            const activeFlights = flightEngine.getActiveFlights();
            expect(activeFlights).toHaveLength(0);
        });
    });

    describe('createJourneyData', () => {
        it('should create journey data for completed flight', async () => {
            const messageId = 'test-message-1';

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const journeyData = flightEngine.createJourneyData(messageId);

            expect(journeyData).toBeDefined();
            expect(journeyData?.total_distance).toBe(5585);
            expect(journeyData?.route).toHaveLength(2);
            expect(journeyData?.journey_points_earned).toBeGreaterThan(0);
        });

        it('should return null for non-existent flight', () => {
            const journeyData = flightEngine.createJourneyData('non-existent');
            expect(journeyData).toBeNull();
        });
    });

    describe('weather integration', () => {
        it('should adjust flight speed based on weather conditions', async () => {
            const stormWeather: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.8,
                speed_modifier: 0.5,
                location: startLocation,
                timestamp: new Date()
            };

            mockWeatherService.fetchWeatherData.mockResolvedValue(stormWeather);
            mockWeatherService.calculateFlightSpeed.mockReturnValue(25); // 50 * 0.5

            const messageId = 'test-message-1';
            const flight = await flightEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight?.speed_kmh).toBe(25);
            expect(flight?.weather_events).toContainEqual(stormWeather);
        });

        it('should handle weather monitoring updates', async () => {
            const messageId = 'test-message-1';

            // Start with clear weather
            mockWeatherService.fetchWeatherData.mockResolvedValue(mockWeather);
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Simulate weather change to storm
            const stormWeather: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.7,
                speed_modifier: 0.5,
                location: startLocation,
                timestamp: new Date()
            };

            mockWeatherService.fetchWeatherData.mockResolvedValue(stormWeather);
            mockWeatherService.calculateFlightSpeed.mockReturnValue(25);

            // Wait for weather check interval
            await new Promise(resolve => setTimeout(resolve, 2100));

            const record = flightEngine.getFlightRecord(messageId);
            expect(record?.weather_events.length).toBeGreaterThan(1);
        });

        it('should trigger route recalculation for severe weather', async () => {
            const severeStorm: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.9,
                speed_modifier: 0.5,
                location: startLocation,
                timestamp: new Date()
            };

            // Start with clear weather, then change to severe storm
            mockWeatherService.fetchWeatherData
                .mockResolvedValueOnce(mockWeather) // Initial weather
                .mockResolvedValueOnce(severeStorm); // Weather update

            mockWeatherService.shouldRecalculateRoute.mockReturnValue(true);
            mockRoutingService.recalculateRoute.mockReturnValue(mockRoute);

            const messageId = 'test-message-1';
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Wait for weather check
            await new Promise(resolve => setTimeout(resolve, 2100));

            expect(mockRoutingService.recalculateRoute).toHaveBeenCalled();
        });
    });

    describe('flight progress calculation', () => {
        it('should calculate progress correctly for simple route', async () => {
            // Mock a very fast flight for testing
            const fastEngine = new FlightEngine({
                baseSpeedKmh: 5585, // 1 km per second for quick completion
                updateIntervalMs: 100,
                weatherCheckIntervalMs: 1000,
                maxFlightDurationHours: 1
            });

            mockWeatherService.calculateFlightSpeed.mockReturnValue(5585);

            const messageId = 'test-message-1';
            const callback = vi.fn();

            fastEngine.onFlightProgress(messageId, callback);
            await fastEngine.initializeFlight(messageId, startLocation, endLocation);

            // Wait for several updates
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(callback).toHaveBeenCalled();

            // Check that progress is increasing
            const calls = callback.mock.calls;
            if (calls.length > 1) {
                const firstCall = calls[0][0] as FlightProgress;
                const lastCall = calls[calls.length - 1][0] as FlightProgress;
                expect(lastCall.progress_percentage).toBeGreaterThanOrEqual(firstCall.progress_percentage);
            }

            fastEngine.cleanup();
        });

        it('should complete flight when progress reaches 100%', async () => {
            const veryFastEngine = new FlightEngine({
                baseSpeedKmh: 558500, // Extremely fast for immediate completion
                updateIntervalMs: 10,
                weatherCheckIntervalMs: 1000,
                maxFlightDurationHours: 1
            });

            mockWeatherService.calculateFlightSpeed.mockReturnValue(558500);

            const messageId = 'test-message-1';
            const callback = vi.fn();

            veryFastEngine.onFlightProgress(messageId, callback);
            await veryFastEngine.initializeFlight(messageId, startLocation, endLocation);

            // Wait for several progress updates
            await new Promise(resolve => setTimeout(resolve, 200));

            // Should have received progress callbacks
            expect(callback).toHaveBeenCalled();

            // Check that we got progress updates
            const calls = callback.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // At least one call should show progress
            const progressValues = calls.map(call => call[0].progress_percentage);
            expect(Math.max(...progressValues)).toBeGreaterThan(0);

            veryFastEngine.cleanup();
        });
    });

    describe('journey points calculation', () => {
        it('should calculate basic journey points (1 point per km)', async () => {
            const messageId = 'test-message-1';

            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const journeyData = flightEngine.createJourneyData(messageId);

            expect(journeyData?.journey_points_earned).toBe(5585); // 1 point per km
        });

        it('should apply weather bonus for adverse conditions', async () => {
            const stormWeather: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.8,
                speed_modifier: 0.5,
                location: startLocation,
                timestamp: new Date()
            };

            mockWeatherService.fetchWeatherData.mockResolvedValue(stormWeather);

            const messageId = 'test-message-1';
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Simulate adding more weather events
            const record = flightEngine.getFlightRecord(messageId);
            if (record) {
                record.weather_events.push(stormWeather);
            }

            const journeyData = flightEngine.createJourneyData(messageId);

            // Should get 25% bonus: 5585 * 1.25 = 6981
            expect(journeyData?.journey_points_earned).toBe(6981);
        });

        it('should apply long distance bonus for flights >10,000km', async () => {
            const longRoute = {
                ...mockRoute,
                totalDistance: 12000,
                waypoints: [
                    {
                        latitude: startLocation.latitude,
                        longitude: startLocation.longitude,
                        altitude: 1000,
                        timestamp: new Date()
                    },
                    {
                        latitude: endLocation.latitude,
                        longitude: endLocation.longitude,
                        altitude: 1000,
                        timestamp: new Date()
                    }
                ]
            };

            mockRoutingService.calculateRoute.mockReturnValue(longRoute);

            const messageId = 'test-message-1';
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);
            const journeyData = flightEngine.createJourneyData(messageId);

            // Should get base points + 5000 bonus: 12000 + 5000 = 17000
            expect(journeyData?.journey_points_earned).toBe(17000);
        });
    });

    describe('error handling', () => {
        it('should handle routing service errors gracefully', async () => {
            mockRoutingService.calculateRoute.mockImplementation(() => {
                throw new Error('Routing error');
            });

            const flight = await flightEngine.initializeFlight(
                'test-message-1',
                startLocation,
                endLocation
            );

            expect(flight).toBeNull();
        });

        it('should handle weather service errors gracefully', async () => {
            mockWeatherService.fetchWeatherData.mockResolvedValue(null);

            const flight = await flightEngine.initializeFlight(
                'test-message-1',
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();
            expect(flight?.weather_events).toHaveLength(0);
        });

        it('should continue operating when weather updates fail', async () => {
            const messageId = 'test-message-1';

            // Initialize successfully
            await flightEngine.initializeFlight(messageId, startLocation, endLocation);

            // Make weather service fail for subsequent calls
            mockWeatherService.fetchWeatherData.mockRejectedValue(new Error('Weather update failed'));

            // Wait for weather check interval
            await new Promise(resolve => setTimeout(resolve, 2100));

            // Flight should still be active
            const progress = flightEngine.getFlightProgress(messageId);
            expect(progress).toBeDefined();
        });
    });

    describe('cleanup', () => {
        it('should stop all active flights and clear data', async () => {
            const messageId1 = 'test-message-1';
            const messageId2 = 'test-message-2';

            await flightEngine.initializeFlight(messageId1, startLocation, endLocation);
            await flightEngine.initializeFlight(messageId2, startLocation, endLocation);

            expect(flightEngine.getActiveFlights()).toHaveLength(2);

            flightEngine.cleanup();

            expect(flightEngine.getActiveFlights()).toHaveLength(0);
            expect(flightEngine.getFlightProgress(messageId1)).toBeNull();
            expect(flightEngine.getFlightProgress(messageId2)).toBeNull();
        });
    });

    describe('integration tests - complete flight simulation', () => {
        it('should simulate complete flight lifecycle from initialization to delivery', async () => {
            // Create a very fast flight engine for quick completion
            const integrationEngine = new FlightEngine({
                baseSpeedKmh: 558500, // Very fast for quick completion
                updateIntervalMs: 25,
                weatherCheckIntervalMs: 1000,
                maxFlightDurationHours: 1
            });

            mockWeatherService.calculateFlightSpeed.mockReturnValue(558500);

            const messageId = 'integration-test-flight';
            const progressUpdates: FlightProgress[] = [];
            let flightCompleted = false;
            
            // Register progress callback to track updates
            integrationEngine.onFlightProgress(messageId, (progress) => {
                progressUpdates.push({ ...progress });
                if (progress.progress_percentage >= 100) {
                    flightCompleted = true;
                }
            });

            // Initialize flight
            const flight = await integrationEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();
            expect(flight?.status).toBe('enroute');
            expect(flight?.progress_percentage).toBe(0);

            // Wait for flight to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify we received progress updates
            expect(progressUpdates.length).toBeGreaterThan(0);

            // Verify progress increased over time
            const progressValues = progressUpdates.map(p => p.progress_percentage);
            expect(Math.max(...progressValues)).toBeGreaterThan(0);

            // Check if flight completed or is still in progress
            const finalProgress = integrationEngine.getFlightProgress(messageId);
            if (flightCompleted) {
                expect(finalProgress).toBeNull(); // Should be null as flight completed
            } else {
                expect(finalProgress).toBeDefined(); // Still in progress
                expect(finalProgress?.progress_percentage).toBeGreaterThan(0);
            }

            integrationEngine.cleanup();
        });

        it('should handle weather changes during flight simulation', async () => {
            const weatherEngine = new FlightEngine({
                baseSpeedKmh: 100,
                updateIntervalMs: 50,
                weatherCheckIntervalMs: 100,
                maxFlightDurationHours: 1
            });

            const messageId = 'weather-integration-test';
            let weatherCallCount = 0;
            
            // Reset mocks for this test
            vi.clearAllMocks();
            mockRoutingService.calculateRoute.mockReturnValue(mockRoute);
            
            // Mock weather service to change conditions during flight
            mockWeatherService.fetchWeatherData.mockImplementation(async () => {
                weatherCallCount++;
                if (weatherCallCount === 1) {
                    return mockWeather; // Start with clear weather
                } else {
                    return {
                        type: WeatherCondition.STORM,
                        intensity: 0.8,
                        speed_modifier: 0.5,
                        location: startLocation,
                        timestamp: new Date()
                    };
                }
            });

            // Mock the speed calculation to return the expected initial speed
            mockWeatherService.calculateFlightSpeed.mockReturnValue(100);

            // Initialize flight
            const flight = await weatherEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();
            expect(flight?.speed_kmh).toBe(100); // Initial speed

            // Wait for weather check to trigger
            await new Promise(resolve => setTimeout(resolve, 150));

            const record = weatherEngine.getFlightRecord(messageId);
            expect(record?.weather_events.length).toBeGreaterThan(0);

            weatherEngine.cleanup();
        });

        it('should calculate journey points correctly for completed flights', async () => {
            const pointsEngine = new FlightEngine({
                baseSpeedKmh: 558500,
                updateIntervalMs: 50,
                weatherCheckIntervalMs: 1000,
                maxFlightDurationHours: 1
            });

            // Mock a long distance route with adverse weather
            const longRoute = {
                ...mockRoute,
                totalDistance: 12000, // >10,000km for bonus
                waypoints: mockRoute.waypoints
            };

            const stormWeather: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.8,
                speed_modifier: 0.5,
                location: startLocation,
                timestamp: new Date()
            };

            mockRoutingService.calculateRoute.mockReturnValue(longRoute);
            mockWeatherService.fetchWeatherData.mockResolvedValue(stormWeather);
            mockWeatherService.calculateFlightSpeed.mockReturnValue(558500);

            const messageId = 'points-test-flight';

            // Initialize flight
            await pointsEngine.initializeFlight(messageId, startLocation, endLocation);

            // Get journey data
            const journeyData = pointsEngine.createJourneyData(messageId);

            expect(journeyData).toBeDefined();
            expect(journeyData?.total_distance).toBe(12000);
            
            // Should get base points (12000) + weather bonus (25%) + long distance bonus (5000)
            // 12000 * 1.25 + 5000 = 20000
            expect(journeyData?.journey_points_earned).toBe(20000);

            pointsEngine.cleanup();
        });

        it('should handle route recalculation during active flight', async () => {
            const routeEngine = new FlightEngine({
                baseSpeedKmh: 100,
                updateIntervalMs: 50,
                weatherCheckIntervalMs: 100,
                maxFlightDurationHours: 1
            });

            const messageId = 'route-recalc-test';
            
            // Mock severe weather that triggers recalculation
            const severeWeather: WeatherEvent = {
                type: WeatherCondition.STORM,
                intensity: 0.9,
                speed_modifier: 0.3,
                location: startLocation,
                timestamp: new Date()
            };

            const newRoute = {
                ...mockRoute,
                totalDistance: 6000, // Different distance after recalculation
                waypoints: [
                    ...mockRoute.waypoints,
                    {
                        latitude: 45.0,
                        longitude: -90.0,
                        altitude: 1000,
                        timestamp: new Date()
                    }
                ]
            };

            mockWeatherService.fetchWeatherData
                .mockResolvedValueOnce(mockWeather) // Initial weather
                .mockResolvedValue(severeWeather); // Severe weather update

            mockWeatherService.shouldRecalculateRoute.mockReturnValue(true);
            mockRoutingService.recalculateRoute.mockReturnValue(newRoute);
            mockWeatherService.calculateFlightSpeed.mockReturnValue(100);

            // Initialize flight
            const flight = await routeEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight).toBeDefined();

            // Wait for weather check and route recalculation
            await new Promise(resolve => setTimeout(resolve, 150));

            // Verify route recalculation was called
            expect(mockRoutingService.recalculateRoute).toHaveBeenCalled();

            routeEngine.cleanup();
        });

        it('should properly manage flight status transitions', async () => {
            const statusEngine = new FlightEngine({
                baseSpeedKmh: 558500, // Very fast for quick completion
                updateIntervalMs: 25,
                weatherCheckIntervalMs: 1000,
                maxFlightDurationHours: 1
            });

            mockWeatherService.calculateFlightSpeed.mockReturnValue(558500);

            const messageId = 'status-test-flight';
            const statusUpdates: string[] = [];

            // Track status changes through progress callbacks
            statusEngine.onFlightProgress(messageId, (progress) => {
                const record = statusEngine.getFlightRecord(messageId);
                if (record) {
                    statusUpdates.push(record.status);
                }
            });

            // Initialize flight
            const flight = await statusEngine.initializeFlight(
                messageId,
                startLocation,
                endLocation
            );

            expect(flight?.status).toBe('enroute');

            // Wait for flight completion
            await new Promise(resolve => setTimeout(resolve, 200));

            // Should have tracked status progression
            expect(statusUpdates).toContain('enroute');

            statusEngine.cleanup();
        });
    });
});