import { LocationData } from '@/types';

interface LocationDescription {
  city: string;
  region: string;
}

const KNOWN_LOCATIONS: Record<string, LocationDescription> = {
  // US Cities
  'NYC': { city: 'New York City', region: 'over the bustling streets of Manhattan' },
  'SF': { city: 'San Francisco', region: 'above the foggy Bay Area' },
  'LA': { city: 'Los Angeles', region: 'along the sunny California coast' },
  'CHI': { city: 'Chicago', region: 'over Lake Michigan' },
  'MIA': { city: 'Miami', region: 'across the tropical Florida skies' },
  
  // European Cities
  'LON': { city: 'London', region: 'through the cloudy British skies' },
  'PAR': { city: 'Paris', region: 'past the Eiffel Tower' },
  'ROM': { city: 'Rome', region: 'over the ancient Italian capital' },
  'AMS': { city: 'Amsterdam', region: 'above the scenic Dutch canals' },
  
  // Asian Cities
  'TYO': { city: 'Tokyo', region: 'through the vibrant Japanese metropolis' },
  'HKG': { city: 'Hong Kong', region: 'between the towering skyscrapers' },
  'SIN': { city: 'Singapore', region: 'across the tropical city-state' },
  
  // Other Major Cities
  'SYD': { city: 'Sydney', region: 'along the Australian coast' },
  'DXB': { city: 'Dubai', region: 'over the desert metropolis' }
};

const REGIONS = [
  'over the vast Pacific Ocean',
  'across the Atlantic waters',
  'through mountain ranges',
  'over dense forests',
  'across rolling plains',
  'above desert landscapes',
  'through tropical regions',
  'over arctic tundra',
  'along coastal areas',
  'through valley passages'
];

/**
 * Get nearest known city code based on coordinates
 */
function getNearestCityCode(location: LocationData): string | null {
  // Define city coordinates
  const CITY_COORDS = {
    'NYC': { lat: 40.7128, lon: -74.0060 },
    'SF': { lat: 37.7749, lon: -122.4194 },
    'LA': { lat: 34.0522, lon: -118.2437 },
    'CHI': { lat: 41.8781, lon: -87.6298 },
    'MIA': { lat: 25.7617, lon: -80.1918 },
    'LON': { lat: 51.5074, lon: -0.1278 },
    'PAR': { lat: 48.8566, lon: 2.3522 },
    'ROM': { lat: 41.9028, lon: 12.4964 },
    'AMS': { lat: 52.3676, lon: 4.9041 },
    'TYO': { lat: 35.6762, lon: 139.6503 },
    'HKG': { lat: 22.3193, lon: 114.1694 },
    'SIN': { lat: 1.3521, lon: 103.8198 },
    'SYD': { lat: -33.8688, lon: 151.2093 },
    'DXB': { lat: 25.2048, lon: 55.2708 }
  };

  let nearestCity = null;
  let shortestDistance = Infinity;

  for (const [code, coords] of Object.entries(CITY_COORDS)) {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      coords.lat,
      coords.lon
    );

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestCity = code;
    }
  }

  // Only return if within ~500km
  return shortestDistance < 500 ? nearestCity : null;
}

/**
 * Calculate distance between two points in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getLocationDescription(location: LocationData): string {
  const cityCode = getNearestCityCode(location);
  
  if (cityCode && KNOWN_LOCATIONS[cityCode]) {
    const { city, region } = KNOWN_LOCATIONS[cityCode];
    return `near ${city}, ${region}`;
  }

  // If not near a known city, return a general region description
  const regionIndex = Math.floor(
    (location.latitude + 180) * (location.longitude + 180) % REGIONS.length
  );
  return REGIONS[regionIndex];
}

export function getDirectionDescription(location: LocationData, destination: LocationData): string {
  const fromCity = getNearestCityCode(location);
  const toCity = getNearestCityCode(destination);

  if (fromCity && toCity) {
    return `from ${KNOWN_LOCATIONS[fromCity].city} to ${KNOWN_LOCATIONS[toCity].city}`;
  }

  return 'on its journey';
}