import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, useFlightProgress, useMultipleFlights } from '@/hooks/useWebSocket';
import { webSocketService } from '@/services/websocket';
import { FlightProgress } from '@/types';

// Mock the WebSocket service
vi.mock('@/services/websocket', () => ({
  webSocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(),
    onConnectionChange: vi.fn(),
    onError: vi.fn(),
    removeConnectionCallback: vi.fn(),
    removeErrorCallback: vi.fn(),
    subscribeToFlight: vi.fn(),
    unsubscribeFromFlight: vi.fn(),
    onFlightProgress: vi.fn(),
    onFlightDelivered: vi.fn(),
    removeFlightProgressCallback: vi.fn(),
    removeFlightDeliveredCallback: vi.fn(),
    getStats: vi.fn(() => ({
      connected: false,
      subscribedFlights: 0,
      reconnectAttempts: 0,
      pendingSubscriptions: 0
    }))
  }
}));

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize WebSocket connection', async () => {
    const { result } = renderHook(() => useWebSocket('user123'));

    expect(webSocketService.connect).toHaveBeenCalledWith('user123');
    expect(webSocketService.onConnectionChange).toHaveBeenCalled();
    expect(webSocketService.onError).toHaveBeenCalled();
  });

  it('should handle connection state changes', async () => {
    let connectionCallback: (connected: boolean) => void = () => {};
    
    (webSocketService.onConnectionChange as any).mockImplementation((callback: any) => {
      connectionCallback = callback;
    });

    const { result } = renderHook(() => useWebSocket('user123'));

    expect(result.current.isConnected).toBe(false);

    // Simulate connection
    act(() => {
      connectionCallback(true);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();

    // Simulate disconnection
    act(() => {
      connectionCallback(false);
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle errors', async () => {
    let errorCallback: (error: string) => void = () => {};
    
    (webSocketService.onError as any).mockImplementation((callback: any) => {
      errorCallback = callback;
    });

    const { result } = renderHook(() => useWebSocket('user123'));

    expect(result.current.error).toBeNull();

    // Simulate error
    act(() => {
      errorCallback('Connection failed');
    });

    expect(result.current.error).toBe('Connection failed');
  });

  it('should provide reconnect functionality', () => {
    const { result } = renderHook(() => useWebSocket('user123'));

    act(() => {
      result.current.reconnect();
    });

    expect(webSocketService.connect).toHaveBeenCalledTimes(2); // Once on init, once on reconnect
  });

  it('should provide disconnect functionality', () => {
    const { result } = renderHook(() => useWebSocket('user123'));

    act(() => {
      result.current.disconnect();
    });

    expect(webSocketService.disconnect).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('user123'));

    unmount();

    expect(webSocketService.removeConnectionCallback).toHaveBeenCalled();
    expect(webSocketService.removeErrorCallback).toHaveBeenCalled();
  });
});

describe('useFlightProgress Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to flight progress when messageId is provided', () => {
    const messageId = 'msg123';
    const userId = 'user123';

    renderHook(() => useFlightProgress(messageId, userId));

    expect(webSocketService.onFlightProgress).toHaveBeenCalledWith(messageId, expect.any(Function));
    expect(webSocketService.onFlightDelivered).toHaveBeenCalledWith(messageId, expect.any(Function));
    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith(messageId, userId);
  });

  it('should not subscribe when messageId is null', () => {
    renderHook(() => useFlightProgress(null));

    expect(webSocketService.subscribeToFlight).not.toHaveBeenCalled();
  });

  it('should handle flight progress updates', () => {
    const messageId = 'msg123';
    let progressCallback: (progress: FlightProgress) => void = () => {};

    (webSocketService.onFlightProgress as any).mockImplementation((id: string, callback: any) => {
      if (id === messageId) {
        progressCallback = callback;
      }
    });

    const { result } = renderHook(() => useFlightProgress(messageId));

    const mockProgress: FlightProgress = {
      message_id: messageId,
      current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
      progress_percentage: 50,
      estimated_arrival: new Date()
    };

    act(() => {
      progressCallback(mockProgress);
    });

    expect(result.current.progress).toEqual(mockProgress);
    expect(result.current.isDelivered).toBe(false);
  });

  it('should handle flight delivery', () => {
    const messageId = 'msg123';
    let deliveredCallback: (progress: FlightProgress) => void = () => {};

    (webSocketService.onFlightDelivered as any).mockImplementation((id: string, callback: any) => {
      if (id === messageId) {
        deliveredCallback = callback;
      }
    });

    const { result } = renderHook(() => useFlightProgress(messageId));

    const mockProgress: FlightProgress = {
      message_id: messageId,
      current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
      progress_percentage: 100,
      estimated_arrival: new Date()
    };

    act(() => {
      deliveredCallback(mockProgress);
    });

    expect(result.current.progress).toEqual(mockProgress);
    expect(result.current.isDelivered).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const messageId = 'msg123';
    const { unmount } = renderHook(() => useFlightProgress(messageId));

    unmount();

    expect(webSocketService.removeFlightProgressCallback).toHaveBeenCalled();
    expect(webSocketService.removeFlightDeliveredCallback).toHaveBeenCalled();
    expect(webSocketService.unsubscribeFromFlight).toHaveBeenCalledWith(messageId);
  });

  it('should handle messageId changes', () => {
    const { result, rerender } = renderHook(
      ({ messageId }) => useFlightProgress(messageId),
      { initialProps: { messageId: 'msg1' } }
    );

    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith('msg1', undefined);

    // Change messageId
    rerender({ messageId: 'msg2' });

    expect(webSocketService.unsubscribeFromFlight).toHaveBeenCalledWith('msg1');
    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith('msg2', undefined);
  });

  it('should provide refresh functionality', () => {
    const messageId = 'msg123';
    const { result } = renderHook(() => useFlightProgress(messageId));

    act(() => {
      result.current.refresh();
    });

    expect(webSocketService.unsubscribeFromFlight).toHaveBeenCalledWith(messageId);
    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith(messageId, undefined);
  });
});

describe('useMultipleFlights Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to multiple flights', () => {
    const messageIds = ['msg1', 'msg2', 'msg3'];
    const userId = 'user123';

    renderHook(() => useMultipleFlights(messageIds, userId));

    messageIds.forEach(messageId => {
      expect(webSocketService.onFlightProgress).toHaveBeenCalledWith(messageId, expect.any(Function));
      expect(webSocketService.onFlightDelivered).toHaveBeenCalledWith(messageId, expect.any(Function));
      expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith(messageId, userId);
    });
  });

  it('should handle progress updates for multiple flights', () => {
    const messageIds = ['msg1', 'msg2'];
    const progressCallbacks: { [key: string]: (progress: FlightProgress) => void } = {};

    (webSocketService.onFlightProgress as any).mockImplementation((id: string, callback: any) => {
      progressCallbacks[id] = callback;
    });

    const { result } = renderHook(() => useMultipleFlights(messageIds));

    const mockProgress1: FlightProgress = {
      message_id: 'msg1',
      current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
      progress_percentage: 25,
      estimated_arrival: new Date()
    };

    const mockProgress2: FlightProgress = {
      message_id: 'msg2',
      current_position: { latitude: 41.8781, longitude: -87.6298, is_anonymous: false },
      progress_percentage: 75,
      estimated_arrival: new Date()
    };

    act(() => {
      progressCallbacks['msg1'](mockProgress1);
      progressCallbacks['msg2'](mockProgress2);
    });

    expect(result.current.flightProgress['msg1']).toEqual(mockProgress1);
    expect(result.current.flightProgress['msg2']).toEqual(mockProgress2);
    expect(result.current.totalFlights).toBe(2);
    expect(result.current.activeFlights).toBe(2);
  });

  it('should handle flight deliveries', () => {
    const messageIds = ['msg1', 'msg2'];
    const deliveredCallbacks: { [key: string]: (progress: FlightProgress) => void } = {};

    (webSocketService.onFlightDelivered as any).mockImplementation((id: string, callback: any) => {
      deliveredCallbacks[id] = callback;
    });

    const { result } = renderHook(() => useMultipleFlights(messageIds));

    const mockProgress: FlightProgress = {
      message_id: 'msg1',
      current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
      progress_percentage: 100,
      estimated_arrival: new Date()
    };

    act(() => {
      deliveredCallbacks['msg1'](mockProgress);
    });

    expect(result.current.deliveredFlights).toContain('msg1');
    expect(result.current.activeFlights).toBe(1); // One delivered, one still active
  });

  it('should cleanup on unmount', () => {
    const messageIds = ['msg1', 'msg2'];
    const { unmount } = renderHook(() => useMultipleFlights(messageIds));

    unmount();

    messageIds.forEach(messageId => {
      expect(webSocketService.removeFlightProgressCallback).toHaveBeenCalled();
      expect(webSocketService.removeFlightDeliveredCallback).toHaveBeenCalled();
      expect(webSocketService.unsubscribeFromFlight).toHaveBeenCalledWith(messageId);
    });
  });

  it('should handle messageIds changes', () => {
    const { rerender } = renderHook(
      ({ messageIds }) => useMultipleFlights(messageIds),
      { initialProps: { messageIds: ['msg1', 'msg2'] } }
    );

    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith('msg1', undefined);
    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith('msg2', undefined);

    // Change messageIds
    rerender({ messageIds: ['msg2', 'msg3'] });

    expect(webSocketService.unsubscribeFromFlight).toHaveBeenCalledWith('msg1');
    expect(webSocketService.subscribeToFlight).toHaveBeenCalledWith('msg3', undefined);
  });
});

describe('Hook Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle WebSocket service errors gracefully', () => {
    (webSocketService.connect as any).mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useWebSocket('user123'));

    // Should not crash the hook
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle subscription errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (webSocketService.subscribeToFlight as any).mockImplementation(() => {
      throw new Error('Subscription failed');
    });

    expect(() => {
      renderHook(() => useFlightProgress('msg123'));
    }).toThrow('Subscription failed');

    consoleSpy.mockRestore();
  });
});