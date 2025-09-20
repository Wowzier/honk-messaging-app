import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposeHonk } from '@/components/messaging/ComposeHonk';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select-container">
      <select
        data-testid="location-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Choose location sharing</option>
        <option value="state">Share State/Province</option>
        <option value="country">Share Country</option>
        <option value="anonymous">Anonymous</option>
      </select>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

describe('ComposeHonk Component', () => {
  const mockOnSend = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByTestId('location-select')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send honk/i })).toBeInTheDocument();
  });

  it('should show character counters', () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    expect(screen.getByText('100 characters remaining')).toBeInTheDocument(); // Title counter
    expect(screen.getByText('280 characters remaining')).toBeInTheDocument(); // Content counter
  });

  it('should update character counters as user types', async () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');

    await user.type(titleInput, 'Hello');
    await user.type(contentInput, 'This is a test message');

    expect(screen.getByText('95 characters remaining')).toBeInTheDocument(); // 100 - 5
    expect(screen.getByText('258 characters remaining')).toBeInTheDocument(); // 280 - 22
  });

  it('should show validation errors for empty fields', async () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    const submitButton = screen.getByRole('button', { name: /send honk/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Message content is required')).toBeInTheDocument();
    });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should show validation errors for content exceeding limits', async () => {
    render(<ComposeHonk onSend={mockOnSend} titleLimit={10} characterLimit={20} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    // Type content that exceeds limits (maxLength allows 10 extra chars)
    await user.type(titleInput, 'This title is too long'); // Will be truncated to 20 chars
    await user.type(contentInput, 'This message content is definitely too long'); // Will be truncated to 30 chars

    // Check that negative character counts are shown
    await waitFor(() => {
      const negativeCounters = screen.getAllByText('-10 characters remaining');
      expect(negativeCounters).toHaveLength(2); // Both title and content show -10 due to truncation
    });

    // Submit button should be disabled when limits are exceeded
    expect(submitButton).toBeDisabled();
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should clear validation errors when user fixes input', async () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    // Trigger validation error
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Fix the input
    await user.type(titleInput, 'Valid Title');

    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('should handle location sharing selection', async () => {
    render(<ComposeHonk onSend={mockOnSend} />);

    const locationSelect = screen.getByTestId('location-select');
    
    await user.selectOptions(locationSelect, 'country');
    expect(locationSelect).toHaveValue('country');

    await user.selectOptions(locationSelect, 'anonymous');
    expect(locationSelect).toHaveValue('anonymous');
  });

  it('should submit valid form data', async () => {
    mockOnSend.mockResolvedValue(undefined);
    
    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const locationSelect = screen.getByTestId('location-select');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test message content');
    await user.selectOptions(locationSelect, 'country');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith({
        title: 'Test Title',
        content: 'Test message content',
        locationSharing: 'country',
      });
    });
  });

  it('should reset form after successful submission', async () => {
    mockOnSend.mockResolvedValue(undefined);
    
    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    const contentInput = screen.getByLabelText('Message') as HTMLTextAreaElement;
    const locationSelect = screen.getByTestId('location-select') as HTMLSelectElement;
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test message content');
    await user.selectOptions(locationSelect, 'country');
    await user.click(submitButton);

    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(contentInput.value).toBe('');
      expect(locationSelect.value).toBe('state'); // Default value
    });
  });

  it('should show loading state during submission', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnSend.mockReturnValue(promise);

    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test message content');
    await user.click(submitButton);

    expect(screen.getByText('Sending Honk...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    resolvePromise!();
    await waitFor(() => {
      expect(screen.getByText('Send Honk! 🚀')).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should disable form when isLoading prop is true', () => {
    render(<ComposeHonk onSend={mockOnSend} isLoading={true} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const submitButton = screen.getByRole('button', { name: /loading/i });

    expect(titleInput).toBeDisabled();
    expect(contentInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should disable submit button when character limits are exceeded', async () => {
    render(<ComposeHonk onSend={mockOnSend} titleLimit={5} characterLimit={10} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    await user.type(titleInput, 'Too long title');
    await user.type(contentInput, 'Too long content');

    expect(submitButton).toBeDisabled();
  });

  it('should show negative character count when limits are exceeded', async () => {
    render(<ComposeHonk onSend={mockOnSend} titleLimit={5} characterLimit={10} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');

    await user.type(titleInput, 'Too long');
    await user.type(contentInput, 'Too long content');

    expect(screen.getByText('-3 characters remaining')).toBeInTheDocument(); // Title: 8 - 5 = -3
    expect(screen.getByText('-6 characters remaining')).toBeInTheDocument(); // Content: 16 - 10 = -6
  });

  it('should handle submission errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSend.mockRejectedValue(new Error('Network error'));

    render(<ComposeHonk onSend={mockOnSend} />);

    const titleInput = screen.getByLabelText('Title');
    const contentInput = screen.getByLabelText('Message');
    const submitButton = screen.getByRole('button', { name: /send honk/i });

    await user.type(titleInput, 'Test Title');
    await user.type(contentInput, 'Test message content');
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
    });

    // Form should not be reset on error
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Test Title');
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Test message content');

    consoleErrorSpy.mockRestore();
  });

  it('should use custom character and title limits', () => {
    render(<ComposeHonk onSend={mockOnSend} characterLimit={500} titleLimit={150} />);

    expect(screen.getByText('150 characters remaining')).toBeInTheDocument(); // Title counter
    expect(screen.getByText('500 characters remaining')).toBeInTheDocument(); // Content counter
  });
});