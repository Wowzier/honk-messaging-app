import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RankingService, AVIATOR_RANKS, BONUS_CONFIG } from '@/services/ranking';
import { dbManager } from '@/lib/database';
import { User, JourneyData, WeatherEvent, LocationData } from '@/types';
import Database from 'better-sqlite3';

describe('RankingService', () => {
  let testDb: Database.Database;
  let testUser: User;

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
    `);

    // Mock dbManager to use test database
    (dbManager as any).db = testDb;

    // Create test user
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

    // Insert test user
    const userRow = dbManager.userToRow(testUser);
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
  });

  afterEach(() => {
    testDb.close();
  });

  describe('calculateJourneyPoints', () => {
    it('should calculate base points correctly (1 point per km)', () => {
      const journeyData: JourneyData = {
        route: [],
        total_distance: 1500, // 1500km
        estimated_duration: 3600,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const senderLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'USA',
        is_anonymous: false
      };

      const recipientLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        state: 'England',
        country: 'UK',
        is_anonymous: false
      };

      const result = RankingService.calculateJourneyPoints(
        journeyData,
        senderLocation,
        recipientLocation,
        testUser
      );

      expect(result.base_points).toBe(1500);
      expect(result.weather_bonus).toBe(0);
      expect(result.distance_bonus).toBe(0);
      expect(result.location_bonus).toBe(1000); // New country (UK) + new state (England)
      expect(result.total_points).toBe(2500);
      expect(result.breakdown).toContain('Base: 1500 points (1500km × 1)');
    });

    it('should apply weather bonus for adverse conditions', () => {
      const weatherEvents: WeatherEvent[] = [
        {
          type: 'storm',
          intensity: 0.8,
          speed_modifier: 0.5,
          location: { latitude: 45, longitude: 0, is_anonymous: false },
          timestamp: new Date()
        },
        {
          type: 'rain',
          intensity: 0.6,
          speed_modifier: 0.75,
          location: { latitude: 46, longitude: 1, is_anonymous: false },
          timestamp: new Date()
        }
      ];

      const journeyData: JourneyData = {
        route: [],
        total_distance: 2000,
        estimated_duration: 3600,
        weather_events: weatherEvents,
        current_progress: 100,
        journey_points_earned: 0
      };

      const senderLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      };

      const recipientLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        is_anonymous: false
      };

      const result = RankingService.calculateJourneyPoints(
        journeyData,
        senderLocation,
        recipientLocation,
        testUser
      );

      expect(result.base_points).toBe(2000);
      expect(result.weather_bonus).toBe(500); // 25% of 2000
      expect(result.breakdown).toContain('Weather bonus: 500 points (2 adverse conditions)');
    });

    it('should apply long distance bonus for journeys over 10,000km', () => {
      const journeyData: JourneyData = {
        route: [],
        total_distance: 12000, // Over 10,000km threshold
        estimated_duration: 3600,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const senderLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      };

      const recipientLocation: LocationData = {
        latitude: -33.8688,
        longitude: 151.2093,
        is_anonymous: false
      };

      const result = RankingService.calculateJourneyPoints(
        journeyData,
        senderLocation,
        recipientLocation,
        testUser
      );

      expect(result.base_points).toBe(12000);
      expect(result.distance_bonus).toBe(5000);
      expect(result.breakdown).toContain('Long distance bonus: 5000 points (12000km ≥ 10000km)');
    });

    it('should apply new location bonus for unvisited countries/states', () => {
      // User has already visited some places
      const userWithHistory: User = {
        ...testUser,
        countries_visited: ['USA', 'Canada'],
        states_visited: ['New York', 'California']
      };

      const journeyData: JourneyData = {
        route: [],
        total_distance: 1000,
        estimated_duration: 3600,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const senderLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      };

      const recipientLocation: LocationData = {
        latitude: 48.8566,
        longitude: 2.3522,
        state: 'Île-de-France',
        country: 'France', // New country
        is_anonymous: false
      };

      const result = RankingService.calculateJourneyPoints(
        journeyData,
        senderLocation,
        recipientLocation,
        userWithHistory
      );

      expect(result.location_bonus).toBe(1000); // 500 for France + 500 for Île-de-France
      expect(result.breakdown).toContain('New location bonus: 1000 points (France, Île-de-France)');
    });

    it('should not apply location bonus for already visited places', () => {
      const userWithHistory: User = {
        ...testUser,
        countries_visited: ['USA', 'UK'],
        states_visited: ['New York', 'England']
      };

      const journeyData: JourneyData = {
        route: [],
        total_distance: 1000,
        estimated_duration: 3600,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 0
      };

      const senderLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      };

      const recipientLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        state: 'England', // Already visited
        country: 'UK', // Already visited
        is_anonymous: false
      };

      const result = RankingService.calculateJourneyPoints(
        journeyData,
        senderLocation,
        recipientLocation,
        userWithHistory
      );

      expect(result.location_bonus).toBe(0);
      expect(result.breakdown).not.toContain('New location bonus');
    });
  });

  describe('getRankForPoints', () => {
    it('should return correct rank for point thresholds', () => {
      expect(RankingService.getRankForPoints(0).name).toBe('Fledgling Courier');
      expect(RankingService.getRankForPoints(500).name).toBe('Fledgling Courier');
      expect(RankingService.getRankForPoints(1000).name).toBe('Novice Navigator');
      expect(RankingService.getRankForPoints(5000).name).toBe('Skilled Skywriter');
      expect(RankingService.getRankForPoints(15000).name).toBe('Veteran Voyager');
      expect(RankingService.getRankForPoints(35000).name).toBe('Master Messenger');
      expect(RankingService.getRankForPoints(75000).name).toBe('Elite Explorer');
      expect(RankingService.getRankForPoints(150000).name).toBe('Legendary Aviator');
      expect(RankingService.getRankForPoints(999999).name).toBe('Legendary Aviator');
    });
  });

  describe('updateUserPoints', () => {
    it('should update user points and advance rank when threshold is reached', async () => {
      const advancement = await RankingService.updateUserPoints(
        testUser.id,
        1500, // Enough to reach Novice Navigator (1000 points)
        { countries: ['UK'], states: ['England'] }
      );

      expect(advancement).not.toBeNull();
      expect(advancement!.previous_rank).toBe('Fledgling Courier');
      expect(advancement!.new_rank).toBe('Novice Navigator');
      expect(advancement!.points_earned).toBe(1500);
      expect(advancement!.total_points).toBe(1500);
      expect(advancement!.rewards_unlocked).toContain('weather_forecast');

      // Verify database was updated
      const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      expect(updatedUser.total_journey_points).toBe(1500);
      expect(updatedUser.current_rank).toBe('Novice Navigator');
      expect(JSON.parse(updatedUser.countries_visited)).toContain('UK');
      expect(JSON.parse(updatedUser.states_visited)).toContain('England');
    });

    it('should not return advancement if rank does not change', async () => {
      const advancement = await RankingService.updateUserPoints(
        testUser.id,
        500, // Not enough to advance from Fledgling Courier
        { countries: [], states: [] }
      );

      expect(advancement).toBeNull();

      // Verify points were still updated
      const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      expect(updatedUser.total_journey_points).toBe(500);
      expect(updatedUser.current_rank).toBe('Fledgling Courier');
    });

    it('should unlock rewards when advancing multiple ranks', async () => {
      const advancement = await RankingService.updateUserPoints(
        testUser.id,
        6000, // Enough to reach Skilled Skywriter (5000 points)
        { countries: [], states: [] }
      );

      expect(advancement).not.toBeNull();
      expect(advancement!.new_rank).toBe('Skilled Skywriter');
      expect(advancement!.rewards_unlocked).toEqual(['priority_delivery', 'custom_themes']);

      // Verify rewards were added to database
      const rewards = testDb.prepare(`
        SELECT * FROM user_rewards WHERE user_id = ? AND reward_type = 'rank_reward'
      `).all(testUser.id);

      expect(rewards).toHaveLength(2);
      expect(rewards.map(r => r.reward_id)).toContain('priority_delivery');
      expect(rewards.map(r => r.reward_id)).toContain('custom_themes');
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user statistics', async () => {
      // Set up user with some progress
      testDb.prepare(`
        UPDATE users 
        SET total_journey_points = 3000, current_rank = 'Novice Navigator'
        WHERE id = ?
      `).run(testUser.id);

      // Add some rewards
      testDb.prepare(`
        INSERT INTO user_rewards (id, user_id, reward_type, reward_id, unlocked_at)
        VALUES ('reward1', ?, 'rank_reward', 'weather_forecast', ?)
      `).run(testUser.id, new Date().toISOString());

      const stats = await RankingService.getUserStats(testUser.id);

      expect(stats.user.total_journey_points).toBe(3000);
      expect(stats.current_rank.name).toBe('Novice Navigator');
      expect(stats.next_rank?.name).toBe('Skilled Skywriter');
      expect(stats.points_needed).toBe(2000); // 5000 - 3000
      expect(stats.progress_to_next).toBe(50); // 2000/4000 * 100
      expect(stats.achievements).toHaveLength(1);
      expect(stats.achievements[0].reward_id).toBe('weather_forecast');
    });

    it('should handle max rank correctly', async () => {
      // Set user to max rank
      testDb.prepare(`
        UPDATE users 
        SET total_journey_points = 200000, current_rank = 'Legendary Aviator'
        WHERE id = ?
      `).run(testUser.id);

      const stats = await RankingService.getUserStats(testUser.id);

      expect(stats.current_rank.name).toBe('Legendary Aviator');
      expect(stats.next_rank).toBeUndefined();
      expect(stats.progress_to_next).toBe(100);
      expect(stats.points_needed).toBe(0);
    });
  });

  describe('getLeaderboard', () => {
    it('should return users ordered by journey points', async () => {
      // Add more test users
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
          'Fledgling Courier', 'state', 0, 0, 0, 0, '[]', '[]', '[]'
        );
      }

      const leaderboard = await RankingService.getLeaderboard(5);

      expect(leaderboard).toHaveLength(4); // 3 new users + 1 original
      expect(leaderboard[0].user.username).toBe('bob'); // 15000 points
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].user.username).toBe('alice'); // 5000 points
      expect(leaderboard[1].rank).toBe(2);
      expect(leaderboard[2].user.username).toBe('charlie'); // 2000 points
      expect(leaderboard[2].rank).toBe(3);
      expect(leaderboard[3].user.username).toBe('testuser'); // 0 points
      expect(leaderboard[3].rank).toBe(4);
    });
  });

  describe('processJourneyCompletion', () => {
    it('should process complete journey and award points', async () => {
      // Create a test message
      const messageId = 'test-message-1';
      const recipientLocation: LocationData = {
        latitude: 51.5074,
        longitude: -0.1278,
        state: 'England',
        country: 'UK',
        is_anonymous: false
      };

      // Create recipient user first
      const recipientId = 'recipient-user-1';
      const recipientUserRow = dbManager.userToRow({
        id: recipientId,
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
      });

      testDb.prepare(`
        INSERT INTO users (
          id, email, username, password_hash, created_at, last_active,
          total_journey_points, current_rank, location_sharing_preference,
          opt_out_random, total_flights_sent, total_flights_received,
          total_distance_traveled, countries_visited, states_visited, achievements
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recipientUserRow.id, recipientUserRow.email, recipientUserRow.username, recipientUserRow.password_hash,
        recipientUserRow.created_at, recipientUserRow.last_active, recipientUserRow.total_journey_points,
        recipientUserRow.current_rank, recipientUserRow.location_sharing_preference,
        recipientUserRow.opt_out_random, recipientUserRow.total_flights_sent, recipientUserRow.total_flights_received,
        recipientUserRow.total_distance_traveled, recipientUserRow.countries_visited,
        recipientUserRow.states_visited, recipientUserRow.achievements
      );

      testDb.prepare(`
        INSERT INTO messages (
          id, sender_id, recipient_id, title, content, sender_location,
          recipient_location, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId, testUser.id, recipientId, 'Test Message', 'Hello!',
        JSON.stringify({ latitude: 40.7128, longitude: -74.0060, is_anonymous: false }),
        JSON.stringify(recipientLocation),
        'flying', new Date().toISOString()
      );

      const journeyData: JourneyData = {
        route: [],
        total_distance: 5500,
        estimated_duration: 3600,
        weather_events: [{
          type: 'storm',
          intensity: 0.8,
          speed_modifier: 0.5,
          location: recipientLocation,
          timestamp: new Date()
        }],
        current_progress: 100,
        journey_points_earned: 0
      };

      const advancement = await RankingService.processJourneyCompletion(messageId, journeyData);

      expect(advancement).not.toBeNull();
      expect(advancement!.new_rank).toBe('Skilled Skywriter'); // Should advance with ~7875 points

      // Verify message was updated with journey points
      const updatedMessage = testDb.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
      const updatedJourneyData = JSON.parse(updatedMessage.journey_data);
      expect(updatedJourneyData.journey_points_earned).toBeGreaterThan(0);

      // Verify user was updated
      const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      expect(updatedUser.total_journey_points).toBeGreaterThan(5000);
      expect(JSON.parse(updatedUser.countries_visited)).toContain('UK');
    });
  });

  describe('AVIATOR_RANKS configuration', () => {
    it('should have properly ordered rank thresholds', () => {
      for (let i = 1; i < AVIATOR_RANKS.length; i++) {
        expect(AVIATOR_RANKS[i].min_points).toBeGreaterThan(AVIATOR_RANKS[i - 1].min_points);
      }
    });

    it('should start with 0 points for first rank', () => {
      expect(AVIATOR_RANKS[0].min_points).toBe(0);
      expect(AVIATOR_RANKS[0].name).toBe('Fledgling Courier');
    });
  });

  describe('BONUS_CONFIG validation', () => {
    it('should have reasonable bonus values', () => {
      expect(BONUS_CONFIG.BASE_POINTS_PER_KM).toBe(1);
      expect(BONUS_CONFIG.WEATHER_BONUS_MULTIPLIER).toBe(0.25);
      expect(BONUS_CONFIG.LONG_DISTANCE_THRESHOLD).toBe(10000);
      expect(BONUS_CONFIG.LONG_DISTANCE_BONUS).toBe(5000);
      expect(BONUS_CONFIG.NEW_LOCATION_BONUS).toBe(500);
    });
  });
});