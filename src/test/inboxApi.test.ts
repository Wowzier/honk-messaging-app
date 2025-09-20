import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/messages/[id]/route';
import { GET as getInbox } from '@/app/api/messages/inbox/route';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';

// Mock dependencies
vi.mock('@/lib/database');
vi.mock('@/lib/auth-middleware');

const mockDb = {
  prepare: vi.fn(),
  transaction: vi.fn(),
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
};

const mockAuthResult = {
  success: true,
  user: mockUser,
};

const mockMessageRow = {
  id: 'msg-1',
  sender_id: 'sender-1',
  recipient_id: 'user-123',
  title: 'Test Message',
  content: 'This is a test message',
  sender_location: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194,
    state: 'California',
    country: 'USA',
    is_anonymous: false,
  }),
  recipient_location: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York',
    country: 'USA',
    is_anonymous: false,
  }),
  status: 'delivered',
  created_at: '2024-01-15T10:00:00Z',
  delivered_at: '2024-01-15T12:30:00Z',
  journey_data: JSON.stringify({
    route: [],
    total_distance: 4000,
    estimated_duration: 150,
    weather_events: [],
    current_progress: 100,
    journey_points_earned: 4000,
  }),
  sender_username: 'alice_ca',
  sender_rank: 'Experienced Courier',
};

describe('Inbox API Routes', () => {
  beforeEach(() => {
    vi.mocked(dbManager.getDatabase).mockReturnValue(mockDb as any);
    vi.mocked(authMiddleware).mockResolvedValue(mockAuthResult as any);
    vi.mocked(dbManager.rowToMessage).mockReturnValue({
      id: 'msg-1',
      sender_id: 'sender-1',
      recipient_id: 'user-123',
      title: 'Test Message',
      content: 'This is a test message',
      sender_location: {
        latitude: 37.7749,
        longitude: -122.4194,
        state: 'California',
        country: 'USA',
        is_anonymous: false,
      },
      recipient_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'USA',
        is_anonymous: false,
      },
      status: 'delivered',
      created_at: new Date('2024-01-15T10:00:00Z'),
      delivered_at: new Date('2024-01-15T12:30:00Z'),
      journey_data: {
        route: [],
        total_distance: 4000,
        estimated_duration: 150,
        weather_events: [],
        current_progress: 100,
        journey_points_earned: 4000,
      },
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/messages/inbox', () => {
    it('fetches inbox messages successfully', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue({ total: 2 });
      const mockAll = vi.fn().mockReturnValue([mockMessageRow, mockMessageRow]);
      
      mockPrepare.mockReturnValue({ get: mockGet, all: mockAll });
      mockDb.prepare.mockReturnValue({ get: mockGet, all: mockAll });

      const request = new NextRequest('http://localhost/api/messages/inbox?page=1&limit=20');
      const response = await getInbox(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.page).toBe(1);
    });

    it('handles search parameter correctly', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue({ total: 1 });
      const mockAll = vi.fn().mockReturnValue([mockMessageRow]);
      
      mockPrepare.mockReturnValue({ get: mockGet, all: mockAll });
      mockDb.prepare.mockReturnValue({ get: mockGet, all: mockAll });

      const request = new NextRequest('http://localhost/api/messages/inbox?search=test&page=1');
      const response = await getInbox(request);

      expect(response.status).toBe(200);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('title LIKE ? OR content LIKE ?')
      );
    });

    it('handles status filter correctly', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue({ total: 1 });
      const mockAll = vi.fn().mockReturnValue([mockMessageRow]);
      
      mockPrepare.mockReturnValue({ get: mockGet, all: mockAll });
      mockDb.prepare.mockReturnValue({ get: mockGet, all: mockAll });

      const request = new NextRequest('http://localhost/api/messages/inbox?status=delivered');
      const response = await getInbox(request);

      expect(response.status).toBe(200);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ?')
      );
    });

    it('handles sorting parameters correctly', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue({ total: 1 });
      const mockAll = vi.fn().mockReturnValue([mockMessageRow]);
      
      mockPrepare.mockReturnValue({ get: mockGet, all: mockAll });
      mockDb.prepare.mockReturnValue({ get: mockGet, all: mockAll });

      const request = new NextRequest('http://localhost/api/messages/inbox?sortBy=title&sortOrder=asc');
      const response = await getInbox(request);

      expect(response.status).toBe(200);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY title asc')
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(authMiddleware).mockResolvedValue({ success: false } as any);

      const request = new NextRequest('http://localhost/api/messages/inbox');
      const response = await getInbox(request);

      expect(response.status).toBe(401);
    });

    it('handles database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/messages/inbox');
      const response = await getInbox(request);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/messages/[id]', () => {
    it('fetches message details successfully', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue(mockMessageRow);
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun });
      mockDb.prepare.mockReturnValue({ get: mockGet, run: mockRun });

      const request = new NextRequest('http://localhost/api/messages/msg-1');
      const response = await GET(request, { params: { id: 'msg-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message.id).toBe('msg-1');
      expect(data.message.sender_username).toBe('alice_ca');
    });

    it('returns 404 when message not found', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue(null);
      
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const request = new NextRequest('http://localhost/api/messages/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('returns 401 when user is not authenticated', async () => {
      vi.mocked(authMiddleware).mockResolvedValue({ success: false } as any);

      const request = new NextRequest('http://localhost/api/messages/msg-1');
      const response = await GET(request, { params: { id: 'msg-1' } });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/messages/[id]', () => {
    it('marks message as read successfully', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue({
        ...mockMessageRow,
        recipient_id: 'user-123',
      });
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      
      mockPrepare.mockReturnValue({ get: mockGet, run: mockRun });
      mockDb.prepare.mockReturnValue({ get: mockGet, run: mockRun });

      const request = new NextRequest('http://localhost/api/messages/msg-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mark_read' }),
      });
      
      const response = await PATCH(request, { params: { id: 'msg-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 for invalid action', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue(mockMessageRow);
      
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const request = new NextRequest('http://localhost/api/messages/msg-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid_action' }),
      });
      
      const response = await PATCH(request, { params: { id: 'msg-1' } });

      expect(response.status).toBe(400);
    });

    it('returns 404 when message not found', async () => {
      const mockPrepare = vi.fn();
      const mockGet = vi.fn().mockReturnValue(null);
      
      mockPrepare.mockReturnValue({ get: mockGet });
      mockDb.prepare.mockReturnValue({ get: mockGet });

      const request = new NextRequest('http://localhost/api/messages/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mark_read' }),
      });
      
      const response = await PATCH(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });
  });
});