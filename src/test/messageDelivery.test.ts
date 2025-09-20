import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { MessageDeliveryService } from '@/services/messageDelivery';
import { notificationService } from '@/services/notifications';
import { webSocketService } from '@/services/websocket';
import { dbManager } from '@/lib/database';
import { FlightProgress, HonkMessage, User } from '@/types';

// Mock dependencies
vi.mock('@/services/notifications');
vi.mock('@/services/websocket');
vi.mock('@/lib/database');

describe('MessageDeliveryService', () => {
  let deliveryService: MessageDeliveryService;
  let mockDb: any;

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

  const mockMessage: HonkMessage = {
    id: 'test-message-1',
    sender_id: 'sender-1',
    recipient_id: 'recipient-1',
    title: 'Test Message',
    content: 'This is a test message',
    sender_location: {
      latitude: 51.5074,
      longitude: -0.1278,
      country: 'UK',
      state: 'England',
      is_anonymous: false
    },
    recipient_location: {
      latitude: 40.7128,
      longitude: -74.0060,
      country: 'USA',
      state: 'New York',
      is_anonymous: false
    },
    status: 'flying',
    created_at: new Date(),
    journey_data: {
      route: [],
      total_distance: 5585,
      estimated_duration: 3600000,
      weather_events: [],
      current_progress: 100,
      journey_points_earned: 5585
    }
  };

  const mockSender: User = {
    id: 'sender-1',
    email: 'sender@test.com',
    username: 'sender',
    password_hash: 'hash',
    created_at: new Date(),
    last_active: new Date(),
    total_journey_points: 1000,
    current_rank: 'Novice Courier',
    location_sharing_preference: 'state',
    opt_out_random: false,
    total_flights_sent: 5,
    total_flights_received: 3,
    total_distance_traveled: 10000,
    countries_visited: ['USA', 'UK'],
    states_visited: ['New York', 'England'],
    achievements: []
  };

  const mockRecipient: User = {
    id: 'recipient-1',
    email: 'recipient@test.com',
    username: 'recipient',
    password_hash: 'hash',
    created_at: new Date(),
    last_active: new Date(),
    total_journey_points: 500,
    current_rank: 'Fledgling Courier',
    location_sharing_preference: 'country',
    opt_out_random: false,
    total_flights_sent: 2,
    total_flights_received: 4,
    total_distance_traveled: 5000,
    countries_visited: ['USA'],
    states_visited: ['New York'],
    achievements: []
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup database mock with proper chaining
    const mockPrepare = vi.fn();
    const mockGet = vi.fn();
    const mockRun = vi.fn(() => ({ changes: 1 }));
    const mockAll = vi.fn(() => []);

    mockPrepare.mockReturnValue({
      get: mockGet,
      run: mockRun,
      all: mockAll
    });

    mockDb = {
      transaction: vi.fn().mockImplementation((callback) => {
        try {
          return callback();
        } catch (error) {
          throw error;
        }
      }),
      prepare: mockPrepare
    };

    (dbManager.getDatabase as Mock).mockReturnValue(mockDb);
    (dbManager.rowToMessage as Mock).mockReturnValue(mockMessage);
    (dbManager.rowToUser as Mock).mockReturnValue(mockRecipient);

    // Create fresh service instance
    deliveryService = new MessageDeliveryService({
      maxRetries: 2,
      retryDelayMs: 100,
      retryBackoffMultiplier: 2,
      maxRetryDelayMs: 1000
    });
  });

  afterEach(() => {
    deliveryService.cleanup();
  });

  describe('deliverMessage', () => {
    it('should successfully deliver a message', async () => {
      // Setup database responses
      const messageQuery = mockDb.prepare().get;
      const recipientQuery = mockDb.prepare().get;
      const senderQuery = mockDb.prepare().get;
      const updateQuery = mockDb.prepare().run;

      // Create message row with proper JSON string for journey_data
      const messageRow = {
        ...mockMessage,
        status: 'flying',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };

      messageQuery
        .mockReturnValueOnce(messageRow) // Initial message query
        .mockReturnValueOnce(mockRecipient) // Recipient query
        .mockReturnValueOnce(mockSender) // Sender query
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) }); // Journey data query

      // Test delivery
      const result = await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(result).toBe(true);
      expect(updateQuery).toHaveBeenCalledWith(
        expect.any(String), // delivered_at timestamp
        'test-message-1'
      );
      expect(notificationService.createMessageReceivedNotification).toHaveBeenCalledWith(
        'recipient-1',
        'sender',
        'Test Message'
      );
      expect(notificationService.createFlightDeliveredNotification).toHaveBeenCalledWith(
        'sender-1',
        mockFlightProgress
      );
    });

    it('should handle already delivered messages', async () => {
      const messageQuery = mockDb.prepare().get;
      const messageRow = {
        ...mockMessage,
        status: 'delivered',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };
      
      messageQuery
        .mockReturnValueOnce(messageRow)
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) });

      const result = await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(result).toBe(true);
      expect(notificationService.createMessageReceivedNotification).not.toHaveBeenCalled();
    });

    it('should handle missing message', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(null);

      const result = await deliveryService.deliverMessage('nonexistent', mockFlightProgress);

      expect(result).toBe(false);
    });

    it('should handle database update failure', async () => {
      const messageQuery = mockDb.prepare().get;
      const updateQuery = mockDb.prepare().run;
      
      messageQuery.mockReturnValue({ ...mockMessage, status: 'flying' });
      updateQuery.mockReturnValue({ changes: 0 }); // Simulate update failure

      const result = await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(result).toBe(false);
    });

    it('should update recipient statistics', async () => {
      const messageQuery = mockDb.prepare().get;
      const updateQuery = mockDb.prepare().run;

      const messageRow = {
        ...mockMessage,
        status: 'flying',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };

      messageQuery
        .mockReturnValueOnce(messageRow)
        .mockReturnValueOnce(mockRecipient)
        .mockReturnValueOnce(mockSender)
        .mockReturnValueOnce(mockRecipient) // For statistics update
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) });

      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      // Should update total_flights_received and last_active
      expect(updateQuery).toHaveBeenCalledWith(
        expect.any(String), // timestamp
        'recipient-1'
      );
    });

    it('should award bonus points for new locations', async () => {
      const recipientWithLimitedTravel = {
        ...mockRecipient,
        countries_visited: ['USA'], // Missing UK
        states_visited: ['New York'] // Missing England
      };

      const messageQuery = mockDb.prepare().get;
      const updateQuery = mockDb.prepare().run;

      const messageRow = {
        ...mockMessage,
        status: 'flying',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };

      messageQuery
        .mockReturnValueOnce(messageRow)
        .mockReturnValueOnce(recipientWithLimitedTravel)
        .mockReturnValueOnce(mockSender)
        .mockReturnValueOnce(recipientWithLimitedTravel) // For statistics update
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) });

      (dbManager.rowToUser as Mock).mockReturnValue(recipientWithLimitedTravel);

      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      // Should award bonus points for new country (UK) and state (England)
      expect(notificationService.createRewardUnlockedNotification).toHaveBeenCalledWith(
        'recipient-1',
        '1000 Journey Points',
        'location_bonus'
      );
    });

    it('should send real-time WebSocket notification', async () => {
      const messageQuery = mockDb.prepare().get;

      const messageRow = {
        ...mockMessage,
        status: 'flying',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };

      messageQuery
        .mockReturnValueOnce(messageRow)
        .mockReturnValueOnce(mockRecipient)
        .mockReturnValueOnce(mockSender)
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) });

      await deliveryService.deliverMessage('test-message-1', mockFlightProgress);

      expect(webSocketService.sendToUser).toHaveBeenCalledWith(
        'recipient-1',
        {
          type: 'message_delivered',
          data: {
            messageId: 'test-message-1',
            title: 'Test Message',
            senderId: 'sender-1',
            deliveredAt: expect.any(String),
            flightProgress: mockFlightProgress
          }
        }
      );
    });
  });

  describe('handleFlightCompletion', () => {
    it('should handle successful flight completion', async () => {
      const messageQuery = mockDb.prepare().get;
      
      const messageRow = {
        ...mockMessage,
        status: 'flying',
        journey_data: JSON.stringify(mockMessage.journey_data)
      };

      messageQuery
        .mockReturnValueOnce(messageRow)
        .mockReturnValueOnce(mockRecipient)
        .mockReturnValueOnce(mockSender)
        .mockReturnValueOnce({ journey_data: JSON.stringify(mockMessage.journey_data) });

      await deliveryService.handleFlightCompletion('test-message-1', mockFlightProgress);

      expect(notificationService.createMessageReceivedNotification).toHaveBeenCalled();
    });

    it('should schedule retry on delivery failure', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(null); // Simulate message not found

      await deliveryService.handleFlightCompletion('test-message-1', mockFlightProgress);

      // Should have scheduled a retry
      const deliveryStatus = deliveryService.getDeliveryStatus('test-message-1');
      expect(deliveryStatus).toBeTruthy();
      expect(deliveryStatus?.attemptCount).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should retry failed deliveries with exponential backoff', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(null); // Always fail

      // Trigger initial failure
      await deliveryService.handleFlightCompletion('test-message-1', mockFlightProgress);

      let deliveryStatus = deliveryService.getDeliveryStatus('test-message-1');
      expect(deliveryStatus?.attemptCount).toBe(1);

      // Wait for first retry
      await new Promise(resolve => setTimeout(resolve, 150));

      deliveryStatus = deliveryService.getDeliveryStatus('test-message-1');
      expect(deliveryStatus?.attemptCount).toBe(2);
    });

    it('should stop retrying after max attempts', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery
        .mockReturnValue(null) // Always fail for message lookup
        .mockReturnValueOnce(mockMessage); // Return message for failure notification

      // Trigger initial failure and wait for all retries
      await deliveryService.handleFlightCompletion('test-message-1', mockFlightProgress);
      
      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have been removed from pending deliveries after max retries
      const deliveryStatus = deliveryService.getDeliveryStatus('test-message-1');
      expect(deliveryStatus).toBeNull();

      // Should have created failure notification
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'sender-1',
        'system.alert',
        'Delivery Failed',
        expect.stringContaining('couldn\'t deliver'),
        expect.objectContaining({ messageId: 'test-message-1' })
      );
    });

    it('should cancel pending retries', () => {
      // Add a pending delivery manually
      deliveryService['pendingDeliveries'].set('test-message-1', {
        messageId: 'test-message-1',
        attemptCount: 1,
        lastAttempt: new Date(),
        nextRetry: new Date(Date.now() + 1000)
      });

      const cancelled = deliveryService.cancelDeliveryRetries('test-message-1');
      expect(cancelled).toBe(true);

      const deliveryStatus = deliveryService.getDeliveryStatus('test-message-1');
      expect(deliveryStatus).toBeNull();
    });
  });

  describe('processPendingDeliveries', () => {
    it('should process undelivered messages with completed flights', async () => {
      const allQuery = mockDb.prepare().all;
      allQuery.mockReturnValue([{ id: 'test-message-1' }]);

      // Mock flight engine to return completed flight
      const mockFlightEngine = {
        getFlightProgress: vi.fn().mockReturnValue({
          ...mockFlightProgress,
          progress_percentage: 100
        })
      };

      // Mock the dynamic import
      vi.doMock('@/services/flightEngine', () => ({
        flightEngine: mockFlightEngine
      }));

      await deliveryService.processPendingDeliveries();

      expect(allQuery).toHaveBeenCalledWith();
    });
  });

  describe('delivery status tracking', () => {
    it('should track delivery attempts', () => {
      const pendingDeliveries = deliveryService.getPendingDeliveries();
      expect(pendingDeliveries).toHaveLength(0);

      // Add a pending delivery
      deliveryService['pendingDeliveries'].set('test-message-1', {
        messageId: 'test-message-1',
        attemptCount: 2,
        lastAttempt: new Date(),
        nextRetry: new Date(Date.now() + 5000),
        error: 'Test error'
      });

      const status = deliveryService.getDeliveryStatus('test-message-1');
      expect(status).toBeTruthy();
      expect(status?.attemptCount).toBe(2);
      expect(status?.error).toBe('Test error');

      const allPending = deliveryService.getPendingDeliveries();
      expect(allPending).toHaveLength(1);
    });
  });

  describe('cleanup', () => {
    it('should clear all timers and pending deliveries', () => {
      // Add some pending deliveries and timers
      deliveryService['pendingDeliveries'].set('test-1', {
        messageId: 'test-1',
        attemptCount: 1,
        lastAttempt: new Date(),
        nextRetry: new Date()
      });

      const timer = setTimeout(() => {}, 1000);
      deliveryService['retryTimers'].set('test-1', timer);

      deliveryService.cleanup();

      expect(deliveryService.getPendingDeliveries()).toHaveLength(0);
      expect(deliveryService['retryTimers'].size).toBe(0);
    });
  });
});