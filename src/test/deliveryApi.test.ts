import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/messages/[id]/delivery/route';
import { GET as getPending, POST as processPending } from '@/app/api/delivery/process-pending/route';
import { dbManager } from '@/lib/database';
import { messageDeliveryService } from '@/services/messageDelivery';
import { flightEngine } from '@/services/flightEngine';

// Mock dependencies
vi.mock('@/lib/database');
vi.mock('@/services/messageDelivery');
vi.mock('@/services/flightEngine');

describe('Delivery API Endpoints', () => {
  let mockDb: any;

  const mockMessage = {
    id: 'test-message-1',
    sender_id: 'sender-1',
    recipient_id: 'recipient-1',
    title: 'Test Message',
    content: 'Test content',
    status: 'flying',
    created_at: new Date(),
    delivered_at: null
  };

  const mockFlightProgress = {
    message_id: 'test-message-1',
    current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
    progress_percentage: 100,
    estimated_arrival: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      prepare: vi.fn(() => ({
        get: vi.fn(),
        run: vi.fn(() => ({ changes: 1 })),
        all: vi.fn(() => [])
      }))
    };

    (dbManager.getDatabase as Mock).mockReturnValue(mockDb);
    (dbManager.rowToMessage as Mock).mockReturnValue(mockMessage);
  });

  describe('GET /api/messages/[id]/delivery', () => {
    it('should return delivery status for existing message', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(mockMessage);

      (messageDeliveryService.getDeliveryStatus as Mock).mockReturnValue({
        attemptCount: 2,
        lastAttempt: new Date(),
        nextRetry: new Date(Date.now() + 5000),
        error: 'Test error'
      });

      (flightEngine.getFlightProgress as Mock).mockReturnValue(mockFlightProgress);

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery');
      const response = await GET(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messageId).toBe('test-message-1');
      expect(data.status).toBe('flying');
      expect(data.deliveryAttempts).toBeTruthy();
      expect(data.deliveryAttempts.attemptCount).toBe(2);
      expect(data.flightProgress).toBeTruthy();
    });

    it('should return 404 for non-existent message', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/messages/nonexistent/delivery');
      const response = await GET(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Message not found');
    });

    it('should return 400 for missing message ID', async () => {
      const request = new NextRequest('http://localhost/api/messages//delivery');
      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message ID is required');
    });

    it('should handle delivery status without pending retries', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue({ ...mockMessage, status: 'delivered', delivered_at: new Date() });

      (messageDeliveryService.getDeliveryStatus as Mock).mockReturnValue(null);
      (flightEngine.getFlightProgress as Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery');
      const response = await GET(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('delivered');
      expect(data.deliveryAttempts).toBeNull();
    });
  });

  describe('POST /api/messages/[id]/delivery', () => {
    it('should trigger delivery for completed flight', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(mockMessage);

      (flightEngine.getFlightProgress as Mock).mockReturnValue(mockFlightProgress);
      (messageDeliveryService.handleFlightCompletion as Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'POST'
      });
      const response = await POST(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(messageDeliveryService.handleFlightCompletion).toHaveBeenCalledWith(
        'test-message-1',
        mockFlightProgress
      );
    });

    it('should return 400 for already delivered message', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue({ ...mockMessage, status: 'delivered' });

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'POST'
      });
      const response = await POST(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message already delivered');
    });

    it('should return 400 for incomplete flight', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(mockMessage);

      (flightEngine.getFlightProgress as Mock).mockReturnValue({
        ...mockFlightProgress,
        progress_percentage: 75
      });

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'POST'
      });
      const response = await POST(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Flight not yet complete');
    });

    it('should return 404 for non-existent message', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/messages/nonexistent/delivery', {
        method: 'POST'
      });
      const response = await POST(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Message not found');
    });
  });

  describe('DELETE /api/messages/[id]/delivery', () => {
    it('should cancel pending delivery retries', async () => {
      (messageDeliveryService.cancelDeliveryRetries as Mock).mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'DELETE'
      });
      const response = await DELETE(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelled).toBe(true);
      expect(messageDeliveryService.cancelDeliveryRetries).toHaveBeenCalledWith('test-message-1');
    });

    it('should handle no pending retries', async () => {
      (messageDeliveryService.cancelDeliveryRetries as Mock).mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'DELETE'
      });
      const response = await DELETE(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelled).toBe(false);
      expect(data.message).toBe('No pending retries found');
    });
  });

  describe('GET /api/delivery/process-pending', () => {
    it('should return pending deliveries status', async () => {
      const mockPendingDeliveries = [
        {
          messageId: 'msg-1',
          attemptCount: 1,
          lastAttempt: new Date(),
          nextRetry: new Date(Date.now() + 5000),
          error: 'Test error'
        },
        {
          messageId: 'msg-2',
          attemptCount: 2,
          lastAttempt: new Date(),
          nextRetry: new Date(Date.now() + 10000)
        }
      ];

      (messageDeliveryService.getPendingDeliveries as Mock).mockReturnValue(mockPendingDeliveries);

      const request = new NextRequest('http://localhost/api/delivery/process-pending');
      const response = await getPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(2);
      expect(data.deliveries).toHaveLength(2);
      expect(data.deliveries[0].messageId).toBe('msg-1');
      expect(data.deliveries[0].error).toBe('Test error');
      expect(data.deliveries[1].messageId).toBe('msg-2');
    });

    it('should handle no pending deliveries', async () => {
      (messageDeliveryService.getPendingDeliveries as Mock).mockReturnValue([]);

      const request = new NextRequest('http://localhost/api/delivery/process-pending');
      const response = await getPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(0);
      expect(data.deliveries).toHaveLength(0);
    });
  });

  describe('POST /api/delivery/process-pending', () => {
    it('should process pending deliveries', async () => {
      const mockPendingBefore = [
        { messageId: 'msg-1', attemptCount: 1, lastAttempt: new Date(), nextRetry: new Date() },
        { messageId: 'msg-2', attemptCount: 1, lastAttempt: new Date(), nextRetry: new Date() }
      ];

      const mockPendingAfter = [
        { messageId: 'msg-2', attemptCount: 2, lastAttempt: new Date(), nextRetry: new Date() }
      ];

      (messageDeliveryService.getPendingDeliveries as Mock)
        .mockReturnValueOnce(mockPendingBefore)
        .mockReturnValueOnce(mockPendingAfter);

      (messageDeliveryService.processPendingDeliveries as Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/delivery/process-pending', {
        method: 'POST'
      });
      const response = await processPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(1); // 2 before - 1 after = 1 processed
      expect(data.stillPending).toBe(1);
      expect(data.pendingDeliveries).toHaveLength(1);
      expect(messageDeliveryService.processPendingDeliveries).toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      (messageDeliveryService.getPendingDeliveries as Mock).mockReturnValue([]);
      (messageDeliveryService.processPendingDeliveries as Mock).mockRejectedValue(
        new Error('Processing failed')
      );

      const request = new NextRequest('http://localhost/api/delivery/process-pending', {
        method: 'POST'
      });
      const response = await processPending(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (dbManager.getDatabase as Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery');
      const response = await GET(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle service errors gracefully', async () => {
      const messageQuery = mockDb.prepare().get;
      messageQuery.mockReturnValue(mockMessage);

      (messageDeliveryService.handleFlightCompletion as Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = new NextRequest('http://localhost/api/messages/test-message-1/delivery', {
        method: 'POST'
      });
      const response = await POST(request, { params: { id: 'test-message-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});