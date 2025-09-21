import { 
  LocationData, 
  FlightProgress, 
  WeatherEvent, 
  FlightRecord,
  RouteWaypoint,
  JourneyData
} from '@/types';
import { flightRoutingService, PathResult } from './routing';
import { weatherService } from './weather';
import { calculateDistance, calculateBearing, calculateDestination } from '@/utils/distance';

/**
 * Flight engine configuration
 */
interface FlightEngineConfig {
  baseSpeedKmh: number;
  updateIntervalMs: number;
  weatherCheckIntervalMs: number;
  maxFlightDurationHours: number;
}

/**
 * Default flight configuration
 */
const DEFAULT_CONFIG: FlightEngineConfig = {
  baseSpeedKmh: 50, // Base duck flight speed
  updateIntervalMs: 30000, // Update every 30 seconds
  weatherCheckIntervalMs: 300000, // Check weather every 5 minutes
  maxFlightDurationHours: 48 // Maximum flight duration
};

/**
 * Active flight tracking data
 */
interface ActiveFlight {
  record: FlightRecord;
  route: PathResult;
  currentWeather: WeatherEvent | null;
  lastWeatherCheck: number;
  lastUpdate: number;
  updateTimer?: NodeJS.Timeout;
  weatherTimer?: NodeJS.Timeout;
}

/**
 * Flight engine service for managing duck flights with weather integration
 */
export class FlightEngine {
  private config: FlightEngineConfig;
  private activeFlights: Map<string, ActiveFlight> = new Map();
  private flightCallbacks: Map<string, (progress: FlightProgress) => void> = new Map();

  constructor(config: Partial<FlightEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize a new flight
   */
  async initializeFlight(
    messageId: string,
    startLocation: LocationData,
    endLocation: LocationData
  ): Promise<FlightRecord | null> {
    try {
      // Calculate initial route
      const route = flightRoutingService.calculateRoute(startLocation, endLocation);
      if (!route) {
        console.error('Failed to calculate route for flight:', messageId);
        return null;
      }

      // Get initial weather conditions
      const initialWeather = await weatherService.fetchWeatherData(startLocation);

      // Create flight record
      const flightRecord: FlightRecord = {
        id: `flight_${messageId}`,
        message_id: messageId,
        status: 'enroute',
        route: route.waypoints,
        total_distance: route.totalDistance,
        estimated_duration: this.calculateEstimatedDuration(
          route.totalDistance, 
          initialWeather
        ),
        progress_percentage: 0,
        current_position: startLocation,
        speed_kmh: this.calculateCurrentSpeed(initialWeather),
        weather_events: initialWeather ? [initialWeather] : [],
        started_at: new Date(),
        updated_at: new Date(),
        estimated_arrival: new Date(
          Date.now() + this.calculateEstimatedDuration(route.totalDistance, initialWeather)
        )
      };

      // Create active flight tracking
      const activeFlight: ActiveFlight = {
        record: flightRecord,
        route,
        currentWeather: initialWeather,
        lastWeatherCheck: Date.now(),
        lastUpdate: Date.now()
      };

      this.activeFlights.set(messageId, activeFlight);

      // Start flight monitoring
      this.startFlightMonitoring(messageId);

      return flightRecord;
    } catch (error) {
      console.error('Error initializing flight:', error);
      return null;
    }
  }

  /**
   * Start monitoring an active flight
   */
  private startFlightMonitoring(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    // Clear existing timers
    this.stopFlightMonitoring(messageId);

    // Start progress update timer
    flight.updateTimer = setInterval(() => {
      this.updateFlightProgress(messageId);
    }, this.config.updateIntervalMs);

    // Start weather monitoring timer
    flight.weatherTimer = setInterval(() => {
      this.checkWeatherUpdates(messageId);
    }, this.config.weatherCheckIntervalMs);
  }

  /**
   * Stop monitoring a flight
   */
  private stopFlightMonitoring(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    if (flight.updateTimer) {
      clearInterval(flight.updateTimer);
      flight.updateTimer = undefined;
    }

    if (flight.weatherTimer) {
      clearInterval(flight.weatherTimer);
      flight.weatherTimer = undefined;
    }
  }

  /**
   * Update flight progress
   */
  private async updateFlightProgress(messageId: string): Promise<void> {
    const flight = this.activeFlights.get(messageId);
    if (!flight || flight.record.status !== 'enroute') return;

    try {
      const now = Date.now();
      const timeSinceLastUpdate = now - flight.lastUpdate;
      
      // Calculate distance traveled since last update
      const currentSpeed = this.calculateCurrentSpeed(flight.currentWeather);
      const distanceTraveled = (currentSpeed * timeSinceLastUpdate) / (1000 * 60 * 60); // Convert to km

      // Update current position along route
      const newPosition = this.calculateNewPosition(
        flight.record.current_position,
        flight.route.waypoints,
        distanceTraveled,
        flight.record.progress_percentage
      );

      // Update flight record
      flight.record.current_position = newPosition.position;
      flight.record.progress_percentage = Math.min(newPosition.progress, 100); // Ensure we don't exceed 100%
      flight.record.speed_kmh = currentSpeed;
      flight.record.updated_at = new Date();
      flight.lastUpdate = now;

      // Log detailed progress
      console.log(`
🦆 Flight ${messageId} Update:
   Progress: ${flight.record.progress_percentage.toFixed(2)}%
   Speed: ${currentSpeed.toFixed(2)} km/h
   Position: [${newPosition.position.latitude.toFixed(4)}, ${newPosition.position.longitude.toFixed(4)}]
   Distance covered: ${distanceTraveled.toFixed(2)}km
      `);

      // Check for arrival at destination
      const destination = flight.route.waypoints[flight.route.waypoints.length - 1];
      const distanceToDestination = calculateDistance(
        flight.record.current_position,
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
          is_anonymous: false
        }
      );

      // Complete flight if we're very close to destination or progress is 100%
      if (distanceToDestination < 0.1 || flight.record.progress_percentage >= 99.99) {
        console.log(`🎯 Flight ${messageId} has reached destination! (Distance remaining: ${distanceToDestination.toFixed(2)}km)`);
        await this.completeFlight(messageId);
        return;
      }

      // Update estimated arrival based on current conditions
      const remainingDistance = flight.record.total_distance * (1 - flight.record.progress_percentage / 100);
      const remainingTime = (remainingDistance / currentSpeed) * 60 * 60 * 1000; // Convert to ms
      flight.record.estimated_arrival = new Date(now + remainingTime);

      // Notify progress callback if registered
      const callback = this.flightCallbacks.get(messageId);
      if (callback) {
        const progress: FlightProgress = {
          message_id: messageId,
          current_position: flight.record.current_position,
          progress_percentage: flight.record.progress_percentage,
          estimated_arrival: flight.record.estimated_arrival,
          current_weather: flight.currentWeather || undefined
        };
        callback(progress);
      }

    } catch (error) {
      console.error('Error updating flight progress:', error);
    }
  }

  /**
   * Calculate new position along route
   */
  private calculateNewPosition(
    currentPosition: LocationData,
    waypoints: RouteWaypoint[],
    distanceTraveled: number,
    currentProgress: number
  ): { position: LocationData; progress: number } {
    
    if (waypoints.length < 2) {
      return { position: currentPosition, progress: currentProgress };
    }

    // Find current segment in route
    const totalDistance = this.calculateTotalRouteDistance(waypoints);
    const currentDistanceAlongRoute = (currentProgress / 100) * totalDistance;
    const newDistanceAlongRoute = Math.min(
      currentDistanceAlongRoute + distanceTraveled,
      totalDistance
    );

    console.log(`
📏 Route Calculations:
   Total route distance: ${totalDistance.toFixed(2)}km
   Current distance: ${currentDistanceAlongRoute.toFixed(2)}km
   New distance: ${newDistanceAlongRoute.toFixed(2)}km
   Progress: ${((newDistanceAlongRoute / totalDistance) * 100).toFixed(2)}%
    `);

    // Find which segment we're in
    let accumulatedDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentStart = waypoints[i];
      const segmentEnd = waypoints[i + 1];
      const segmentDistance = calculateDistance(
        { 
          latitude: segmentStart.latitude, 
          longitude: segmentStart.longitude,
          is_anonymous: false
        },
        { 
          latitude: segmentEnd.latitude, 
          longitude: segmentEnd.longitude,
          is_anonymous: false
        }
      );

      // Log waypoint information
      console.log(`
🛣️ Route Segment ${i + 1}/${waypoints.length - 1}:
   Start: [${segmentStart.latitude.toFixed(4)}, ${segmentStart.longitude.toFixed(4)}]
   End: [${segmentEnd.latitude.toFixed(4)}, ${segmentEnd.longitude.toFixed(4)}]
   Distance: ${segmentDistance.toFixed(2)}km
   Accumulated: ${accumulatedDistance.toFixed(2)}km
      `);

      if (newDistanceAlongRoute <= accumulatedDistance + segmentDistance) {
        // We're in this segment
        const distanceIntoSegment = newDistanceAlongRoute - accumulatedDistance;
        const segmentProgress = distanceIntoSegment / segmentDistance;

        // Interpolate position within segment
        const bearing = calculateBearing(
          { 
            latitude: segmentStart.latitude, 
            longitude: segmentStart.longitude,
            is_anonymous: false
          },
          { 
            latitude: segmentEnd.latitude, 
            longitude: segmentEnd.longitude,
            is_anonymous: false
          }
        );

        const newPosition = calculateDestination(
          { 
            latitude: segmentStart.latitude, 
            longitude: segmentStart.longitude,
            is_anonymous: false
          },
          distanceIntoSegment,
          bearing
        );

        return {
          position: {
            ...newPosition,
            is_anonymous: false
          },
          progress: (newDistanceAlongRoute / totalDistance) * 100
        };
      }

      accumulatedDistance += segmentDistance;
    }

    // If we're at the end
    const lastWaypoint = waypoints[waypoints.length - 1];
    return {
      position: { 
        latitude: lastWaypoint.latitude, 
        longitude: lastWaypoint.longitude,
        is_anonymous: false
      },
      progress: 100
    };
  }

  /**
   * Calculate total distance of route
   */
  private calculateTotalRouteDistance(waypoints: RouteWaypoint[]): number {
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = { 
        latitude: waypoints[i].latitude, 
        longitude: waypoints[i].longitude,
        is_anonymous: false
      };
      const to = { 
        latitude: waypoints[i + 1].latitude, 
        longitude: waypoints[i + 1].longitude,
        is_anonymous: false
      };
      totalDistance += calculateDistance(from, to);
    }
    return totalDistance;
  }

  /**
   * Check for weather updates and adjust flight accordingly
   */
  private async checkWeatherUpdates(messageId: string): Promise<void> {
    const flight = this.activeFlights.get(messageId);
    if (!flight || flight.record.status !== 'enroute') return;

    try {
      const now = Date.now();
      
      // Get current weather at flight position
      const newWeather = await weatherService.fetchWeatherData(flight.record.current_position);
      
      if (newWeather) {
        // Check if weather has changed significantly
        const hasSignificantChange = !flight.currentWeather || 
          Math.abs(newWeather.speed_modifier - flight.currentWeather.speed_modifier) > 0.2;

        if (hasSignificantChange) {
          // Update weather
          flight.currentWeather = newWeather;
          flight.record.weather_events.push(newWeather);
          flight.lastWeatherCheck = now;

          // Check if route recalculation is needed
          if (weatherService.shouldRecalculateRoute(newWeather)) {
            await this.recalculateRoute(messageId);
          }

          // Update speed based on new weather
          flight.record.speed_kmh = this.calculateCurrentSpeed(newWeather);
        }
      }
    } catch (error) {
      console.error('Error checking weather updates:', error);
    }
  }

  /**
   * Recalculate route due to weather conditions
   */
  private async recalculateRoute(messageId: string): Promise<void> {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    try {
      // Get destination from original route
      const destination = flight.route.waypoints[flight.route.waypoints.length - 1];
      const destinationLocation: LocationData = {
        latitude: destination.latitude,
        longitude: destination.longitude,
        is_anonymous: false
      };

      // Calculate new route from current position
      const newRoute = flightRoutingService.recalculateRoute(
        flight.record.current_position,
        destinationLocation
      );

      if (newRoute) {
        // Update flight with new route
        const remainingDistance = newRoute.totalDistance;
        const totalOriginalDistance = flight.record.total_distance;
        const completedDistance = totalOriginalDistance - remainingDistance;
        
        flight.route = newRoute;
        flight.record.route = newRoute.waypoints;
        flight.record.progress_percentage = (completedDistance / totalOriginalDistance) * 100;
        
        // Recalculate estimated arrival
        const remainingTime = this.calculateEstimatedDuration(remainingDistance, flight.currentWeather);
        flight.record.estimated_arrival = new Date(Date.now() + remainingTime);
        
        console.log(`Route recalculated for flight ${messageId} due to weather conditions`);
      }
    } catch (error) {
      console.error('Error recalculating route:', error);
    }
  }

  /**
   * Complete a flight
   */
  private async completeFlight(messageId: string): Promise<void> {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    try {
      // Update flight status
      flight.record.status = 'delivered';
      flight.record.progress_percentage = 100;
      flight.record.updated_at = new Date();

      // Stop monitoring
      this.stopFlightMonitoring(messageId);

      // Create final progress object
      const finalProgress: FlightProgress = {
        message_id: messageId,
        current_position: flight.record.current_position,
        progress_percentage: 100,
        estimated_arrival: flight.record.updated_at,
        current_weather: flight.currentWeather || undefined
      };

      // Notify completion callback
      const callback = this.flightCallbacks.get(messageId);
      if (callback) {
        callback(finalProgress);
      }

      // Trigger message delivery process
      await this.triggerMessageDelivery(messageId, finalProgress);

      // Remove from active flights
      this.activeFlights.delete(messageId);
      this.flightCallbacks.delete(messageId);

      console.log(`Flight ${messageId} completed successfully`);
    } catch (error) {
      console.error('Error completing flight:', error);
    }
  }

  /**
   * Trigger message delivery process
   */
  private async triggerMessageDelivery(messageId: string, flightProgress: FlightProgress): Promise<void> {
    try {
      // Import messageDeliveryService dynamically to avoid circular dependencies
      const { messageDeliveryService } = await import('./messageDelivery');
      await messageDeliveryService.handleFlightCompletion(messageId, flightProgress);
    } catch (error) {
      console.error(`Error triggering message delivery for ${messageId}:`, error);
    }
  }

  /**
   * Calculate current flight speed based on weather and terrain
   */
  private calculateCurrentSpeed(weather: WeatherEvent | null): number {
    return weatherService.calculateFlightSpeed(
      this.config.baseSpeedKmh,
      weather,
      1.0 // Terrain modifier would come from routing service
    );
  }

  /**
   * Calculate estimated flight duration
   */
  private calculateEstimatedDuration(
    distanceKm: number, 
    weather: WeatherEvent | null
  ): number {
    const speed = this.calculateCurrentSpeed(weather);
    return (distanceKm / speed) * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Get current flight progress
   */
  getFlightProgress(messageId: string): FlightProgress | null {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return null;

    return {
      message_id: messageId,
      current_position: flight.record.current_position,
      progress_percentage: flight.record.progress_percentage,
      estimated_arrival: flight.record.estimated_arrival,
      current_weather: flight.currentWeather || undefined
    };
  }

  /**
   * Get flight record
   */
  getFlightRecord(messageId: string): FlightRecord | null {
    const flight = this.activeFlights.get(messageId);
    return flight ? flight.record : null;
  }

  /**
   * Register callback for flight progress updates
   */
  onFlightProgress(messageId: string, callback: (progress: FlightProgress) => void): void {
    this.flightCallbacks.set(messageId, callback);
  }

  /**
   * Remove flight progress callback
   */
  removeFlightCallback(messageId: string): void {
    this.flightCallbacks.delete(messageId);
  }

  /**
   * Cancel an active flight
   */
  cancelFlight(messageId: string): boolean {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return false;

    flight.record.status = 'failed';
    this.stopFlightMonitoring(messageId);
    this.activeFlights.delete(messageId);
    this.flightCallbacks.delete(messageId);

    return true;
  }

  /**
   * Get all active flights
   */
  getActiveFlights(): FlightRecord[] {
    return Array.from(this.activeFlights.values()).map(flight => flight.record);
  }

  /**
   * Create journey data for completed flight
   */
  createJourneyData(messageId: string): JourneyData | null {
    const flight = this.activeFlights.get(messageId) || 
                   Array.from(this.activeFlights.values())
                     .find(f => f.record.message_id === messageId);
    
    if (!flight) return null;

    return {
      route: flight.record.route,
      total_distance: flight.record.total_distance,
      estimated_duration: flight.record.estimated_duration,
      weather_events: flight.record.weather_events,
      current_progress: flight.record.progress_percentage,
      journey_points_earned: this.calculateJourneyPoints(flight.record)
    };
  }

  /**
   * Calculate journey points earned (basic implementation)
   */
  private calculateJourneyPoints(flight: FlightRecord): number {
    let points = Math.floor(flight.total_distance); // 1 point per km

    // Weather bonuses (25% bonus for adverse weather - Requirement 6.2)
    const hasAdverseWeather = flight.weather_events.some(
      weather => weather.type === 'storm' || weather.type === 'rain'
    );
    if (hasAdverseWeather) {
      points = Math.floor(points * 1.25);
    }

    // Long distance bonus (5000 points for >10,000km - Requirement 6.3)
    if (flight.total_distance > 10000) {
      points += 5000;
    }

    return points;
  }

  /**
   * Cleanup method to stop all active flights
   */
  cleanup(): void {
    for (const messageId of this.activeFlights.keys()) {
      this.stopFlightMonitoring(messageId);
    }
    this.activeFlights.clear();
    this.flightCallbacks.clear();
  }
}

/**
 * Singleton instance of the flight engine
 */
export const flightEngine = new FlightEngine();