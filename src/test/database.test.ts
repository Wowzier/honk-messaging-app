import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';
import { User, HonkMessage, Conversation, UserReward, LocationData } from '@/types';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test.db');

describe('Database Manager', () => {
  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Connect to test database
    dbManager.connect(TEST_DB_PATH);
    
    // Run migrations
    const migrationRunner = new MigrationRunner(dbManager.getDatabase());
    migrationRunner.runMigrations();
  });

  afterEach(() => {
    // Close database connection
    dbManager.close();
    
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Connection Management', () => {
    it('should connect to database and create file', () => {
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should return same database instance on multiple calls', () => {
      const db1 = dbManager.getDatabase();
      const db2 = dbManager.getDatabase();
      expect(db1).toBe(db2);
    });

    it('should throw error when getting database without connection', () => {
      dbManager.close();
      expect(() => dbManager.getDatabase()).toThrow('Database not connected');
    });
  });

  describe('Data Transformation', () => {
    it('should transform User to UserRow and back', () => {
      const user: User = {
        id: 'user-123',
        created_at: new Date('2023-01-01T00:00:00Z'),
        last_active: new Date('2023-01-02T00:00:00Z'),
        total_journey_points: 1000,
        current_rank: 'Sky Navigator',
        location_sharing_preference: 'state',
        opt_out_random: false,
        current_location: {
          latitude: 40.7128,
          longitude: -74.0060,
          state: 'New York',
          country: 'United States',
          is_anonymous: false
        }
      };

      const userRow = dbManager.userToRow(user);
      expect(userRow.opt_out_random).toBe(0);
      expect(userRow.current_location).toBe(JSON.stringify(user.current_location));
      expect(userRow.created_at).toBe('2023-01-01T00:00:00.000Z');

      const transformedUser = dbManager.rowToUser({
        ...userRow,
        id: user.id,
        total_journey_points: user.total_journey_points,
        current_rank: user.current_rank,
        location_sharing_preference: user.location_sharing_preference
      } as any);

      expect(transformedUser.id).toBe(user.id);
      expect(transformedUser.opt_out_random).toBe(false);
      expect(transformedUser.current_location).toEqual(user.current_location);
      expect(transformedUser.created_at).toEqual(user.created_at);
    });

    it('should transform HonkMessage to MessageRow and back', () => {
      const message: HonkMessage = {
        id: 'msg-123',
        sender_id: 'user-123',
        recipient_id: 'user-456',
        title: 'Hello!',
        content: 'This is a test message',
        sender_location: {
          latitude: 40.7128,
          longitude: -74.0060,
          state: 'New York',
          country: 'United States',
          is_anonymous: false
        },
        recipient_location: {
          latitude: 34.0522,
          longitude: -118.2437,
          state: 'California',
          country: 'United States',
          is_anonymous: false
        },
        status: 'flying',
        created_at: new Date('2023-01-01T00:00:00Z'),
        delivered_at: new Date('2023-01-02T00:00:00Z'),
        journey_data: {
          route: [],
          total_distance: 3935,
          estimated_duration: 120,
          weather_events: [],
          current_progress: 50,
          journey_points_earned: 3935
        }
      };

      const messageRow = dbManager.messageToRow(message);
      expect(messageRow.sender_location).toBe(JSON.stringify(message.sender_location));
      expect(messageRow.recipient_location).toBe(JSON.stringify(message.recipient_location));
      expect(messageRow.journey_data).toBe(JSON.stringify(message.journey_data));

      const transformedMessage = dbManager.rowToMessage({
        ...messageRow,
        id: message.id,
        sender_id: message.sender_id,
        recipient_id: message.recipient_id,
        title: message.title,
        content: message.content,
        status: message.status
      } as any);

      expect(transformedMessage.id).toBe(message.id);
      expect(transformedMessage.sender_location).toEqual(message.sender_location);
      expect(transformedMessage.recipient_location).toEqual(message.recipient_location);
      expect(transformedMessage.journey_data).toEqual(message.journey_data);
    });

    it('should handle null values in transformations', () => {
      const userRow = dbManager.userToRow({
        opt_out_random: false,
        current_location: undefined
      });
      expect(userRow.opt_out_random).toBe(0);
      expect(userRow.current_location).toBe(null);

      const user = dbManager.rowToUser({
        id: 'test',
        created_at: '2023-01-01T00:00:00Z',
        last_active: '2023-01-01T00:00:00Z',
        total_journey_points: 0,
        current_rank: 'Fledgling Courier',
        location_sharing_preference: 'state',
        opt_out_random: 0,
        current_location: null
      });
      expect(user.opt_out_random).toBe(false);
      expect(user.current_location).toBeUndefined();
    });
  });

  describe('Database Schema', () => {
    it('should create all required tables', () => {
      const db = dbManager.getDatabase();
      
      // Check if tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('messages');
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('user_rewards');
      expect(tableNames).toContain('schema_version');
    });

    it('should enforce foreign key constraints', () => {
      const db = dbManager.getDatabase();
      
      // Try to insert message with non-existent sender
      expect(() => {
        db.prepare(`
          INSERT INTO messages (id, sender_id, title, content, sender_location, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('msg-1', 'non-existent-user', 'Test', 'Content', '{}', 'flying');
      }).toThrow();
    });

    it('should enforce check constraints', () => {
      const db = dbManager.getDatabase();
      
      // Insert a valid user first
      db.prepare(`
        INSERT INTO users (id, location_sharing_preference, opt_out_random)
        VALUES (?, ?, ?)
      `).run('user-1', 'state', 0);
      
      // Try to insert message with invalid status
      expect(() => {
        db.prepare(`
          INSERT INTO messages (id, sender_id, title, content, sender_location, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('msg-1', 'user-1', 'Test', 'Content', '{}', 'invalid-status');
      }).toThrow();
      
      // Try to insert message with title too long
      expect(() => {
        db.prepare(`
          INSERT INTO messages (id, sender_id, title, content, sender_location, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run('msg-2', 'user-1', 'a'.repeat(101), 'Content', '{}', 'flying');
      }).toThrow();
    });
  });
});

describe('Migration Runner', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should run all migrations on fresh database', () => {
    const db = dbManager.connect(TEST_DB_PATH);
    const migrationRunner = new MigrationRunner(db);
    
    expect(migrationRunner.getCurrentVersion()).toBe(0);
    
    migrationRunner.runMigrations();
    
    expect(migrationRunner.getCurrentVersion()).toBe(5);
  });

  it('should not run migrations if already up to date', () => {
    const db = dbManager.connect(TEST_DB_PATH);
    const migrationRunner = new MigrationRunner(db);
    
    migrationRunner.runMigrations();
    const versionAfterFirst = migrationRunner.getCurrentVersion();
    
    migrationRunner.runMigrations();
    const versionAfterSecond = migrationRunner.getCurrentVersion();
    
    expect(versionAfterFirst).toBe(versionAfterSecond);
  });

  it('should track migration versions correctly', () => {
    const db = dbManager.connect(TEST_DB_PATH);
    const migrationRunner = new MigrationRunner(db);
    
    migrationRunner.runMigrations();
    
    const versions = db.prepare('SELECT version FROM schema_version ORDER BY version').all() as { version: number }[];
    expect(versions.map(v => v.version)).toEqual([1, 2, 3, 4, 5]);
  });
});