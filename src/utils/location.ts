import { LocationData } from '@/types';

/**
 * Location sharing preferences
 */
export type LocationSharingPreference = 'state' | 'country' | 'anonymous';

/**
 * Reverse geocoding result interface
 */
export interface ReverseGeocodeResult {
  state?: string;
  country?: string;
  city?: string;
  region?: string;
}

/**
 * Format location data based on user's sharing preference
 */
export function formatLocationForSharing(
  location: LocationData,
  preference: LocationSharingPreference,
  geocodeResult?: ReverseGeocodeResult
): LocationData {
  const baseLocation: LocationData = {
    latitude: location.latitude,
    longitude: location.longitude,
    is_anonymous: preference === 'anonymous'
  };

  switch (preference) {
    case 'state':
      return {
        ...baseLocation,
        state: geocodeResult?.state,
        country: geocodeResult?.country,
        is_anonymous: false
      };
    
    case 'country':
      return {
        ...baseLocation,
        country: geocodeResult?.country,
        is_anonymous: false
      };
    
    case 'anonymous':
      return anonymizeLocation(baseLocation);
    
    default:
      return baseLocation;
  }
}

/**
 * Anonymize location data by reducing precision
 * Reduces precision to approximately 10km accuracy
 */
export function anonymizeLocation(location: LocationData): LocationData {
  // Reduce precision to ~10km by rounding to 2 decimal places
  const anonymizedLat = Math.round(location.latitude * 100) / 100;
  const anonymizedLon = Math.round(location.longitude * 100) / 100;

  return {
    latitude: anonymizedLat,
    longitude: anonymizedLon,
    is_anonymous: true
  };
}

/**
 * Get location display string based on available data
 */
export function getLocationDisplayString(location: LocationData): string {
  if (location.is_anonymous) {
    return 'Anonymous Location';
  }

  if (location.state && location.country) {
    return `${location.state}, ${location.country}`;
  }

  if (location.country) {
    return location.country;
  }

  // Fallback to coordinates with reduced precision
  const lat = location.latitude.toFixed(1);
  const lon = location.longitude.toFixed(1);
  return `${lat}°, ${lon}°`;
}

/**
 * Validate location coordinates
 */
export function isValidLocation(location: Partial<LocationData>): boolean {
  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return false;
  }

  // Check latitude bounds (-90 to 90)
  if (location.latitude < -90 || location.latitude > 90) {
    return false;
  }

  // Check longitude bounds (-180 to 180)
  if (location.longitude < -180 || location.longitude > 180) {
    return false;
  }

  return true;
}

/**
 * Normalize longitude to -180 to 180 range
 */
export function normalizeLongitude(longitude: number): number {
  while (longitude > 180) {
    longitude -= 360;
  }
  while (longitude < -180) {
    longitude += 360;
  }
  return longitude;
}

/**
 * Clamp latitude to -90 to 90 range
 */
export function clampLatitude(latitude: number): number {
  return Math.max(-90, Math.min(90, latitude));
}

/**
 * Create a safe location object with validated coordinates
 */
export function createSafeLocation(
  latitude: number,
  longitude: number,
  isAnonymous: boolean = false
): LocationData {
  return {
    latitude: clampLatitude(latitude),
    longitude: normalizeLongitude(longitude),
    is_anonymous: isAnonymous
  };
}

/**
 * Generate a random location within a bounding box (for testing)
 */
export function generateRandomLocation(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): LocationData {
  const latitude = bounds.south + Math.random() * (bounds.north - bounds.south);
  const longitude = bounds.west + Math.random() * (bounds.east - bounds.west);

  return createSafeLocation(latitude, longitude);
}

/**
 * Check if a location is within a bounding box
 */
export function isLocationInBounds(
  location: LocationData,
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean {
  return (
    location.latitude >= bounds.south &&
    location.latitude <= bounds.north &&
    location.longitude >= bounds.west &&
    location.longitude <= bounds.east
  );
}

/**
 * Create a bounding box around a center point with a given radius (in km)
 */
export function createBoundingBox(
  center: LocationData,
  radiusKm: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  // Approximate degrees per km (varies by latitude)
  const latDegreesPerKm = 1 / 111;
  const lonDegreesPerKm = 1 / (111 * Math.cos(center.latitude * Math.PI / 180));

  const latOffset = radiusKm * latDegreesPerKm;
  const lonOffset = radiusKm * lonDegreesPerKm;

  return {
    north: clampLatitude(center.latitude + latOffset),
    south: clampLatitude(center.latitude - latOffset),
    east: normalizeLongitude(center.longitude + lonOffset),
    west: normalizeLongitude(center.longitude - lonOffset)
  };
}

/**
 * Mock reverse geocoding function (in a real app, this would call an external API)
 */
export async function mockReverseGeocode(location: LocationData): Promise<ReverseGeocodeResult> {
  // This is a mock implementation for testing
  // In a real application, you would call a service like Google Maps, Mapbox, or OpenStreetMap
  
  // Simple mock based on coordinate ranges
  const { latitude, longitude } = location;
  
  let country = 'Unknown';
  let state = 'Unknown';

  // Very basic mock geocoding for common regions
  if (latitude >= 41 && latitude <= 83 && longitude >= -141 && longitude <= -52) {
    country = 'Canada';
    state = 'Unknown Province';
  } else if (latitude >= 24 && latitude <= 49 && longitude >= -125 && longitude <= -66) {
    country = 'United States';
    if (latitude >= 32 && latitude <= 42 && longitude >= -124 && longitude <= -114) {
      state = 'California';
    } else if (latitude >= 25 && latitude <= 31 && longitude >= -106 && longitude <= -93) {
      state = 'Texas';
    } else {
      state = 'Unknown State';
    }
  } else if (latitude >= 35 && latitude <= 71 && longitude >= -10 && longitude <= 40) {
    country = 'Europe';
    state = 'Unknown Region';
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return { country, state };
}