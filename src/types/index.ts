// Core data types for the Honk messaging app

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
  last_active: Date;
  total_journey_points: number;
  current_rank: string;
  location_sharing_preference: 'state' | 'country' | 'anonymous';
  opt_out_random: boolean;
  current_location?: LocationData;
  total_flights_sent: number;
  total_flights_received: number;
  total_distance_traveled: number;
  countries_visited: string[];
  states_visited: string[];
  achievements: string[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  state?: string;
  country?: string;
  is_anonymous: boolean;
}

export interface HonkMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  title: string;
  content: string;
  sender_location: LocationData;
  recipient_location?: LocationData;
  status: 'flying' | 'delivered';
  created_at: Date;
  delivered_at?: Date;
  journey_data?: JourneyData;
}

export interface JourneyData {
  route: RouteWaypoint[];
  total_distance: number;
  estimated_duration: number;
  weather_events: WeatherEvent[];
  current_progress: number;
  journey_points_earned: number;
}

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: Date;
}

export interface WeatherDetails {
  temperature: number;
  humidity?: number;
  precipitation?: number;
  windSpeed: number;
  windDirection: number;
  cloudCover?: number;
  pressure?: number;
  weatherCode?: number;
}

export interface WeatherEvent {
  type: 'clear' | 'rain' | 'storm' | 'wind';
  intensity: number;
  speed_modifier: number;
  location: LocationData;
  timestamp: Date;
  details: WeatherDetails;
}

export interface FlightProgress {
  message_id: string;
  current_position: LocationData;
  progress_percentage: number;
  estimated_arrival: Date;
  current_weather?: WeatherEvent;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  message_ids: string[];
  created_at: Date;
  last_message_at: Date;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_type: string;
  reward_id: string;
  unlocked_at: Date;
}

// Database row types (for raw database operations)
export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  last_active: string;
  total_journey_points: number;
  current_rank: string;
  location_sharing_preference: string;
  opt_out_random: number; // SQLite uses 0/1 for boolean
  current_location: string | null; // JSON string
  total_flights_sent: number;
  total_flights_received: number;
  total_distance_traveled: number;
  countries_visited: string; // JSON string array
  states_visited: string; // JSON string array
  achievements: string; // JSON string array
}

export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  title: string;
  content: string;
  sender_location: string; // JSON string
  recipient_location: string | null; // JSON string
  status: string;
  created_at: string;
  delivered_at: string | null;
  journey_data: string | null; // JSON string
}

export interface ConversationRow {
  id: string;
  user1_id: string;
  user2_id: string;
  message_ids: string; // JSON string array
  created_at: string;
  last_message_at: string;
}

export interface UserRewardRow {
  id: string;
  user_id: string;
  reward_type: string;
  reward_id: string;
  unlocked_at: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  created_at: Date;
  last_active: Date;
  total_journey_points: number;
  current_rank: string;
  location_sharing_preference: 'state' | 'country' | 'anonymous';
  opt_out_random: boolean;
  current_location?: LocationData;
  total_flights_sent: number;
  total_flights_received: number;
  total_distance_traveled: number;
  countries_visited: string[];
  states_visited: string[];
  achievements: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  location_sharing_preference?: 'state' | 'country' | 'anonymous';
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

export interface UserProfile {
  username: string;
  location_sharing_preference: 'state' | 'country' | 'anonymous';
  opt_out_random: boolean;
  current_location?: LocationData;
}

// Validation schemas
export interface MessageValidation {
  title: string;
  content: string;
  isValid: boolean;
  errors: string[];
}

export interface LocationValidation {
  latitude: number;
  longitude: number;
  isValid: boolean;
  errors: string[];
}

export interface AuthValidation {
  email: string;
  username: string;
  password: string;
  isValid: boolean;
  errors: string[];
}

export type FlightStatus = 'scheduled' | 'enroute' | 'holding' | 'delivered' | 'failed';

export interface FlightRecord {
  id: string;
  message_id: string;
  status: FlightStatus;
  route: RouteWaypoint[];
  total_distance: number;
  estimated_duration: number;
  progress_percentage: number;
  current_position: LocationData;
  speed_kmh: number;
  weather_events: WeatherEvent[];
  started_at: Date;
  updated_at: Date;
  estimated_arrival: Date;
}

export type NotificationType =
  | 'flight.update'
  | 'flight.delivered'
  | 'message.received'
  | 'reward.unlocked'
  | 'system.alert';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  read_at?: Date;
}

export interface ScrapbookEntry {
  id: string;
  user_id: string;
  message_id: string;
  created_at: Date;
  tags: string[];
  pinned: boolean;
}

export interface PostcardRecord {
  id: string;
  message_id: string;
  title: string;
  description: string;
  image_url?: string;
  created_at: Date;
  location: LocationData;
  weather_snapshot?: WeatherEvent;
}

export interface RateLimitEvent {
  id: string;
  user_id: string;
  action: string;
  occurred_at: Date;
  metadata?: Record<string, unknown>;
}

export interface OfflineCacheRecord {
  key: string;
  payload: unknown;
  created_at: Date;
  expires_at?: Date;
}

export interface AviatorRankDefinition {
  name: string;
  min_points: number;
  rewards: string[];
}


export interface FlightRow {
  id: string;
  message_id: string;
  status: string;
  route: string;
  total_distance: number;
  estimated_duration: number;
  progress_percentage: number;
  current_position: string;
  speed_kmh: number;
  weather_events: string;
  started_at: string;
  updated_at: string;
  estimated_arrival: string | null;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: string | null;
  created_at: string;
  read_at: string | null;
}

export interface ScrapbookEntryRow {
  id: string;
  user_id: string;
  message_id: string;
  tags: string;
  pinned: number;
  created_at: string;
}

export interface PostcardRow {
  id: string;
  message_id: string;
  title: string;
  description: string;
  image_url: string | null;
  location: string;
  weather_snapshot: string | null;
  created_at: string;
}

export interface RateLimitRow {
  id: string;
  user_id: string;
  action: string;
  occurred_at: string;
  metadata: string | null;
}

