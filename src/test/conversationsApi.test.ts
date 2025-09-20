import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConversations } from '@/app/api/conversations/route';
import { GET as getConversationMessages } from '@/app/api/conversations/[id]/route';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';

// Mock dependencies
vi.mock('@/lib/database');
vi.mock('@/lib/auth-middleware');
vi.mock('@/lib/migrations', () => ({
  MigrationRunner: vi.fn().mockImplementation(() => ({
    runMigrations: vi.fn().mockResolvedValue(undefined)
  }))
}));

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

const mockConversationRow = {
  id: 'conv-1',
  user1_id: 'user-123',
  user2_id: 'user-456',
  message_ids: JSON.stringify(['msg-1', 'msg-2']),
  created_at: '2024-01-15T10:00:00Z',
  last_message_at: '2024-01-16T08:00:00Z',
  user1_username: 'testuser',
  user2_username: 'alice_ca',
  total: 1,
};

const mockMessageRow = {
  id: 'msg-1',
  sender_id: 'user-123',
  recipient_id: 'user-456',
  title: 'Test Message',
  content: 'This is a test message',
  sender_location: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    state: 'New York',
    country: 'USA',
    is_anonymous: false,
  }),
  recipient_location: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194,
    state: 'California',
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
  sender_username: 'testuser',
  sender_rank: 'Novice Courier',
};

describe('GET /api/conversations', () => {
  beforeEach(() => {
    vi.mocked(dbManager.getDatabase).mockReturnValue(mockDb as any);
    vi.mocked(authMiddleware).mockResolvedValue(mockAuthResult as any);
    vi.mocked(dbManager.rowToConversation).mockReturnValue({
      id: 'conv-1',
      user1_id: 'user-123',
      user2_id: 'user-456',
      message_ids: ['msg-1', 'msg-2'],
      created_at: new Date('2024-01-15T10:00:00Z'),
      last_message_at: new Date('2024-01-16T08:00:00Z'),
    });
    vi.mocked(dbManager.rowToMessage).mockReturnValue({
      id: 'msg-2',
      sender_id: 'user-456',
      recipient_id: 'user-123',
      title: 'Re: Test Message',
      content: 'Thanks for your message!',
      sender_location: {
        latitude: 37.7749,
        longitude: -122.4194,
        state: 'California',
        country: 'USA',
        is_anonymous: false,
      },
      status: 'delivered',
      created_at: new Date('2024-01-16T08:00:00Z'),
      delivered_at: new Date('2024-01-16T10:00:00Z'),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversations successfully', async () => {
    const mockAll = vi.fn().mockReturnValue([mockConversationRow]);
    const mockGet = vi.fn().mockReturnValue({
      ...mockMessageRow,
      id: 'msg-2',
      sender_id: 'user-456',
      title: 'Re: Test Message',
      content: 'Thanks for your message!',
      sender_username: 'alice_ca',
    });
    
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT m.*, u.username')) {
        return { get: mockGet };
      }
      return { all: mockAll };
    });

    const request = new NextRequest('http://localhost/api/conversations?page=1&limit=20');
    const response = await getConversations(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.conversations).toHaveLength(1);
    expect(data.conversations[0].other_participant_username).toBe('alice_ca');
    expect(data.conversations[0].latest_message).toBeDefined();
    expect(data.pagination.total).toBe(1);
  });

  it('handles pagination correctly', async () => {
    const mockAll = vi.fn().mockReturnValue([mockConversationRow]);
    mockDb.prepare.mockReturnValue({ all: mockAll, get: vi.fn() });

    const request = new NextRequest('http://localhost/api/conversations?page=2&limit=10');
    const response = await getConversations(request);

    expect(response.status).toBe(200);
    expect(mockAll).toHaveBeenCalledWith('user-123', 'user-123', 'user-123', 'user-123', 10, 10);
  });

  it('returns empty result when no conversations', async () => {
    const mockAll = vi.fn().mockReturnValue([]);
    mockDb.prepare.mockReturnValue({ all: mockAll });

    const request = new NextRequest('http://localhost/api/conversations');
    const response = await getConversations(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.conversations).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({ success: false } as any);

    const request = new NextRequest('http://localhost/api/conversations');
    const response = await getConversations(request);

    expect(response.status).toBe(401);
  });
});

describe('GET /api/conversations/[id]', () => {
  beforeEach(() => {
    vi.mocked(dbManager.getDatabase).mockReturnValue(mockDb as any);
    vi.mocked(authMiddleware).mockResolvedValue(mockAuthResult as any);
    vi.mocked(dbManager.rowToConversation).mockReturnValue({
      id: 'conv-1',
      user1_id: 'user-123',
      user2_id: 'user-456',
      message_ids: ['msg-1', 'msg-2'],
      created_at: new Date('2024-01-15T10:00:00Z'),
      last_message_at: new Date('2024-01-16T08:00:00Z'),
    });
    vi.mocked(dbManager.rowToMessage).mockReturnValue({
      id: 'msg-1',
      sender_id: 'user-123',
      recipient_id: 'user-456',
      title: 'Test Message',
      content: 'This is a test message',
      sender_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'USA',
        is_anonymous: false,
      },
      status: 'delivered',
      created_at: new Date('2024-01-15T10:00:00Z'),
      delivered_at: new Date('2024-01-15T12:30:00Z'),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversation messages successfully', async () => {
    const mockGet = vi.fn().mockReturnValue(mockConversationRow);
    const mockAll = vi.fn().mockReturnValue([mockMessageRow]);
    const mockGetUser = vi.fn().mockReturnValue({ username: 'alice_ca', current_rank: 'Experienced Courier' });
    
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM conversations')) {
        return { get: mockGet };
      }
      if (query.includes('SELECT m.*, u.username')) {
        return { all: mockAll };
      }
      if (query.includes('SELECT username, current_rank')) {
        return { get: mockGetUser };
      }
      return { get: vi.fn(), all: vi.fn() };
    });

    const request = new NextRequest('http://localhost/api/conversations/conv-1');
    const response = await getConversationMessages(request, { params: { id: 'conv-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.conversation.other_participant_username).toBe('alice_ca');
    expect(data.messages).toHaveLength(1);
    expect(data.pagination.total).toBe(2); // Total message IDs in conversation
  });

  it('handles pagination for messages', async () => {
    const mockGet = vi.fn().mockReturnValue(mockConversationRow);
    const mockAll = vi.fn().mockReturnValue([mockMessageRow]);
    const mockGetUser = vi.fn().mockReturnValue({ username: 'alice_ca' });
    
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM conversations')) {
        return { get: mockGet };
      }
      if (query.includes('SELECT m.*, u.username')) {
        return { all: mockAll };
      }
      if (query.includes('SELECT username, current_rank')) {
        return { get: mockGetUser };
      }
      return { get: vi.fn(), all: vi.fn() };
    });

    const request = new NextRequest('http://localhost/api/conversations/conv-1?page=1&limit=1');
    const response = await getConversationMessages(request, { params: { id: 'conv-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.limit).toBe(1);
    expect(data.pagination.page).toBe(1);
  });

  it('returns 404 when conversation not found', async () => {
    const mockGet = vi.fn().mockReturnValue(null);
    mockDb.prepare.mockReturnValue({ get: mockGet });

    const request = new NextRequest('http://localhost/api/conversations/nonexistent');
    const response = await getConversationMessages(request, { params: { id: 'nonexistent' } });

    expect(response.status).toBe(404);
  });

  it('returns 404 when user does not have access to conversation', async () => {
    // Return null because the SQL query filters by user access
    const mockGet = vi.fn().mockReturnValue(null);
    mockDb.prepare.mockReturnValue({ get: mockGet, all: vi.fn() });

    const request = new NextRequest('http://localhost/api/conversations/conv-1');
    const response = await getConversationMessages(request, { params: { id: 'conv-1' } });

    expect(response.status).toBe(404);
  });

  it('handles empty conversation', async () => {
    const emptyConversation = {
      ...mockConversationRow,
      message_ids: JSON.stringify([]),
    };
    
    const mockGet = vi.fn().mockReturnValue(emptyConversation);
    const mockGetUser = vi.fn().mockReturnValue({ username: 'alice_ca' });
    
    vi.mocked(dbManager.rowToConversation).mockReturnValue({
      id: 'conv-1',
      user1_id: 'user-123',
      user2_id: 'user-456',
      message_ids: [],
      created_at: new Date('2024-01-15T10:00:00Z'),
      last_message_at: new Date('2024-01-16T08:00:00Z'),
    });
    
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM conversations')) {
        return { get: mockGet };
      }
      if (query.includes('SELECT username, current_rank')) {
        return { get: mockGetUser };
      }
      return { get: vi.fn(), all: vi.fn() };
    });

    const request = new NextRequest('http://localhost/api/conversations/conv-1');
    const response = await getConversationMessages(request, { params: { id: 'conv-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.messages).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({ success: false } as any);

    const request = new NextRequest('http://localhost/api/conversations/conv-1');
    const response = await getConversationMessages(request, { params: { id: 'conv-1' } });

    expect(response.status).toBe(401);
  });
});