// Application constants

export const MESSAGE_LIMITS = {
  CONTENT_MAX_LENGTH: 280,
  TITLE_MAX_LENGTH: 100,
} as const;

export const FLIGHT_CONSTANTS = {
  MIN_DISTANCE_KM: 500,
  POINTS_PER_KM: 1,
  WEATHER_BONUS_MULTIPLIER: 0.25,
  LONG_DISTANCE_BONUS_KM: 10000,
  LONG_DISTANCE_BONUS_POINTS: 5000,
  NEW_LOCATION_BONUS_POINTS: 500,
} as const;

export const AVIATOR_RANKS = [
  'Fledgling Courier',
  'Novice Navigator',
  'Skilled Soarer',
  'Expert Explorer',
  'Master Messenger',
  'Legendary Aviator',
] as const;

export const WEATHER_SPEED_MODIFIERS = {
  clear: 1.0,
  rain: 0.75,
  storm: 0.5,
  tailwind: 1.25,
  headwind: 0.75,
} as const;
