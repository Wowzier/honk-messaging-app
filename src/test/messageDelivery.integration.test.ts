import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageDeliveryService } from '@/services/messageDelivery';
import { notificationService } from '@/services/notifications';
import { webSocketService } from '@/services/websocket';
import { dbManager } from '@/lib/database';
import { FlightProgress, HonkMessage, User } from '@/types';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@/lib/migrations';
import path from 'path';
import fs from 'fs';

// Mock external services
vi.mock('@/services/notifications');
vi.mock('@/services/websocket');

describe('MessageDeliveryService - Integration Tests', () => {
  let deliveryService: MessageDeliveryService;
  let testDb: Database.Database;
  let testDbPath: string;

  const mockFlightProgress: FlightProgress = {
    message_id: 'test-message-1',
    current_position: {
      latitude: 40.7128,
      longitude: -74.0060,
      is_anonymous: false
    },
    progress_percentage: 100,
    estimated_arrival: new Date(),
    current_weather: {
      type: 'clear',
      intensity: 0,
      speed_modifier: 1.0,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      },
      timestamp: new Date()
    }
  };

  beforeEach(async () => {
    // Create temporary test database
    testDbPath = path.join(process.cwd(), 'test-delivery.db');
    
    // Remove existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Connect to test database
    testDb = dbManager.connect(testDbPath);
    
    // Run migrations
    const migrationRunner = new MigrationRunner(testDb);
    migrationRunner.runMigrations();

    // Create test data
    await setupTestData();

    // Create delivery service
    deliveryService = new MessageDeliveryService({
      maxRetries: 2,
      retryDelayMs: 100,
      retryBackoffMultiplier: 2,
      maxRetryDelayMs: 1000
    });

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    deliveryService.cleanup();
    dbManager.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  async function setupTestData() {
    // Insert test users
    testDb.prepare(`
      INSERT INTO users (id, email, username, password_hash, total_journey_points, current_rank, 
                        location_sharing_preference, opt_out_random, countries_visited, states_visited)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sender-1', 'sender@test.com', 'sender', 'hash', 1000, 'Novice Courier',
      'state', 0, JSON.stringify(['USA', 'UK']), JSON.stringify(['New York', 'England'])
    );

    testDb.prepare(`
      INSERT INTO users (id, email, username, password_hash, total_journey_points, current_rank,
                        location_sharing_preference, opt_out_random, countries_visited, states_visited)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'recipient-1', 'recipient@test.com', 'recipient', 'hash', 500, 'Fledgling Courier',
      'country', 0, JSON.stringify(['USA']), JSON.stringify(['New York'])
    );

    // Insert test message
    const journeyData = {
      route: [],
      total_distance: 5585,
      estimated_duration: 3600000,
      weather_events: [],
      current_progress: 100,
      journey_points_earned: 5585
    };

    testDb.prepare(`
      INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location, 
                           recipient_location, status, journey_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-message-1', 'sender-1', 'recipient-1', 'Test Message', 'This is a test message',
      JSON.stringify({
        latitude: 51.5074,
        longitude: -0.1278,
        country: 'UK',
        state: 'England',
        is_anonymous: false
      }),
      JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        country: 'USA',
        state: 'New York',
        is_anonymous: false
      }),
      'flying',
      JSON.stringify(journeyData)
    );
  }

  describe('message delivery', () => {
    it('should successfully deliver a message with real database', async () => {
      const result = await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(result).toBe(true);

      // Verify message status was updated
      const message = testDb.prepare('SELECT * FROM messages WHERE id = ?').get('test-message-1');
      expect(message.status).toBe('delivered');
      expect(message.delivered_at).toBeTruthy();

      // Verify notifications were created
      expect(notificationService.createMessageReceivedNotification).toHaveBeenCalledWith(
        'recipient-1',
        'sender',
        'Test Message'
      );
      expect(notificationService.createFlightDeliveredNotification).toHaveBeenCalledWith(
        'sender-1',
        mockFlightProgress
      );

      // Verify WebSocket notification was sent
      expect(webSocketService.sendToUser).toHaveBeenCalledWith(
        'recipient-1',
        expect.objectContaining({
          type: 'message_delivered',
          data: expect.objectContaining({
            messageId: 'test-message-1',
            title: 'Test Message',
            senderId: 'sender-1'
          })
        })
      );
    });

    it('should handle already delivered messages', async () => {
      // First delivery
      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);
      
      // Clear mocks
      vi.clearAllMocks();

      // Second delivery attempt
      const result = await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(result).toBe(true);
      expect(notificationService.createMessageReceivedNotification).not.toHaveBeenCalled();
    });

    it('should update recipient statistics', async () => {
      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      // Check recipient statistics were updated
      const recipient = testDb.prepare('SELECT * FROM users WHERE id = ?').get('recipient-1');
      expect(recipient.total_flights_received).toBe(1);
      expect(recipient.last_active).toBeTruthy();
    });

    it('should award bonus points for new locations', async () => {
      // Update recipient to have limited travel history
      testDb.prepare(`
        UPDATE users 
        SET countries_visited = ?, states_visited = ?
        WHERE id = ?
      `).run(JSON.stringify(['USA']), JSON.stringify(['New York']), 'recipient-1');

      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      // Check that bonus points were awarded for new location (UK/England)
      expect(notificationService.createRewardUnlockedNotification).toHaveBeenCalledWith(
        'recipient-1',
        '1000 Journey Points',
        'location_bonus'
      );

      // Verify location statistics were updated
      const recipient = testDb.prepare('SELECT * FROM users WHERE id = ?').get('recipient-1');
      const countries = JSON.parse(recipient.countries_visited);
      const states = JSON.parse(recipient.states_visited);
      
      expect(countries).toContain('UK');
      expect(states).toContain('England');
    });
  });

  describe('flight completion handling', () => {
    it('should handle successful flight completion', async () => {
      await deliveryService.handleFlightCompletion('test-message-1', mockFlightProgress);

      // Verify message was delivered
      const message = testDb.prepare('SELECT * FROM messages WHERE id = ?').get('test-message-1');
      expect(message.status).toBe('delivered');

      expect(notificationService.createMessageReceivedNotification).toHaveBeenCalled();
    });

    it('should schedule retry on delivery failure', async () => {
      // Use non-existent message to trigger failure
      await deliveryService.handleFlightCompletion('nonexistent-message', mockFlightProgress);

      // Should have scheduled a retry
      const deliveryStatus = deliveryService.getDeliveryStatus('nonexistent-message');
      expect(deliveryStatus).toBeTruthy();
      expect(deliveryStatus?.attemptCount).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should retry failed deliveries', async () => {
      // Use non-existent message to trigger failure
      await deliveryService.handleFlightCompletion('nonexistent-message', mockFlightProgress);

      let deliveryStatus = deliveryService.getDeliveryStatus('nonexistent-message');
      expect(deliveryStatus?.attemptCount).toBe(1);

      // Wait for first retry
      await new Promise(resolve => setTimeout(resolve, 150));

      deliveryStatus = deliveryService.getDeliveryStatus('nonexistent-message');
      expect(deliveryStatus?.attemptCount).toBe(2);
    });

    it('should stop retrying after max attempts', async () => {
      // Use non-existent message to trigger failure
      await deliveryService.handleFlightCompletion('nonexistent-message', mockFlightProgress);
      
      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have been removed from pending deliveries after max retries
      const deliveryStatus = deliveryService.getDeliveryStatus('nonexistent-message');
      expect(deliveryStatus).toBeNull();
    });
  });
});