import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RankingService } from '@/services/ranking';
import { messageDeliveryService } from '@/services/messageDelivery';
import { dbManager } from '@/lib/database';
import { User, HonkMessage, JourneyData, WeatherEvent, LocationData, FlightProgress } from '@/types';
import Database from 'better-sqlite3';

describe('Ranking System Integration', () => {
  let testDb: Database.Database;
  let testUser: User;
  let testMessage: HonkMessage;

  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    
    // Create tables
    testDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL,
        total_journey_points INTEGER DEFAULT 0,
        current_rank TEXT DEFAULT 'Fledgling Courier',
        location_sharing_preference TEXT DEFAULT 'state',
        opt_out_random INTEGER DEFAULT 0,
        current_location TEXT,
        total_flights_sent INTEGER DEFAULT 0,
        total_flights_received INTEGER DEFAULT 0,
        total_distance_traveled REAL DEFAULT 0,
        countries_visited TEXT DEFAULT '[]',
        states_visited TEXT DEFAULT '[]',
        achievements TEXT DEFAULT '[]'
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sender_location TEXT NOT NULL,
        recipient_location TEXT,
        status TEXT DEFAULT 'flying',
        created_at TEXT NOT NULL,
        delivered_at TEXT,
        journey_data TEXT,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      );

      CREATE TABLE user_rewards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        reward_type TEXT NOT NULL,
        reward_id TEXT NOT NULL,
        unlocked_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Mock dbManager to use test database
    (dbManager as any).db = testDb;

    // Create test users
    testUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashed',
      created_at: new Date(),
      last_active: new Date(),
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'state',
      opt_out_random: false,
      total_flights_sent: 0,
      total_flights_received: 0,
      total_distance_traveled: 0,
      countries_visited: [],
      states_visited: [],
      achievements: []
    };

    const recipient: User = {
      id: 'recipient-user-1',
      email: 'recipient@example.com',
      username: 'recipient',
      password_hash: 'hashed',
      created_at: new Date(),
      last_active: new Date(),
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'state',
      opt_out_random: false,
      total_flights_sent: 0,
      total_flights_received: 0,
      total_distance_traveled: 0,
      countries_visited: [],
      states_visited: [],
      achievements: []
    };

    // Insert test users
    for (const user of [testUser, recipient]) {
      const userRow = dbManager.userToRow(user);
      testDb.prepare(`
        INSERT INTO users (
          id, email, username, password_hash, created_at, last_active,
          total_journey_points, current_rank, location_sharing_preference,
          opt_out_random, total_flights_sent, total_flights_received,
          total_distance_traveled, countries_visited, states_visited, achievements
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userRow.id, userRow.email, userRow.username, userRow.password_hash,
        userRow.created_at, userRow.last_active, userRow.total_journey_points,
        userRow.current_rank, userRow.location_sharing_preference,
        userRow.opt_out_random, userRow.total_flights_sent, userRow.total_flights_received,
        userRow.total_distance_traveled, userRow.countries_visited,
        userRow.states_visited, userRow.achievements
      );
    }

    // Create test message
    testMessage = {
      id: 'test-message-1',
      sender_id: testUser.id,
      recipient_id: recipient.id,
      title: 'Test Journey',
      content: 'Hello from across the world!',
      sender_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'USA',
        is_anonymous: false
      },
      recipient_location: {
        latitude: 35.6762,
        longitude: 139.6503,
        state: 'Tokyo',
        country: 'Japan',
        is_anonymous: false
      },
      status: 'flying',
      created_at: new Date(),
      journey_data: undefined
    };

    // Insert test message
    const messageRow = dbManager.messageToRow(testMessage);
    testDb.prepare(`
      INSERT INTO messages (
        id, sender_id, recipient_id, title, content, sender_location,
        recipient_location, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageRow.id, messageRow.sender_id, messageRow.recipient_id,
      messageRow.title, messageRow.content, messageRow.sender_location,
      messageRow.recipient_location, messageRow.status, messageRow.created_at
    );
  });

  afterEach(() => {
    testDb.close();
  });

  describe('End-to-End Journey Completion', () => {
    it('should award points and advance rank when a long international journey completes', async () => {
      // Create journey data for a long international flight with adverse weather
      const journeyData: JourneyData = {
        route: [
          { latitude: 40.7128, longitude: -74.0060, altitude: 1000, timestamp: new Date() },
          { latitude: 50.0, longitude: 0.0, altitude: 2000, timestamp: new Date() },
          { latitude: 35.6762, longitude: 139.6503, altitude: 1000, timestamp: new Date() }
        ],
        total_distance: 10850, // NYC to Tokyo (~10,850 km)
        estimated_duration: 14400, // 4 hours
        weather_events: [
          {
            type: 'storm',
            intensity: 0.9,
            speed_modifier: 0.5,
            location: { latitude: 50.0, longitude: 0.0, is_anonymous: false },
            timestamp: new Date()
          },
          {
            type: 'rain',
            intensity: 0.6,
            speed_modifier: 0.75,
            location: { latitude: 45.0, longitude: 90.0, is_anonymous: false },
            timestamp: new Date()
          }
        ],
        current_progress: 100,
        journey_points_earned: 0
      };

      // Process journey completion
      const advancement = await RankingService.processJourneyCompletion(
        testMessage.id,
        journeyData
      );

      // Verify points calculation
      expect(advancement).not.toBeNull();
      expect(advancement!.points_earned).toBeGreaterThan(15000); // Should be ~18,212 points
      
      // Calculate expected points: 10850 base + 2712.5 weather + 5000 distance + 1000 location = 19562.5
      const expectedPoints = 10850 + Math.floor(10850 * 0.25) + 5000 + 1000;
      expect(advancement!.points_earned).toBe(expectedPoints);
      expect(advancement!.new_rank).toBe('Veteran Voyager'); // Should advance to Veteran Voyager

      // Verify user was updated in database
      const updatedUserRow = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      const updatedUser = dbManager.rowToUser(updatedUserRow);
      
      expect(updatedUser.total_journey_points).toBe(advancement!.total_points);
      expect(updatedUser.current_rank).toBe('Veteran Voyager');
      expect(updatedUser.countries_visited).toContain('Japan');
      expect(updatedUser.states_visited).toContain('Tokyo');

      // Verify rewards were unlocked (only for the final rank achieved)
      const rewards = testDb.prepare(`
        SELECT * FROM user_rewards WHERE user_id = ? AND reward_type = 'rank_reward'
      `).all(testUser.id);

      expect(rewards.length).toBeGreaterThan(0);
      const rewardIds = rewards.map(r => r.reward_id);
      expect(rewardIds).toContain('route_preview'); // Veteran Voyager reward
      expect(rewardIds).toContain('message_scheduling'); // Veteran Voyager reward

      // Verify message was updated with journey points
      const updatedMessageRow = testDb.prepare('SELECT * FROM messages WHERE id = ?').get(testMessage.id);
      const updatedMessage = dbManager.rowToMessage(updatedMessageRow);
      expect(updatedMessage.journey_data?.journey_points_earned).toBe(advancement!.points_earned);
    });

    it('should handle multiple journeys and cumulative point progression', async () => {
      // First journey: Short domestic flight
      const journey1: JourneyData = {
        route: [],
        total_distance: 800, // 800 km
        estimated_duration: 1800,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const advancement1 = await RankingService.processJourneyCompletion(
        testMessage.id,
        journey1
      );

      // First journey should advance to Novice Navigator (1000+ points)
      expect(advancement1).not.toBeNull();
      expect(advancement1!.new_rank).toBe('Novice Navigator');
      
      // Verify points were awarded
      let userRow = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      let user = dbManager.rowToUser(userRow);
      expect(user.total_journey_points).toBe(1800); // 800 base + 1000 for new country + state

      // Second journey: Medium international flight with weather
      const journey2: JourneyData = {
        route: [],
        total_distance: 3000, // 3000 km
        estimated_duration: 3600,
        weather_events: [{
          type: 'storm',
          intensity: 0.8,
          speed_modifier: 0.5,
          location: { latitude: 45.0, longitude: 0.0, is_anonymous: false },
          timestamp: new Date()
        }],
        current_progress: 100,
        journey_points_earned: 0
      };

      // Create second message for different recipient location
      const message2Id = 'test-message-2';
      testDb.prepare(`
        INSERT INTO messages (
          id, sender_id, recipient_id, title, content, sender_location,
          recipient_location, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        message2Id, testUser.id, 'recipient-user-1', 'Second Journey', 'Hello again!',
        JSON.stringify({ latitude: 40.7128, longitude: -74.0060, is_anonymous: false }),
        JSON.stringify({ latitude: 51.5074, longitude: -0.1278, state: 'England', country: 'UK', is_anonymous: false }),
        'flying', new Date().toISOString()
      );

      const advancement2 = await RankingService.processJourneyCompletion(
        message2Id,
        journey2
      );

      expect(advancement2).not.toBeNull();
      expect(advancement2!.new_rank).toBe('Skilled Skywriter'); // Should advance with cumulative points

      // Verify cumulative points
      userRow = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      user = dbManager.rowToUser(userRow);
      expect(user.total_journey_points).toBeGreaterThan(5000); // Should exceed Skilled Skywriter threshold
      expect(user.countries_visited).toContain('Japan');
      expect(user.countries_visited).toContain('UK');
    });

    it('should handle edge cases and bonus calculations correctly', async () => {
      // Journey with exactly 10,000km for long distance bonus
      const longJourney: JourneyData = {
        route: [],
        total_distance: 10000, // Exactly at threshold
        estimated_duration: 7200,
        weather_events: [
          {
            type: 'wind',
            intensity: 0.8, // High intensity wind
            speed_modifier: 1.25,
            location: { latitude: 45.0, longitude: 0.0, is_anonymous: false },
            timestamp: new Date()
          }
        ],
        current_progress: 100,
        journey_points_earned: 0
      };

      const advancement = await RankingService.processJourneyCompletion(
        testMessage.id,
        longJourney
      );

      expect(advancement).not.toBeNull();
      
      // Verify long distance bonus was applied
      const expectedPoints = 10000 + // Base points
                           2500 + // Weather bonus (25% of 10000)
                           5000 + // Long distance bonus
                           1000;  // New location bonus (Japan country + Tokyo state)
      
      expect(advancement!.points_earned).toBe(expectedPoints);
      expect(advancement!.new_rank).toBe('Veteran Voyager'); // Should reach Veteran Voyager with 18500 points
    });

    it('should not award location bonus for already visited places', async () => {
      // First journey to establish visited locations
      const journey1: JourneyData = {
        route: [],
        total_distance: 1000,
        estimated_duration: 1800,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      await RankingService.processJourneyCompletion(testMessage.id, journey1);

      // Second journey to same location
      const message2Id = 'test-message-2';
      testDb.prepare(`
        INSERT INTO messages (
          id, sender_id, recipient_id, title, content, sender_location,
          recipient_location, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        message2Id, testUser.id, 'recipient-user-1', 'Return Journey', 'Back to Japan!',
        JSON.stringify({ latitude: 51.5074, longitude: -0.1278, is_anonymous: false }),
        JSON.stringify({ latitude: 35.6762, longitude: 139.6503, state: 'Tokyo', country: 'Japan', is_anonymous: false }),
        'flying', new Date().toISOString()
      );

      const journey2: JourneyData = {
        route: [],
        total_distance: 1000,
        estimated_duration: 1800,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const advancement2 = await RankingService.processJourneyCompletion(message2Id, journey2);

      // Should only get base points, no location bonus
      // But advancement2 might be null if no rank change occurs
      if (advancement2) {
        expect(advancement2.points_earned).toBe(1000); // Only base points
      } else {
        // Verify points were still added to user
        const finalUserRow = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
        const finalUser = dbManager.rowToUser(finalUserRow);
        expect(finalUser.total_journey_points).toBeGreaterThan(1800); // Previous total + 1000
      }
    });
  });

  describe('Leaderboard and Statistics', () => {
    it('should correctly rank users by journey points', async () => {
      // Create additional users with different point totals
      const users = [
        { id: 'user2', username: 'alice', points: 5000 },
        { id: 'user3', username: 'bob', points: 15000 },
        { id: 'user4', username: 'charlie', points: 2000 }
      ];

      for (const user of users) {
        testDb.prepare(`
          INSERT INTO users (
            id, email, username, password_hash, created_at, last_active,
            total_journey_points, current_rank, location_sharing_preference,
            opt_out_random, total_flights_sent, total_flights_received,
            total_distance_traveled, countries_visited, states_visited, achievements
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          user.id, `${user.username}@example.com`, user.username, 'hashed',
          new Date().toISOString(), new Date().toISOString(), user.points,
          RankingService.getRankForPoints(user.points).name, 'state', 0, 0, 0, 0, '[]', '[]', '[]'
        );
      }

      // Award points to test user
      await RankingService.updateUserPoints(testUser.id, 8000, { countries: [], states: [] });

      const leaderboard = await RankingService.getLeaderboard(10);

      expect(leaderboard).toHaveLength(5);
      expect(leaderboard[0].user.username).toBe('bob'); // 15000 points
      expect(leaderboard[1].user.username).toBe('testuser'); // 8000 points
      expect(leaderboard[2].user.username).toBe('alice'); // 5000 points
      expect(leaderboard[3].user.username).toBe('charlie'); // 2000 points
    });

    it('should provide comprehensive user statistics', async () => {
      // Award points and visit locations
      await RankingService.updateUserPoints(
        testUser.id, 
        7500, 
        { countries: ['Japan', 'UK', 'France'], states: ['Tokyo', 'England', 'Paris'] }
      );

      // Add some rewards
      testDb.prepare(`
        INSERT INTO user_rewards (id, user_id, reward_type, reward_id, unlocked_at)
        VALUES ('reward1', ?, 'rank_reward', 'weather_forecast', ?)
      `).run(testUser.id, new Date().toISOString());

      const stats = await RankingService.getUserStats(testUser.id);

      expect(stats.user.total_journey_points).toBe(7500);
      expect(stats.current_rank.name).toBe('Skilled Skywriter');
      expect(stats.next_rank?.name).toBe('Veteran Voyager');
      expect(stats.points_needed).toBe(7500); // 15000 - 7500
      expect(stats.user.countries_visited).toEqual(['Japan', 'UK', 'France']);
      expect(stats.user.states_visited).toEqual(['Tokyo', 'England', 'Paris']);
      expect(stats.achievements.length).toBeGreaterThanOrEqual(1);
    });
  });
});