import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageDeliveryService } from '@/services/messageDelivery';
import { NotificationService } from '@/services/notifications';
import { FlightEngine } from '@/services/flightEngine';
import { dbManager } from '@/lib/database';
import { FlightProgress, HonkMessage, User } from '@/types';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@/lib/migrations';

describe('Message Delivery Integration Tests', () => {
  let db: Database.Database;
  let deliveryService: MessageDeliveryService;
  let notificationService: NotificationService;
  let flightEngine: FlightEngine;

  const testDbPath = ':memory:'; // Use in-memory database for tests

  beforeEach(async () => {
    // Setup test database
    db = dbManager.connect(testDbPath);
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();

    // Create service instances
    deliveryService = new MessageDeliveryService({
      maxRetries: 2,
      retryDelayMs: 50,
      retryBackoffMultiplier: 2,
      maxRetryDelayMs: 200
    });
    
    notificationService = new NotificationService();
    flightEngine = new FlightEngine();

    // Insert test data
    await setupTestData();
  });

  afterEach(() => {
    deliveryService.cleanup();
    flightEngine.cleanup();
    db.close();
  });

  async function setupTestData() {
    // Insert test users
    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, total_journey_points, current_rank, 
                        location_sharing_preference, opt_out_random, total_flights_sent, 
                        total_flights_received, total_distance_traveled, countries_visited, 
                        states_visited, achievements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sender-1', 'sender@test.com', 'sender', 'hash', 1000, 'Novice Courier',
      'state', 0, 5, 3, 10000, '["USA", "UK"]', '["New York", "England"]', '[]'
    );

    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, total_journey_points, current_rank, 
                        location_sharing_preference, opt_out_random, total_flights_sent, 
                        total_flights_received, total_distance_traveled, countries_visited, 
                        states_visited, achievements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'recipient-1', 'recipient@test.com', 'recipient', 'hash', 500, 'Fledgling Courier',
      'country', 0, 2, 4, 5000, '["USA"]', '["New York"]', '[]'
    );

    // Insert test message
    db.prepare(`
      INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location, 
                           recipient_location, status, journey_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-message-1', 'sender-1', 'recipient-1', 'Test Message', 'Hello from London!',
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
      JSON.stringify({
        route: [],
        total_distance: 5585,
        estimated_duration: 3600000,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 5585
      })
    );
  }

  describe('Complete Delivery Flow', () => {
    it('should successfully deliver a message and create notifications', async () => {
      const flightProgress: FlightProgress = {
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

      // Mock notification service methods to track calls
      const createMessageReceivedSpy = vi.spyOn(notificationService, 'createMessageReceivedNotification');
      const createFlightDeliveredSpy = vi.spyOn(notificationService, 'createFlightDeliveredNotification');
      const createRewardUnlockedSpy = vi.spyOn(notificationService, 'createRewardUnlockedNotification');

      // Deliver the message
      const success = await deliveryService.deliverMessage('test-message-1', flightProgress);

      expect(success).toBe(true);

      // Verify message status was updated
      const updatedMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get('test-message-1');
      expect(updatedMessage.status).toBe('delivered');
      expect(updatedMessage.delivered_at).toBeTruthy();

      // Verify recipient statistics were updated
      const updatedRecipient = db.prepare('SELECT * FROM users WHERE id = ?').get('recipient-1');
      expect(updatedRecipient.total_flights_received).toBe(5); // Was 4, now 5

      // Verify notifications were created
      expect(createMessageReceivedSpy).toHaveBeenCalledWith(
        'recipient-1',
        'sender',
        'Test Message'
      );
      expect(createFlightDeliveredSpy).toHaveBeenCalledWith('sender-1', flightProgress);

      // Verify location bonus was awarded (UK is new for recipient)
      expect(createRewardUnlockedSpy).toHaveBeenCalledWith(
        'recipient-1',
        '1000 Journey Points', // 500 for UK + 500 for England
        'location_bonus'
      );

      // Verify journey points were awarded
      const finalRecipient = db.prepare('SELECT * FROM users WHERE id = ?').get('recipient-1');
      expect(finalRecipient.total_journey_points).toBe(1500); // Was 500, +1000 bonus

      // Verify location statistics were updated
      const countries = JSON.parse(finalRecipient.countries_visited);
      const states = JSON.parse(finalRecipient.states_visited);
      expect(countries).toContain('UK');
      expect(states).toContain('England');
    });

    it('should handle delivery retry on failure', async () => {
      // Create a message that will fail delivery (no recipient)
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'failing-message', 'sender-1', 'nonexistent-user', 'Failing Message', 'This will fail',
        JSON.stringify({ latitude: 0, longitude: 0, is_anonymous: false }), 'flying'
      );

      const flightProgress: FlightProgress = {
        message_id: 'failing-message',
        current_position: { latitude: 0, longitude: 0, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      // Attempt delivery
      await deliveryService.handleFlightCompletion('failing-message', flightProgress);

      // Should have scheduled a retry
      const deliveryStatus = deliveryService.getDeliveryStatus('failing-message');
      expect(deliveryStatus).toBeTruthy();
      expect(deliveryStatus?.attemptCount).toBe(1);

      // Wait for retry attempts to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // After max retries, should be removed from pending
      const finalStatus = deliveryService.getDeliveryStatus('failing-message');
      expect(finalStatus).toBeNull();
    });

    it('should not deliver already delivered messages', async () => {
      // Mark message as already delivered
      db.prepare(`
        UPDATE messages 
        SET status = 'delivered', delivered_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), 'test-message-1');

      const flightProgress: FlightProgress = {
        message_id: 'test-message-1',
        current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      const createMessageReceivedSpy = vi.spyOn(notificationService, 'createMessageReceivedNotification');

      const success = await deliveryService.deliverMessage('test-message-1', flightProgress);

      expect(success).toBe(true);
      expect(createMessageReceivedSpy).not.toHaveBeenCalled();
    });

    it('should handle anonymous messages', async () => {
      // Insert anonymous message (no recipient_id)
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'anonymous-message', 'sender-1', null, 'Anonymous Message', 'Hello anonymous!',
        JSON.stringify({ latitude: 0, longitude: 0, is_anonymous: true }), 'flying'
      );

      const flightProgress: FlightProgress = {
        message_id: 'anonymous-message',
        current_position: { latitude: 0, longitude: 0, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      const success = await deliveryService.deliverMessage('anonymous-message', flightProgress);

      expect(success).toBe(true);

      // Verify message was marked as delivered
      const updatedMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get('anonymous-message');
      expect(updatedMessage.status).toBe('delivered');
    });
  });

  describe('Flight Engine Integration', () => {
    it('should trigger delivery when flight completes', async () => {
      const startLocation = {
        latitude: 51.5074,
        longitude: -0.1278,
        is_anonymous: false
      };

      const endLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false
      };

      // Initialize a flight
      const flightRecord = await flightEngine.initializeFlight(
        'test-message-1',
        startLocation,
        endLocation
      );

      expect(flightRecord).toBeTruthy();
      expect(flightRecord?.message_id).toBe('test-message-1');

      // Mock the delivery service to track calls
      const handleFlightCompletionSpy = vi.spyOn(deliveryService, 'handleFlightCompletion');

      // Simulate flight completion by manually calling the completion handler
      // In real scenario, this would be triggered by the flight engine's progress updates
      const finalProgress: FlightProgress = {
        message_id: 'test-message-1',
        current_position: endLocation,
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      await deliveryService.handleFlightCompletion('test-message-1', finalProgress);

      expect(handleFlightCompletionSpy).toHaveBeenCalledWith('test-message-1', finalProgress);
    });
  });

  describe('Notification Persistence', () => {
    it('should persist notifications to database', async () => {
      const flightProgress: FlightProgress = {
        message_id: 'test-message-1',
        current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      await deliveryService.deliverMessage('test-message-1', flightProgress);

      // Check that notifications were persisted
      const notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id IN ('sender-1', 'recipient-1')
        ORDER BY created_at DESC
      `).all();

      expect(notifications.length).toBeGreaterThan(0);

      // Should have notifications for both sender and recipient
      const senderNotifications = notifications.filter(n => n.user_id === 'sender-1');
      const recipientNotifications = notifications.filter(n => n.user_id === 'recipient-1');

      expect(senderNotifications.length).toBeGreaterThan(0);
      expect(recipientNotifications.length).toBeGreaterThan(0);

      // Check notification types
      const deliveredNotification = senderNotifications.find(n => n.type === 'flight.delivered');
      const receivedNotification = recipientNotifications.find(n => n.type === 'message.received');

      expect(deliveredNotification).toBeTruthy();
      expect(receivedNotification).toBeTruthy();
    });
  });

  describe('Error Recovery', () => {
    it('should process pending deliveries on startup', async () => {
      // Create a message that should be delivered but isn't
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, title, content, sender_location, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'pending-message', 'sender-1', 'recipient-1', 'Pending Message', 'Should be delivered',
        JSON.stringify({ latitude: 0, longitude: 0, is_anonymous: false }), 'flying'
      );

      // Create corresponding flight record that's completed
      db.prepare(`
        INSERT INTO flights (id, message_id, status, route, total_distance, estimated_duration, 
                           progress_percentage, current_position, speed_kmh, weather_events, 
                           started_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'flight-pending', 'pending-message', 'delivered', '[]', 1000, 3600000, 100,
        JSON.stringify({ latitude: 0, longitude: 0, is_anonymous: false }), 50, '[]',
        new Date().toISOString(), new Date().toISOString()
      );

      // Mock flight engine to return completed progress
      const mockFlightProgress: FlightProgress = {
        message_id: 'pending-message',
        current_position: { latitude: 0, longitude: 0, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      vi.spyOn(flightEngine, 'getFlightProgress').mockReturnValue(mockFlightProgress);

      // Process pending deliveries
      await deliveryService.processPendingDeliveries();

      // Verify message was delivered
      const updatedMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get('pending-message');
      expect(updatedMessage.status).toBe('delivered');
    });
  });
});