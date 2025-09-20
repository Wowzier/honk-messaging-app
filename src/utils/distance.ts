import { LocationData } from '@/types';

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(point1: LocationData, point2: LocationData): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLatRad = toRadians(point2.latitude - point1.latitude);
  const deltaLonRad = toRadians(point2.longitude - point1.longitude);

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate the initial bearing (forward azimuth) from point1 to point2
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(point1: LocationData, point2: LocationData): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLonRad = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);

  // Normalize to 0-360 degrees
  return (bearingDeg + 360) % 360;
}

/**
 * Calculate a point at a given distance and bearing from a starting point
 * Distance in kilometers, bearing in degrees
 */
export function calculateDestination(
  start: LocationData,
  distance: number,
  bearing: number
): LocationData {
  const lat1Rad = toRadians(start.latitude);
  const lon1Rad = toRadians(start.longitude);
  const bearingRad = toRadians(bearing);
  const angularDistance = distance / EARTH_RADIUS_KM;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
    Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2Rad = lon1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
    Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );

  return {
    latitude: toDegrees(lat2Rad),
    longitude: toDegrees(lon2Rad),
    is_anonymous: start.is_anonymous
  };
}

/**
 * Check if a distance is considered "too boring" (less than 500km)
 * Based on requirement 2.6
 */
export function isTooBoringDistance(distance: number): boolean {
  return distance < 500;
}

/**
 * Calculate the midpoint between two locations
 */
export function calculateMidpoint(point1: LocationData, point2: LocationData): LocationData {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLonRad = toRadians(point2.longitude - point1.longitude);

  const bx = Math.cos(lat2Rad) * Math.cos(deltaLonRad);
  const by = Math.cos(lat2Rad) * Math.sin(deltaLonRad);

  const lat3Rad = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + bx) * (Math.cos(lat1Rad) + bx) + by * by)
  );

  const lon3Rad = toRadians(point1.longitude) + Math.atan2(by, Math.cos(lat1Rad) + bx);

  return {
    latitude: toDegrees(lat3Rad),
    longitude: toDegrees(lon3Rad),
    is_anonymous: point1.is_anonymous || point2.is_anonymous
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
}

/**
 * Get distance category for weighting in user matching
 */
export function getDistanceCategory(distance: number): 'local' | 'regional' | 'national' | 'continental' | 'intercontinental' {
  if (distance < 100) return 'local';
  if (distance < 500) return 'regional';
  if (distance < 2000) return 'national';
  if (distance < 8000) return 'continental';
  return 'intercontinental';
}

/**
 * Get weight multiplier for distance-based user matching
 * Higher weights for longer distances (cross-continental preferred)
 */
export function getDistanceWeight(distance: number): number {
  const category = getDistanceCategory(distance);
  
  switch (category) {
    case 'local': return 0.1;
    case 'regional': return 0.3;
    case 'national': return 1.0;
    case 'continental': return 2.0;
    case 'intercontinental': return 3.0;
    default: return 1.0;
  }
}