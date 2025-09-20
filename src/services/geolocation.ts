import { LocationData } from '@/types';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
}

export class GeolocationService {
  private static readonly DEFAULT_OPTIONS: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  };

  /**
   * Get the user's current location
   */
  static async getCurrentLocation(options?: GeolocationOptions): Promise<LocationData> {
    if (!this.isGeolocationSupported()) {
      throw {
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED'
      } as GeolocationError;
    }

    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            is_anonymous: false
          };
          resolve(location);
        },
        (error) => {
          const geolocationError = this.mapGeolocationError(error);
          reject(geolocationError);
        },
        finalOptions
      );
    });
  }

  /**
   * Watch the user's location for changes
   */
  static watchPosition(
    onSuccess: (location: LocationData) => void,
    onError: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): number {
    if (!this.isGeolocationSupported()) {
      onError({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        type: 'NOT_SUPPORTED'
      } as GeolocationError);
      return -1;
    }

    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    return navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          is_anonymous: false
        };
        onSuccess(location);
      },
      (error) => {
        const geolocationError = this.mapGeolocationError(error);
        onError(geolocationError);
      },
      finalOptions
    );
  }

  /**
   * Clear a position watch
   */
  static clearWatch(watchId: number): void {
    if (this.isGeolocationSupported() && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Check if geolocation is supported
   */
  static isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Map browser geolocation errors to our custom error format
   */
  private static mapGeolocationError(error: GeolocationPositionError): GeolocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: error.code,
          message: 'Location access denied by user',
          type: 'PERMISSION_DENIED'
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: error.code,
          message: 'Location information is unavailable',
          type: 'POSITION_UNAVAILABLE'
        };
      case error.TIMEOUT:
        return {
          code: error.code,
          message: 'Location request timed out',
          type: 'TIMEOUT'
        };
      default:
        return {
          code: error.code,
          message: error.message || 'Unknown geolocation error',
          type: 'POSITION_UNAVAILABLE'
        };
    }
  }
}

/**
 * Singleton instance of the geolocation service
 */
export const geolocationService = GeolocationService;