import { 
  LocationData, 
  FlightProgress, 
  WeatherEvent, 
  FlightRecord,
  RouteWaypoint,
  JourneyData
} from '@/types';
import { calculateDistance, calculateBearing, calculateDestination } from '@/utils/distance';

/**
 * Simplified flight engine for client-side demo use
 */
export class ClientFlightEngine {
  private activeFlights: Map<string, {
    record: FlightRecord;
    startTime: number;
    callback?: (progress: FlightProgress) => void;
    timer?: NodeJS.Timeout;
  }> = new Map();

  /**
   * Initialize a new flight with simplified routing
   */
  async initializeFlight(
    messageId: string,
    startLocation: LocationData,
    endLocation: LocationData
  ): Promise<FlightRecord | null> {
    try {
      // Calculate simple route (direct path with waypoints)
      const totalDistance = calculateDistance(startLocation, endLocation);
      const bearing = calculateBearing(startLocation, endLocation);
      
      // Create waypoints every 500km or at least start and end
      const numWaypoints = Math.max(2, Math.ceil(totalDistance / 500));
      const waypoints: RouteWaypoint[] = [];
      
      for (let i = 0; i < numWaypoints; i++) {
        const progress = i / (numWaypoints - 1);
        const distance = totalDistance * progress;
        const location = i === 0 ? startLocation : 
                        i === numWaypoints - 1 ? endLocation :
                        calculateDestination(startLocation, distance, bearing);
        
        waypoints.push({
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: 1000 + Math.random() * 2000, // Random altitude between 1-3km
          timestamp: new Date(Date.now() + i * 60000)
        });
      }

      // Generate random weather
      const initialWeather = this.generateRandomWeather(startLocation);
      
      // Calculate estimated duration (base speed 5000 km/h for demo)
      const baseSpeed = 5000; // 100x faster than normal for demo
      const weatherSpeed = baseSpeed * (initialWeather?.speed_modifier || 1);
      const estimatedDuration = (totalDistance / weatherSpeed) * 60 * 60 * 1000; // ms

      // Create flight record
      const flightRecord: FlightRecord = {
        id: `flight_${messageId}`,
        message_id: messageId,
        status: 'enroute',
        route: waypoints,
        total_distance: totalDistance,
        estimated_duration: estimatedDuration,
        progress_percentage: 0,
        current_position: startLocation,
        speed_kmh: weatherSpeed,
        weather_events: initialWeather ? [initialWeather] : [],
        started_at: new Date(),
        updated_at: new Date(),
        estimated_arrival: new Date(Date.now() + estimatedDuration)
      };

      // Store active flight
      this.activeFlights.set(messageId, {
        record: flightRecord,
        startTime: Date.now()
      });

      // Start progress simulation
      this.startFlightSimulation(messageId);

      return flightRecord;
    } catch (error) {
      console.error('Error initializing client flight:', error);
      return null;
    }
  }

  /**
   * Start flight progress simulation
   */
  private startFlightSimulation(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    const updateInterval = 200; // Update every 0.2 seconds for super fast demo
    
    const timer = setInterval(() => {
      this.updateFlightProgress(messageId);
    }, updateInterval);

    flight.timer = timer;
  }

  /**
   * Update flight progress
   */
  private updateFlightProgress(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (!flight || flight.record.status !== 'enroute') return;

    const now = Date.now();
    const elapsed = now - flight.startTime;
    const totalDuration = flight.record.estimated_duration;
    
    // Calculate progress (0-100%) with 100x speed multiplier for demo
    let progress = (elapsed / totalDuration) * 100 * 100; // 100x speed multiplier
    progress = Math.min(100, progress);

    // Update position along route
    const newPosition = this.calculatePositionAlongRoute(
      flight.record.route,
      progress / 100
    );

    // Check if we've crossed into a new geographic region
    const lastWeatherEvent = flight.record.weather_events[flight.record.weather_events.length - 1];
    const lastPosition = lastWeatherEvent?.location;
    
    // Simple check for crossing regions (significant lat/long change, roughly state/country sized)
    const significantMove = lastPosition && (
      Math.abs(lastPosition.latitude - newPosition.latitude) > 5 || // ~500km latitude change
      Math.abs(lastPosition.longitude - newPosition.longitude) > 5  // ~500km longitude change at equator
    );

    if (!lastPosition || significantMove) {
      const newWeather = this.generateRandomWeather(newPosition);
      if (newWeather) {
        flight.record.weather_events.push(newWeather);
        flight.record.speed_kmh = 50 * newWeather.speed_modifier;
      }
    }

    // Update flight record
    flight.record.progress_percentage = progress;
    flight.record.current_position = newPosition;
    flight.record.updated_at = new Date();

    // Check if flight is complete
    if (progress >= 100) {
      this.completeFlight(messageId);
      return;
    }

    // Notify callback
    if (flight.callback) {
      const flightProgress: FlightProgress = {
        message_id: messageId,
        current_position: newPosition,
        progress_percentage: progress,
        estimated_arrival: flight.record.estimated_arrival,
        current_weather: flight.record.weather_events[flight.record.weather_events.length - 1]
      };
      flight.callback(flightProgress);
    }
  }

  /**
   * Calculate position along route based on progress
   */
  private calculatePositionAlongRoute(waypoints: RouteWaypoint[], progress: number): LocationData {
    if (waypoints.length < 2) {
      return {
        latitude: waypoints[0]?.latitude || 0,
        longitude: waypoints[0]?.longitude || 0,
        is_anonymous: false
      };
    }

    if (progress <= 0) {
      return {
        latitude: waypoints[0].latitude,
        longitude: waypoints[0].longitude,
        is_anonymous: false
      };
    }

    if (progress >= 1) {
      const last = waypoints[waypoints.length - 1];
      return {
        latitude: last.latitude,
        longitude: last.longitude,
        is_anonymous: false
      };
    }

    // Find which segment we're in
    const segmentProgress = progress * (waypoints.length - 1);
    const segmentIndex = Math.floor(segmentProgress);
    const segmentFraction = segmentProgress - segmentIndex;

    if (segmentIndex >= waypoints.length - 1) {
      const last = waypoints[waypoints.length - 1];
      return {
        latitude: last.latitude,
        longitude: last.longitude,
        is_anonymous: false
      };
    }

    // Interpolate between waypoints
    const start = waypoints[segmentIndex];
    const end = waypoints[segmentIndex + 1];

    const lat = start.latitude + (end.latitude - start.latitude) * segmentFraction;
    const lng = start.longitude + (end.longitude - start.longitude) * segmentFraction;

    return {
      latitude: lat,
      longitude: lng,
      is_anonymous: false
    };
  }

  /**
   * Generate random weather for demo purposes
   */
  private generateRandomWeather(location: LocationData): WeatherEvent | null {
    const weatherTypes = ['clear', 'rain', 'storm', 'wind'] as const;
    const type = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    
    let speed_modifier = 1.0;
    let intensity = Math.random();

    switch (type) {
      case 'clear':
        speed_modifier = 1.0;
        intensity = 0;
        break;
      case 'rain':
        speed_modifier = 0.75;
        intensity = 0.3 + Math.random() * 0.4;
        break;
      case 'storm':
        speed_modifier = 0.5;
        intensity = 0.6 + Math.random() * 0.4;
        break;
      case 'wind':
        speed_modifier = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
        intensity = 0.2 + Math.random() * 0.6;
        break;
    }

    return {
      type,
      intensity,
      speed_modifier,
      location,
      timestamp: new Date()
    };
  }

  /**
   * Complete a flight
   */
  private completeFlight(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return;

    // Update status
    flight.record.status = 'delivered';
    flight.record.progress_percentage = 100;
    flight.record.updated_at = new Date();

    // Final callback
    if (flight.callback) {
      const finalProgress: FlightProgress = {
        message_id: messageId,
        current_position: flight.record.current_position,
        progress_percentage: 100,
        estimated_arrival: flight.record.updated_at,
        current_weather: flight.record.weather_events[flight.record.weather_events.length - 1]
      };
      flight.callback(finalProgress);
    }

    // Clean up
    if (flight.timer) {
      clearInterval(flight.timer);
    }

    // Remove from active flights after a delay
    setTimeout(() => {
      this.activeFlights.delete(messageId);
    }, 5000);
  }

  /**
   * Register callback for flight progress updates
   */
  onFlightProgress(messageId: string, callback: (progress: FlightProgress) => void): void {
    const flight = this.activeFlights.get(messageId);
    if (flight) {
      flight.callback = callback;
    }
  }

  /**
   * Remove flight progress callback
   */
  removeFlightCallback(messageId: string): void {
    const flight = this.activeFlights.get(messageId);
    if (flight) {
      flight.callback = undefined;
    }
  }

  /**
   * Cancel an active flight
   */
  cancelFlight(messageId: string): boolean {
    const flight = this.activeFlights.get(messageId);
    if (!flight) return false;

    flight.record.status = 'failed';
    
    if (flight.timer) {
      clearInterval(flight.timer);
    }
    
    this.activeFlights.delete(messageId);
    return true;
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
      current_weather: flight.record.weather_events[flight.record.weather_events.length - 1]
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
   * Get all active flights
   */
  getActiveFlights(): FlightRecord[] {
    return Array.from(this.activeFlights.values()).map(flight => flight.record);
  }

  /**
   * Create journey data for completed flight
   */
  createJourneyData(messageId: string): JourneyData | null {
    const flight = this.activeFlights.get(messageId);
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
   * Calculate journey points earned
   */
  private calculateJourneyPoints(flight: FlightRecord): number {
    let points = Math.floor(flight.total_distance); // 1 point per km

    // Weather bonuses (25% bonus for adverse weather)
    const hasAdverseWeather = flight.weather_events.some(
      weather => weather.type === 'storm' || weather.type === 'rain'
    );
    if (hasAdverseWeather) {
      points = Math.floor(points * 1.25);
    }

    // Long distance bonus (5000 points for >10,000km)
    if (flight.total_distance > 10000) {
      points += 5000;
    }

    return points;
  }

  /**
   * Cleanup method to stop all active flights
   */
  cleanup(): void {
    for (const [messageId, flight] of this.activeFlights) {
      if (flight.timer) {
        clearInterval(flight.timer);
      }
    }
    this.activeFlights.clear();
  }
}

/**
 * Singleton instance of the client flight engine
 */
export const clientFlightEngine = new ClientFlightEngine();