import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Inbox } from '@/components/messaging/Inbox';
import { useAuth } from '@/hooks/useAuth';
import { HonkMessage } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useAuth');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  created_at: new Date(),
  last_active: new Date(),
  total_journey_points: 1000,
  current_rank: 'Novice Courier',
  location_sharing_preference: 'state' as const,
  opt_out_random: false,
  total_flights_sent: 5,
  total_flights_received: 3,
  total_distance_traveled: 15000,
  countries_visited: ['USA', 'Canada'],
  states_visited: ['CA', 'NY'],
  achievements: ['first_flight'],
};

const mockMessages: (HonkMessage & { sender_username?: string })[] = [
  {
    id: 'msg-1',
    sender_id: 'sender-1',
    recipient_id: 'user-123',
    title: 'Hello from California!',
    content: 'This is a test message from the west coast.',
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
      weather_events: [
        {
          type: 'clear',
          intensity: 1,
          speed_modifier: 1,
          location: { latitude: 39, longitude: -100, is_anonymous: false },
          timestamp: new Date(),
        },
      ],
      current_progress: 100,
      journey_points_earned: 4000,
    },
    sender_username: 'alice_ca',
  },
  {
    id: 'msg-2',
    sender_id: 'sender-2',
    recipient_id: 'user-123',
    title: 'Flying Duck Update',
    content: 'Your duck is still flying through stormy weather!',
    sender_location: {
      latitude: 51.5074,
      longitude: -0.1278,
      country: 'UK',
      is_anonymous: false,
    },
    status: 'flying',
    created_at: new Date('2024-01-16T08:00:00Z'),
    journey_data: {
      route: [],
      total_distance: 8000,
      estimated_duration: 300,
      weather_events: [
        {
          type: 'storm',
          intensity: 0.5,
          speed_modifier: 0.5,
          location: { latitude: 45, longitude: -50, is_anonymous: false },
          timestamp: new Date(),
        },
      ],
      current_progress: 65,
      journey_points_earned: 0,
    },
    sender_username: 'bob_uk',
  },
];

const mockInboxResponse = {
  messages: mockMessages,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('Inbox Component', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loading: false,
    });

    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockInboxResponse,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders inbox header correctly', async () => {
    render(<Inbox />);

    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Messages delivered by duck courier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('fetches and displays messages correctly', async () => {
    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    expect(screen.getByText('From: alice_ca')).toBeInTheDocument();
    expect(screen.getByText('✅ Delivered')).toBeInTheDocument();
  });

  it('displays journey information correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockInboxResponse,
    });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('4000km • 4000 points')).toBeInTheDocument();
      expect(screen.getByText('65% complete')).toBeInTheDocument();
    });
  });

  it('handles search filtering', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [mockMessages[0]],
          pagination: { ...mockInboxResponse.pagination, total: 1 },
        }),
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'California' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=California'),
        expect.any(Object)
      );
    });
  });

  it('handles status filtering', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [mockMessages[1]],
          pagination: { ...mockInboxResponse.pagination, total: 1 },
        }),
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('All Messages')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('All Messages');
    fireEvent.click(statusSelect);
    
    const flyingOption = screen.getByText('🦆 Flying');
    fireEvent.click(flyingOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=flying'),
        expect.any(Object)
      );
    });
  });

  it('handles sorting options', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    // Change sort order
    const sortOrderSelect = screen.getByDisplayValue('Newest First');
    fireEvent.click(sortOrderSelect);
    
    const oldestFirstOption = screen.getByText('Oldest First');
    fireEvent.click(oldestFirstOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortOrder=asc'),
        expect.any(Object)
      );
    });
  });

  it('opens message detail view when message is clicked', async () => {
    const mockMessageDetail = {
      message: {
        ...mockMessages[0],
        sender_rank: 'Experienced Courier',
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessageDetail,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    const messageCard = screen.getByText('Hello from California!').closest('.cursor-pointer');
    fireEvent.click(messageCard!);

    await waitFor(() => {
      expect(screen.getByText('Back to Inbox')).toBeInTheDocument();
      expect(screen.getByText('Journey Information')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }),
    });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Your inbox is empty. Messages from other users will appear here when delivered.')).toBeInTheDocument();
    });
  });

  it('displays error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('handles load more functionality', async () => {
    const firstPageResponse = {
      messages: [mockMessages[0]],
      pagination: {
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      },
    };

    const secondPageResponse = {
      messages: [mockMessages[1]],
      pagination: {
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstPageResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondPageResponse,
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Flying Duck Update')).toBeInTheDocument();
    });
  });

  it('auto-refreshes flying messages', async () => {
    vi.useFakeTimers();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Flying Duck Update')).toBeInTheDocument();
    });

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('clears filters correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInboxResponse,
      });

    render(<Inbox />);

    await waitFor(() => {
      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    });

    // Add a search filter
    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });

    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });
});