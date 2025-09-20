import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplyCompose } from '@/components/messaging/ReplyCompose';
import { HonkMessage } from '@/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockOriginalMessage: HonkMessage & { sender_username?: string; sender_rank?: string } = {
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
  sender_rank: 'Experienced Courier',
};

describe('ReplyCompose Component', () => {
  const mockOnSend = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnCancel.mockClear();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders reply compose interface correctly', () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Reply to Honk')).toBeInTheDocument();
    expect(screen.getByText('Original Message')).toBeInTheDocument();
    expect(screen.getByText('Hello from California!')).toBeInTheDocument();
    expect(screen.getByText('alice_ca')).toBeInTheDocument();
    expect(screen.getByText('Your Reply')).toBeInTheDocument();
  });

  it('displays original message information correctly', () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('alice_ca')).toBeInTheDocument();
    expect(screen.getByText('Experienced Courier')).toBeInTheDocument();
    expect(screen.getByText('California, USA')).toBeInTheDocument();
    expect(screen.getByText('This is a test message from the west coast.')).toBeInTheDocument();
  });

  it('handles anonymous sender location correctly', () => {
    const anonymousMessage = {
      ...mockOriginalMessage,
      sender_location: {
        ...mockOriginalMessage.sender_location,
        is_anonymous: true,
      },
    };

    render(
      <ReplyCompose
        originalMessage={anonymousMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Anonymous location')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('submits reply with correct data', async () => {
    mockOnSend.mockResolvedValue(undefined);

    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    // Fill in the reply form
    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Message');
    
    fireEvent.change(titleInput, { target: { value: 'Re: Hello from California!' } });
    fireEvent.change(contentTextarea, { target: { value: 'Thanks for your message!' } });

    // Submit the form
    const sendButton = screen.getByRole('button', { name: /send honk/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith({
        title: 'Re: Hello from California!',
        content: 'Thanks for your message!',
        locationSharing: 'state',
        recipient_id: 'sender-1',
        reply_to_message_id: 'msg-1',
      });
    });
  });

  it('shows loading state during submission', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnSend.mockReturnValue(promise);

    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    // Fill in the form
    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Message');
    
    fireEvent.change(titleInput, { target: { value: 'Test Reply' } });
    fireEvent.change(contentTextarea, { target: { value: 'Test content' } });

    // Submit the form
    const sendButton = screen.getByRole('button', { name: /send honk/i });
    fireEvent.click(sendButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Sending Honk...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!();
    
    await waitFor(() => {
      expect(screen.queryByText('Sending Honk...')).not.toBeInTheDocument();
    });
  });

  it('validates reply form correctly', async () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without filling required fields
    const sendButton = screen.getByRole('button', { name: /send honk/i });
    fireEvent.click(sendButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Message content is required')).toBeInTheDocument();
    });

    // onSend should not be called
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('handles character limits correctly', async () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Message');

    // Test title character limit
    const longTitle = 'a'.repeat(101);
    fireEvent.change(titleInput, { target: { value: longTitle } });
    
    // Check for negative character count instead of error message
    await waitFor(() => {
      expect(screen.getAllByText(/-1 characters remaining/)).toHaveLength(1);
    });

    // Test content character limit
    const longContent = 'a'.repeat(281);
    fireEvent.change(contentTextarea, { target: { value: longContent } });
    
    await waitFor(() => {
      expect(screen.getAllByText(/-1 characters remaining/)).toHaveLength(2);
    });
  });

  it('displays character counters correctly', () => {
    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    // Initial state
    expect(screen.getByText('100 characters remaining')).toBeInTheDocument();
    expect(screen.getByText('280 characters remaining')).toBeInTheDocument();

    // After typing
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    
    expect(screen.getByText('96 characters remaining')).toBeInTheDocument();
  });

  it('handles error during submission', async () => {
    const error = new Error('Network error');
    mockOnSend.mockRejectedValue(error);

    render(
      <ReplyCompose
        originalMessage={mockOriginalMessage}
        onSend={mockOnSend}
        onCancel={mockOnCancel}
      />
    );

    // Fill in the form
    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Message');
    
    fireEvent.change(titleInput, { target: { value: 'Test Reply' } });
    fireEvent.change(contentTextarea, { target: { value: 'Test content' } });

    // Submit the form
    const sendButton = screen.getByRole('button', { name: /send honk/i });
    fireEvent.click(sendButton);

    // Wait for the error to be handled
    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalled();
    });

    // The component should handle the error gracefully
    // (specific error handling depends on implementation)
  });
});