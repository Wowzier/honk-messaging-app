import Database from 'better-sqlite3';
import path from 'path';
import { 
  User, 
  HonkMessage, 
  Conversation, 
  UserReward,
  UserRow,
  MessageRow,
  ConversationRow,
  UserRewardRow,
  FlightRecord,
  NotificationRecord,
  ScrapbookEntry,
  PostcardRecord,
  RateLimitEvent,
  FlightRow,
  NotificationRow,
  ScrapbookEntryRow,
  PostcardRow,
  RateLimitRow,
  LocationData,
  JourneyData,
  RouteWaypoint,
  WeatherEvent
} from '@/types';

class DatabaseManager {
  private db: Database.Database | null = null;
  private static instance: DatabaseManager;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public connect(dbPath?: string): Database.Database {
    if (this.db) {
      return this.db;
    }

    const defaultPath = path.join(process.cwd(), 'data', 'honk.db');
    const finalPath = dbPath || defaultPath;
    
    // Ensure data directory exists (server-side only)
    if (typeof window === 'undefined') {
      const fs = require('fs');
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    return this.db;
  }

  public getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Helper methods for data transformation
  public rowToUser(row: UserRow): User {
    const parseArray = (value: string | null): string[] => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      password_hash: row.password_hash,
      created_at: new Date(row.created_at),
      last_active: new Date(row.last_active),
      total_journey_points: row.total_journey_points,
      current_rank: row.current_rank,
      location_sharing_preference: row.location_sharing_preference as 'state' | 'country' | 'anonymous',
      opt_out_random: Boolean(row.opt_out_random),
      current_location: row.current_location ? JSON.parse(row.current_location) : undefined,
      total_flights_sent: row.total_flights_sent ?? 0,
      total_flights_received: row.total_flights_received ?? 0,
      total_distance_traveled: row.total_distance_traveled ?? 0,
      countries_visited: parseArray(row.countries_visited),
      states_visited: parseArray(row.states_visited),
      achievements: parseArray(row.achievements)
    };
  }

  public userToRow(user: Partial<User>): Partial<UserRow> {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.password_hash,
      created_at: user.created_at?.toISOString(),
      last_active: user.last_active?.toISOString(),
      total_journey_points: user.total_journey_points,
      current_rank: user.current_rank,
      location_sharing_preference: user.location_sharing_preference,
      opt_out_random: user.opt_out_random ? 1 : 0,
      current_location: user.current_location ? JSON.stringify(user.current_location) : null,
      total_flights_sent: user.total_flights_sent ?? 0,
      total_flights_received: user.total_flights_received ?? 0,
      total_distance_traveled: user.total_distance_traveled ?? 0,
      countries_visited: JSON.stringify(user.countries_visited ?? []),
      states_visited: JSON.stringify(user.states_visited ?? []),
      achievements: JSON.stringify(user.achievements ?? [])
    };
  }

  public rowToMessage(row: MessageRow): HonkMessage {
    return {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      title: row.title,
      content: row.content,
      sender_location: JSON.parse(row.sender_location),
      recipient_location: row.recipient_location ? JSON.parse(row.recipient_location) : undefined,
      status: row.status as 'flying' | 'delivered',
      created_at: new Date(row.created_at),
      delivered_at: row.delivered_at ? new Date(row.delivered_at) : undefined,
      journey_data: row.journey_data ? JSON.parse(row.journey_data) : undefined
    };
  }

  public messageToRow(message: Partial<HonkMessage>): Partial<MessageRow> {
    return {
      ...message,
      sender_location: message.sender_location ? JSON.stringify(message.sender_location) : undefined,
      recipient_location: message.recipient_location ? JSON.stringify(message.recipient_location) : null,
      created_at: message.created_at?.toISOString(),
      delivered_at: message.delivered_at?.toISOString() || null,
      journey_data: message.journey_data ? JSON.stringify(message.journey_data) : null
    };
  }

  public rowToConversation(row: ConversationRow): Conversation {
    return {
      id: row.id,
      user1_id: row.user1_id,
      user2_id: row.user2_id,
      message_ids: JSON.parse(row.message_ids),
      created_at: new Date(row.created_at),
      last_message_at: new Date(row.last_message_at)
    };
  }

  public conversationToRow(conversation: Partial<Conversation>): Partial<ConversationRow> {
    return {
      ...conversation,
      message_ids: conversation.message_ids ? JSON.stringify(conversation.message_ids) : undefined,
      created_at: conversation.created_at?.toISOString(),
      last_message_at: conversation.last_message_at?.toISOString()
    };
  }

  public rowToUserReward(row: UserRewardRow): UserReward {
    return {
      id: row.id,
      user_id: row.user_id,
      reward_type: row.reward_type,
      reward_id: row.reward_id,
      unlocked_at: new Date(row.unlocked_at)
    };
  }

  public userRewardToRow(reward: Partial<UserReward>): Partial<UserRewardRow> {
    return {
      ...reward,
      unlocked_at: reward.unlocked_at?.toISOString()
    };
  }
}

export const dbManager = DatabaseManager.getInstance();
export default dbManager;