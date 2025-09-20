import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InboxMessage } from '@/components/messaging/InboxMessage';
import { MessageDetailView } from '@/components/messaging/MessageDetailView';
import { InboxFiltersComponent } from '@/components/messaging/InboxFilters';
import { HonkMessage } from '@/types';

const mockMessage: HonkMessage & { sender_username?: string } = {
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
    weather_events: [],
    current_progress: 100,
    journey_points_earned: 4000,
  },
  sender_username: 'alice_ca',
};

describe('Inbox Components', () => {
  describe('InboxMessage', () => {
    it('renders message correctly', () => {
      const mockOnClick = vi.fn();
      
      render(<InboxMessage message={mockMessage} onClick={mockOnClick} />);

      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
      expect(screen.getByText(/From:/)).toBeInTheDocument();
      expect(screen.getByText(/alice_ca/)).toBeInTheDocument();
      expect(screen.getByText('✅ Delivered')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const mockOnClick = vi.fn();
      
      render(<InboxMessage message={mockMessage} onClick={mockOnClick} />);

      const messageCard = screen.getByText('Hello from California!').closest('.cursor-pointer');
      fireEvent.click(messageCard!);

      expect(mockOnClick).toHaveBeenCalledWith(mockMessage);
    });

    it('shows flying status correctly', () => {
      const flyingMessage = {
        ...mockMessage,
        status: 'flying' as const,
        delivered_at: undefined,
        journey_data: {
          ...mockMessage.journey_data!,
          current_progress: 65,
        },
      };

      const mockOnClick = vi.fn();
      render(<InboxMessage message={flyingMessage} onClick={mockOnClick} />);

      expect(screen.getByText('🦆 Flying')).toBeInTheDocument();
      expect(screen.getByText('65% complete')).toBeInTheDocument();
    });
  });

  describe('MessageDetailView', () => {
    it('renders message details correctly', () => {
      const mockOnBack = vi.fn();
      const mockOnReply = vi.fn();

      render(
        <MessageDetailView
          message={mockMessage}
          onBack={mockOnBack}
          onReply={mockOnReply}
          currentUserId="user-123"
        />
      );

      expect(screen.getByText('Hello from California!')).toBeInTheDocument();
      expect(screen.getByText('alice_ca')).toBeInTheDocument();
      expect(screen.getByText('California, USA')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to inbox/i })).toBeInTheDocument();
    });

    it('shows reply button for delivered messages to current user', () => {
      const mockOnBack = vi.fn();
      const mockOnReply = vi.fn();

      render(
        <MessageDetailView
          message={mockMessage}
          onBack={mockOnBack}
          onReply={mockOnReply}
          currentUserId="user-123"
        />
      );

      expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
      const mockOnBack = vi.fn();
      const mockOnReply = vi.fn();

      render(
        <MessageDetailView
          message={mockMessage}
          onBack={mockOnBack}
          onReply={mockOnReply}
          currentUserId="user-123"
        />
      );

      const backButton = screen.getByRole('button', { name: /back to inbox/i });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('InboxFilters', () => {
    it('renders filter controls correctly', () => {
      const mockFilters = {
        search: '',
        status: 'all' as const,
        sortBy: 'created_at' as const,
        sortOrder: 'desc' as const,
      };
      const mockOnFiltersChange = vi.fn();

      render(
        <InboxFiltersComponent
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          messageCount={5}
        />
      );

      expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
      expect(screen.getByText('All Messages')).toBeInTheDocument();
      expect(screen.getByText('5 messages')).toBeInTheDocument();
    });

    it('calls onFiltersChange when search input changes', () => {
      const mockFilters = {
        search: '',
        status: 'all' as const,
        sortBy: 'created_at' as const,
        sortOrder: 'desc' as const,
      };
      const mockOnFiltersChange = vi.fn();

      render(
        <InboxFiltersComponent
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          messageCount={5}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search messages...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        search: 'test',
      });
    });
  });
});