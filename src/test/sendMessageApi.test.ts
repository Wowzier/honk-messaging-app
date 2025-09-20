import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/send/route';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { geolocationService } from '@/services/geolocation';
import { tailwindAlgorithm } from '@/services/tailwindAlgorithm';
import { flightEngine } from '@/services/flightEngine';

// Mock dependencies
vi.mock('@/lib/database');
vi.mock('@/lib/auth-middleware');
vi.mock('@/lib/migrations', () => ({
  MigrationRunner: vi.fn().mockImplementation(() => ({
    runMigrations: vi.fn().mockResolvedValue(undefined)
  }))
}));
vi.mock('@/services/geolocation', () => ({
  geolocationService: {
    getCurrentLocation: vi.fn(),
    processLocationForSharing: vi.fn(),
  }
}));
vi.mock('@/services/tailwindAlgorithm', () => ({
  tailwindAlgorithm: {
    findEligibleRecipients: vi.fn(),
    selectWeightedRecipient: vi.fn(),
  }
}));
vi.mock('@/services/flightEngine', () => ({
  flightEngine: {
    startFlight: vi.fn(),
  }
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

const mockLocation = {
  latitude: 40.7128,
  longitude: -74.0060,
  state: 'New York',
  country: 'USA',
  is_anonymous: false,
};

const mockRecipient = {
  id: 'recipient-456',
  current_location: mockLocation,
};

describe('POST /api/messages/send', () => {
  beforeEach(() => {
    vi.mocked(dbManager.getDatabase).mockReturnValue(mockDb as any);
    vi.mocked(authMiddleware).mockResolvedValue(mockAuthResult as any);
    vi.mocked(geolocationService.getCurrentLocation).mockResolvedValue(mockLocation);
    vi.mocked(geolocationService.processLocationForSharing).mockReturnValue(mockLocation);
    vi.mocked(tailwindAlgorithm.findEligibleRecipients).mockResolvedValue([mockRecipient]);
    vi.mocked(tailwindAlgorithm.selectWeightedRecipient).mockReturnValue(mockRecipient);
    vi.mocked(flightEngine.startFlight).mockResolvedValue(undefined);
    vi.mocked(dbManager.messageToRow).mockReturnValue({
      id: 'msg-123',
      sender_id: 'user-123',
      recipient_id: 'recipient-456',
      title: 'Test Message',
      content: 'Test content',
      sender_location: JSON.stringify(mockLocation),
      recipient_location: JSON.stringify(mockLocation),
      status: 'flying',
      created_at: new Date().toISOString(),
    } as any);

    const mockRun = vi.fn().mockReturnValue({ changes: 1 });
    const mockGet = vi.fn().mockReturnValue({ current_location: JSON.stringify(mockLocation) });
    mockDb.prepare.mockReturnValue({ run: mockRun, get: mockGet });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends a new message successfully', async () => {
    const requestBody = {
      title: 'Test Message',
      content: 'This is a test message',
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message.status).toBe('flying');
    expect(flightEngine.startFlight).toHaveBeenCalled();
  });

  it('sends a reply message successfully', async () => {
    const requestBody = {
      title: 'Re: Test Message',
      content: 'This is a reply',
      locationSharing: 'state' as const,
      recipient_id: 'recipient-456',
      reply_to_message_id: 'original-msg-123',
    };

    // Mock conversation handling
    const mockConversationGet = vi.fn().mockReturnValue(null); // No existing conversation
    const mockConversationRun = vi.fn().mockReturnValue({ changes: 1 });
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM conversations')) {
        return { get: mockConversationGet };
      }
      if (query.includes('INSERT INTO conversations')) {
        return { run: mockConversationRun };
      }
      return { run: vi.fn(), get: vi.fn().mockReturnValue({ current_location: JSON.stringify(mockLocation) }) };
    });

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockConversationRun).toHaveBeenCalled(); // New conversation created
  });

  it('updates existing conversation when replying', async () => {
    const requestBody = {
      title: 'Re: Test Message',
      content: 'This is a reply',
      locationSharing: 'state' as const,
      recipient_id: 'recipient-456',
      reply_to_message_id: 'original-msg-123',
    };

    // Mock existing conversation
    const existingConversation = {
      id: 'conv-123',
      message_ids: JSON.stringify(['original-msg-123']),
    };
    
    const mockConversationGet = vi.fn().mockReturnValue(existingConversation);
    const mockConversationUpdate = vi.fn().mockReturnValue({ changes: 1 });
    mockDb.prepare.mockImplementation((query: string) => {
      if (query.includes('SELECT * FROM conversations')) {
        return { get: mockConversationGet };
      }
      if (query.includes('UPDATE conversations')) {
        return { run: mockConversationUpdate };
      }
      return { run: vi.fn(), get: vi.fn().mockReturnValue({ current_location: JSON.stringify(mockLocation) }) };
    });

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockConversationUpdate).toHaveBeenCalled(); // Existing conversation updated
  });

  it('validates required fields', async () => {
    const requestBody = {
      title: '',
      content: '',
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title and content are required');
  });

  it('validates character limits', async () => {
    const requestBody = {
      title: 'a'.repeat(101),
      content: 'a'.repeat(281),
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title must be 100 characters or less');
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(authMiddleware).mockResolvedValue({ success: false } as any);

    const requestBody = {
      title: 'Test Message',
      content: 'Test content',
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('handles location service failure', async () => {
    vi.mocked(geolocationService.getCurrentLocation).mockResolvedValue(null);

    const requestBody = {
      title: 'Test Message',
      content: 'Test content',
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Unable to determine your location');
  });

  it('handles no eligible recipients', async () => {
    vi.mocked(tailwindAlgorithm.findEligibleRecipients).mockResolvedValue([]);

    const requestBody = {
      title: 'Test Message',
      content: 'Test content',
      locationSharing: 'state' as const,
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No eligible recipients found. Try again later.');
  });

  it('handles recipient not found for direct messages', async () => {
    const mockGet = vi.fn().mockReturnValue(null); // Recipient not found
    mockDb.prepare.mockReturnValue({ get: mockGet });

    const requestBody = {
      title: 'Test Message',
      content: 'Test content',
      locationSharing: 'state' as const,
      recipient_id: 'nonexistent-user',
    };

    const request = new NextRequest('http://localhost/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Recipient not found');
  });
});