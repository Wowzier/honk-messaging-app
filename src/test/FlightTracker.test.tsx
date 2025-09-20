import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlightTracker } from '@/components/flight/FlightTracker';
import { FlightProgress } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useWebSocket', () => ({
  useFlightProgress: vi.fn(),
  useWebSocketStatus: vi.fn()
}));

import { useFlightProgress, useWebSocketStatus } from '@/hooks/useWebSocket';

describe('FlightTracker Component', () => {
  const mockFlightProgress: FlightProgress = {
    message_id: 'msg123',
    current_position: {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    },
    progress_percentage: 50,
    estimated_arrival: new Date(Date.now() + 3600000), // 1 hour from now
    current_weather: {
      type: 'clear',
      intensity: 1,
      speed_modifier: 1,
      location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
      timestamp: new Date()
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (useFlightProgress as any).mockReturnValue({
      progress: null,
      isDelivered: false,
      error: null,
      isSubscribed: false,
      refresh: vi.fn()
    });

    (useWebSocketStatus as any).mockReturnValue({
      status: 'connected',
      reconnect: vi.fn(),
      isConnected: true
    });
  });

  it('should render loading state when no progress data', () => {
    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Loading Flight Data...')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Loading Flight Data/i })).toBeInTheDocument();
  });

  it('should render flight progress when data is available', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Duck in Flight')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('40.7128°, -74.0060°')).toBeInTheDocument();
    expect(screen.getByText('New York, United States')).toBeInTheDocument();
  });

  it('should render delivered state when flight is complete', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: { ...mockFlightProgress, progress_percentage: 100 },
      isDelivered: true,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Message Delivered!')).toBeInTheDocument();
    expect(screen.getByText('🎉 Your message has been delivered successfully!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render error state when there is an error', () => {
    const mockRefresh = vi.fn();
    (useFlightProgress as any).mockReturnValue({
      progress: null,
      isDelivered: false,
      error: 'Connection failed',
      isSubscribed: false,
      refresh: mockRefresh
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should display weather information when available', () => {
    const progressWithStorm = {
      ...mockFlightProgress,
      current_weather: {
        type: 'storm',
        intensity: 0.8,
        speed_modifier: 0.5,
        location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        timestamp: new Date()
      }
    };

    (useFlightProgress as any).mockReturnValue({
      progress: progressWithStorm,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('storm')).toBeInTheDocument();
    expect(screen.getByText('Slowing')).toBeInTheDocument();
  });

  it('should display estimated arrival time', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Estimated Arrival')).toBeInTheDocument();
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
  });

  it('should show connection status', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    (useWebSocketStatus as any).mockReturnValue({
      status: 'connected',
      reconnect: vi.fn(),
      isConnected: true
    });

    render(<FlightTracker messageId="msg123" showConnectionStatus={true} />);

    expect(screen.getByText('Live updates')).toBeInTheDocument();
  });

  it('should show offline status when disconnected', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: false,
      refresh: vi.fn()
    });

    (useWebSocketStatus as any).mockReturnValue({
      status: 'disconnected',
      reconnect: vi.fn(),
      isConnected: false
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
  });

  it('should call reconnect when reconnect button is clicked', () => {
    const mockReconnect = vi.fn();
    
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: false,
      refresh: vi.fn()
    });

    (useWebSocketStatus as any).mockReturnValue({
      status: 'disconnected',
      reconnect: mockReconnect,
      isConnected: false
    });

    render(<FlightTracker messageId="msg123" />);

    const reconnectButton = screen.getByText('Reconnect');
    fireEvent.click(reconnectButton);
    expect(mockReconnect).toHaveBeenCalled();
  });

  it('should call onDelivered callback when flight is delivered', () => {
    const mockOnDelivered = vi.fn();
    const deliveredProgress = { ...mockFlightProgress, progress_percentage: 100 };

    (useFlightProgress as any).mockReturnValue({
      progress: deliveredProgress,
      isDelivered: true,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" onDelivered={mockOnDelivered} />);

    expect(mockOnDelivered).toHaveBeenCalledWith(deliveredProgress);
  });

  it('should format coordinates correctly', () => {
    const progressWithPreciseCoords = {
      ...mockFlightProgress,
      current_position: {
        latitude: 40.712776,
        longitude: -74.005974,
        is_anonymous: false
      }
    };

    (useFlightProgress as any).mockReturnValue({
      progress: progressWithPreciseCoords,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" />);

    expect(screen.getByText('40.7128°, -74.0060°')).toBeInTheDocument();
  });

  it('should handle different weather types with appropriate icons', () => {
    const weatherTypes = [
      { type: 'rain', expectedText: 'rain' },
      { type: 'wind', expectedText: 'wind' },
      { type: 'storm', expectedText: 'storm' }
    ];

    weatherTypes.forEach(({ type, expectedText }) => {
      const progressWithWeather = {
        ...mockFlightProgress,
        current_weather: {
          type: type as any,
          intensity: 1,
          speed_modifier: 0.8,
          location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
          timestamp: new Date()
        }
      };

      (useFlightProgress as any).mockReturnValue({
        progress: progressWithWeather,
        isDelivered: false,
        error: null,
        isSubscribed: true,
        refresh: vi.fn()
      });

      const { unmount } = render(<FlightTracker messageId="msg123" />);

      expect(screen.getByText(expectedText)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('should hide connection status when showConnectionStatus is false', () => {
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    render(<FlightTracker messageId="msg123" showConnectionStatus={false} />);

    // Should not show the WiFi icon in the header
    const wifiIcons = screen.queryAllByTestId('wifi-icon');
    expect(wifiIcons).toHaveLength(0);
  });

  it('should update last update time when progress changes', async () => {
    const { rerender } = render(<FlightTracker messageId="msg123" />);

    // First render with progress
    (useFlightProgress as any).mockReturnValue({
      progress: mockFlightProgress,
      isDelivered: false,
      error: null,
      isSubscribed: true,
      refresh: vi.fn()
    });

    rerender(<FlightTracker messageId="msg123" />);

    await waitFor(() => {
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });
});