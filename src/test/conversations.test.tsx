import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ConversationDetailView } from '@/components/messaging/ConversationDetailView';
import { useAuth } from '@/hooks/useAuth';
import { HonkMessage, Conversation } from '@/types';

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

const mockConversations = [
  {
    id: 'conv-1',
    user1_id: 'user-123',
    user2_id: 'user-456',
    message_ids: ['msg-1', 'msg-2'],
    created_at: new Date('2024-01-15T10:00:00Z'),
    last_message_at: new Date('2024-01-16T08:00:00Z'),
    other_participant_id: 'user-456',
    other_participant_username: 'alice_ca',
    message_count: 2,
    latest_message: {
      id: 'msg-2',
      sender_id: 'user-456',
      recipient_id: 'user-123',
      title: 'Re: Hello!',
      content: 'Thanks for your message!',
      sender_location: {
        latitude: 37.7749,
        longitude: -122.4194,
        state: 'California',
        country: 'USA',
        is_anonymous: false,
      },
      status: 'delivered' as const,
      created_at: new Date('2024-01-16T08:00:00Z'),
      delivered_at: new Date('2024-01-16T10:00:00Z'),
      sender_username: 'alice_ca',
    },
  },
];

const mockConversationsResponse = {
  conversations: mockConversations,
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

const mockMessages = [
  {
    id: 'msg-1',
    sender_id: 'user-123',
    recipient_id: 'user-456',
    title: 'Hello!',
    content: 'This is the first message.',
    sender_location: {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'USA',
      is_anonymous: false,
    },
    status: 'delivered' as const,
    created_at: new Date('2024-01-15T10:00:00Z'),
    delivered_at: new Date('2024-01-15T12:00:00Z'),
    sender_username: 'testuser',
    sender_rank: 'Novice Courier',
  },
  {
    id: 'msg-2',
    sender_id: 'user-456',
    recipient_id: 'user-123',
    title: 'Re: Hello!',
    content: 'Thanks for your message!',
    sender_location: {
      latitude: 37.7749,
      longitude: -122.4194,
      state: 'California',
      country: 'USA',
      is_anonymous: false,
    },
    status: 'delivered' as const,
    created_at: new Date('2024-01-16T08:00:00Z'),
    delivered_at: new Date('2024-01-16T10:00:00Z'),
    sender_username: 'alice_ca',
    sender_rank: 'Experienced Courier',
  },
];

const mockConversationDetailResponse = {
  conversation: {
    ...mockConversations[0],
    other_participant_username: 'alice_ca',
    other_participant_rank: 'Experienced Courier',
  },
  messages: mockMessages,
  pagination: {
    page: 1,
    limit: 50,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('ConversationsList Component', () => {
  const mockOnConversationSelect = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
      loading: false,
    });

    mockFetch.mockClear();
    mockOnConversationSelect.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversations list correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationsResponse,
    });

    render(<ConversationsList onConversationSelect={mockOnConversationSelect} />);

    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Your message threads')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('alice_ca')).toBeInTheDocument();
      expect(screen.getByText('Re: Hello!')).toBeInTheDocument();
      expect(screen.getByText('Thanks for your message!')).toBeInTheDocument();
    });
  });

  it('handles conversation selection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationsResponse,
    });

    render(<ConversationsList onConversationSelect={mockOnConversationSelect} />);

    await waitFor(() => {
      expect(screen.getByText('alice_ca')).toBeInTheDocument();
    });

    const conversationCard = screen.getByText('alice_ca').closest('.cursor-pointer');
    fireEvent.click(conversationCard!);

    expect(mockOnConversationSelect).toHaveBeenCalledWith(mockConversations[0]);
  });

  it('displays empty state when no conversations', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        conversations: [],
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

    render(<ConversationsList onConversationSelect={mockOnConversationSelect} />);

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start a conversation by replying to a message in your inbox.')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversationsResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversationsResponse,
      });

    render(<ConversationsList onConversationSelect={mockOnConversationSelect} />);

    await waitFor(() => {
      expect(screen.getByText('alice_ca')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ConversationDetailView Component', () => {
  const mockOnBack = vi.fn();
  const mockOnReply = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
      loading: false,
    });

    mockFetch.mockClear();
    mockOnBack.mockClear();
    mockOnReply.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversation detail view correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationDetailResponse,
    });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    expect(screen.getByText('Conversation with alice_ca')).toBeInTheDocument();
    expect(screen.getByText('Back to Conversations')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Re: Hello!')).toBeInTheDocument();
    });
  });

  it('displays messages correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationDetailResponse,
    });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('This is the first message.')).toBeInTheDocument();
      expect(screen.getByText('Thanks for your message!')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument(); // Current user's message
      expect(screen.getByText('alice_ca')).toBeInTheDocument(); // Other user's message
    });
  });

  it('handles back navigation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationDetailResponse,
    });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    const backButton = screen.getByRole('button', { name: /back to conversations/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('handles reply functionality', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationDetailResponse,
    });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('alice_ca')).toBeInTheDocument();
    });

    // Find reply button for the other user's message
    const replyButtons = screen.getAllByRole('button', { name: /reply/i });
    const messageReplyButton = replyButtons.find(button => 
      button.closest('.mr-8') // Other user's message has mr-8 class
    );
    
    if (messageReplyButton) {
      fireEvent.click(messageReplyButton);
      expect(mockOnReply).toHaveBeenCalledWith(mockMessages[1]);
    }
  });

  it('shows correct message styling for current user vs other user', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConversationDetailResponse,
    });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    await waitFor(() => {
      const messages = screen.getAllByText(/Hello!|Re: Hello!/);
      expect(messages).toHaveLength(2);
    });

    // Current user's message should have ml-8 class (right-aligned)
    const currentUserMessage = screen.getByText('This is the first message.').closest('.ml-8');
    expect(currentUserMessage).toBeInTheDocument();

    // Other user's message should have mr-8 class (left-aligned)
    const otherUserMessage = screen.getByText('Thanks for your message!').closest('.mr-8');
    expect(otherUserMessage).toBeInTheDocument();
  });

  it('handles load more messages', async () => {
    const responseWithMore = {
      ...mockConversationDetailResponse,
      pagination: {
        ...mockConversationDetailResponse.pagination,
        hasNext: true,
        totalPages: 2,
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMore,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversationDetailResponse,
      });

    render(
      <ConversationDetailView
        conversation={mockConversations[0]}
        onBack={mockOnBack}
        onReply={mockOnReply}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Load Older Messages/)).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole('button', { name: /load older messages/i });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});