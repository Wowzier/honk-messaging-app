import { LocationData } from '@/types';
import { GeolocationService, GeolocationError } from './geolocation';

/**
 * Enhanced location service with New York fallback for testing
 */
export class LocationService {
  // Default to New York for testing as requested
  private static readonly DEFAULT_LOCATION: LocationData = {
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York', 
    country: 'United States',
    is_anonymous: false
  };

  /**
   * Get user's current location with New York fallback
   * As requested: defaults to New York for testing but uses actual user location when available
   */
  static async getCurrentLocationWithFallback(): Promise<LocationData> {
    try {
      // Try to get user's actual location first
      const userLocation = await GeolocationService.getCurrentLocation();
      
      // If we get coordinates, we need to reverse geocode to get state/country
      // For now, return the coordinates with a note that this needs reverse geocoding
      return {
        ...userLocation,
        state: 'Current Location',
        country: 'Unknown',
        is_anonymous: false
      };
    } catch (error) {
      console.log('Geolocation failed, using New York fallback:', (error as GeolocationError).message);
      
      // Return New York as fallback
      return this.DEFAULT_LOCATION;
    }
  }

  /**
   * Get location for weather and flight calculations
   * This method prioritizes user location but gracefully falls back to NYC
   */
  static async getLocationForWeather(): Promise<LocationData> {
    return this.getCurrentLocationWithFallback();
  }

  /**
   * Get location for message sending
   * This method also uses the fallback strategy
   */
  static async getLocationForMessaging(): Promise<LocationData> {
    return this.getCurrentLocationWithFallback();
  }

  /**
   * Check if the current location is the fallback (New York)
   */
  static isUsingFallbackLocation(location: LocationData): boolean {
    return location.latitude === this.DEFAULT_LOCATION.latitude && 
           location.longitude === this.DEFAULT_LOCATION.longitude;
  }

  /**
   * Get a human-readable description of the location source
   */
  static getLocationSourceDescription(location: LocationData): string {
    if (this.isUsingFallbackLocation(location)) {
      return 'Using New York (testing default)';
    }
    return 'Using your current location';
  }

  /**
   * Update a user's location in the database
   */
  static async updateUserLocation(userId: string, location: LocationData): Promise<void> {
    try {
      const response = await fetch('/api/user/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          userId,
          location
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user location');
      }
    } catch (error) {
      console.error('Error updating user location:', error);
      throw error;
    }
  }

  /**
   * Get all available demo locations (including New York default)
   */
  static getDemoLocations(): Record<string, LocationData> {
    return {
      'New York': this.DEFAULT_LOCATION,
      'London': {
        latitude: 51.5074,
        longitude: -0.1278,
        state: 'London',
        country: 'United Kingdom',
        is_anonymous: false
      },
      'Tokyo': {
        latitude: 35.6762,
        longitude: 139.6503,
        state: 'Tokyo',
        country: 'Japan',
        is_anonymous: false
      },
      'Sydney': {
        latitude: -33.8688,
        longitude: 151.2093,
        state: 'New South Wales',
        country: 'Australia',
        is_anonymous: false
      },
      'Paris': {
        latitude: 48.8566,
        longitude: 2.3522,
        state: 'Île-de-France',
        country: 'France',
        is_anonymous: false
      }
    };
  }
}

// Export singleton instance
export const locationService = LocationService;