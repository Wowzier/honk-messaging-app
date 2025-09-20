import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageDetailView } from '@/components/messaging/MessageDetailView';
import { HonkMessage } from '@/types';

const mockMessage: HonkMessage & { sender_username?: string; sender_rank?: string } = {
  id: 'msg-1',
  sender_id: 'sender-1',
  recipient_id: 'user-123',
  title: 'Hello from California!',
  content: 'This is a detailed test message from the west coast.\n\nIt has multiple paragraphs to test the display.',
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
    route: [
      {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 1000,
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },
      {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: 1000,
        timestamp: new Date('2024-01-15T12:30:00Z'),
      },
    ],
    total_distance: 4000,
    estimated_duration: 150,
    weather_events: [
      {
        type: 'clear',
        intensity: 1,
        speed_modifier: 1,
        location: { latitude: 39, longitude: -100, is_anonymous: false },
        timestamp: new Date('2024-01-15T11:00:00Z'),
      },
      {
        type: 'rain',
        intensity: 0.7,
        speed_modifier: 0.75,
        location: { latitude: 41, longitude: -80, is_anonymous: false },
        timestamp: new Date('2024-01-15T11:30:00Z'),
      },
    ],
    current_progress: 100,
    journey_points_earned: 4000,
  },
  sender_username: 'alice_ca',
  sender_rank: 'Experienced Courier',
};

const mockFlyingMessage: HonkMessage & { sender_username?: string } = {
  ...mockMessage,
  id: 'msg-2',
  status: 'flying',
  delivered_at: undefined,
  journey_data: {
    ...mockMessage.journey_data!,
    current_progress: 65,
    journey_points_earned: 0,
  },
};

const mockAnonymousMessage: HonkMessage & { sender_username?: string } = {
  ...mockMessage,
  id: 'msg-3',
  sender_location: {
    latitude: 37.7749,
    longitude: -122.4194,
    is_anonymous: true,
  },
  sender_username: undefined,
};

describe('MessageDetailView Component', () => {
  const mockOnBack = vi.fn();
  const mockOnReply = vi.fn();
  const currentUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders message details correctly', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    expect(screen.getByText('From: alice_ca')).toBeInTheDocument();
    expect(screen.getByText('Experienced Courier')).toBeInTheDocument();
    expect(screen.getByText('California, USA')).toBeInTheDocument();
    expect(screen.getByText('✅ Delivered')).toBeInTheDocument();
  });

  it('displays message content with proper formatting', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    const content = screen.getByText(/This is a detailed test message/);
    expect(content).toBeInTheDocument();
    expect(content.className).toContain('whitespace-pre-wrap');
  });

  it('shows journey information correctly', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Journey Information')).toBeInTheDocument();
    expect(screen.getByText('4000')).toBeInTheDocument(); // Distance
    expect(screen.getByText('4000')).toBeInTheDocument(); // Points
    expect(screen.getByText('100%')).toBeInTheDocument(); // Progress
    expect(screen.getByText('3')).toBeInTheDocument(); // Duration in minutes (150/60 = 2.5, rounded to 3)
  });

  it('displays weather events correctly', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Weather Encountered')).toBeInTheDocument();
    expect(screen.getByText('clear')).toBeInTheDocument();
    expect(screen.getByText('rain')).toBeInTheDocument();
  });

  it('shows flight route information', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Flight Route')).toBeInTheDocument();
    expect(screen.getByText(/2 waypoints/)).toBeInTheDocument();
    expect(screen.getByText(/From California to Your location/)).toBeInTheDocument();
  });

  it('displays delivery confirmation for delivered messages', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Message Delivered!')).toBeInTheDocument();
    expect(screen.getByText(/Your duck successfully delivered this message/)).toBeInTheDocument();
  });

  it('shows timeline with correct timestamps', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Message Sent')).toBeInTheDocument();
    expect(screen.getByText('Message Delivered')).toBeInTheDocument();
  });

  it('handles flying message status correctly', () => {
    render(
      <MessageDetailView
        message={mockFlyingMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('🦆 Flying')).toBeInTheDocument();
    expect(screen.queryByText('Message Delivered!')).not.toBeInTheDocument();
    expect(screen.queryByText('Message Delivered')).not.toBeInTheDocument(); // In timeline
  });

  it('handles anonymous sender correctly', () => {
    render(
      <MessageDetailView
        message={mockAnonymousMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText('From: Anonymous')).toBeInTheDocument();
    expect(screen.getByText('Anonymous location')).toBeInTheDocument();
  });

  it('shows reply button for delivered messages to current user', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    const replyButton = screen.getByRole('button', { name: /reply/i });
    expect(replyButton).toBeInTheDocument();
    expect(replyButton).not.toBeDisabled();
  });

  it('does not show reply button for flying messages', () => {
    render(
      <MessageDetailView
        message={mockFlyingMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
  });

  it('does not show reply button for messages not sent to current user', () => {
    render(
      <MessageDetailView
        message={{ ...mockMessage, recipient_id: 'other-user' }}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    const backButton = screen.getByRole('button', { name: /back to inbox/i });
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('calls onReply when reply button is clicked', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    const replyButton = screen.getByRole('button', { name: /reply/i });
    fireEvent.click(replyButton);

    expect(mockOnReply).toHaveBeenCalledTimes(1);
    expect(mockOnReply).toHaveBeenCalledWith(mockMessage);
  });

  it('disables reply button after clicking', () => {
    render(
      <MessageDetailView
        message={mockMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    const replyButton = screen.getByRole('button', { name: /reply/i });
    fireEvent.click(replyButton);

    expect(replyButton).toBeDisabled();
  });

  it('handles message without journey data', () => {
    const messageWithoutJourney = {
      ...mockMessage,
      journey_data: undefined,
    };

    render(
      <MessageDetailView
        message={messageWithoutJourney}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByText('Journey Information')).not.toBeInTheDocument();
  });

  it('handles message without sender rank', () => {
    const messageWithoutRank = {
      ...mockMessage,
      sender_rank: undefined,
    };

    render(
      <MessageDetailView
        message={messageWithoutRank}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.queryByText('Experienced Courier')).not.toBeInTheDocument();
  });

  it('formats relative time correctly', () => {
    const recentMessage = {
      ...mockMessage,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      delivered_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    };

    render(
      <MessageDetailView
        message={recentMessage}
        onBack={mockOnBack}
        onReply={mockOnReply}
        currentUserId={currentUserId}
      />
    );

    expect(screen.getByText(/Sent .* ago/)).toBeInTheDocument();
    expect(screen.getByText(/Delivered .* ago/)).toBeInTheDocument();
  });
});