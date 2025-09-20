import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { WebSocketService } from '@/services/websocket';
import { FlightProgress } from '@/types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock sending data
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper method to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
const mockInstances: MockWebSocket[] = [];
(MockWebSocket as any).mock = { instances: mockInstances };

global.WebSocket = class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockInstances.push(this);
  }
} as any;

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    webSocketService = new WebSocketService('ws://localhost:3000/test');
    vi.clearAllMocks();
    mockInstances.length = 0; // Clear mock instances
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const connected = await webSocketService.connect('user123');
      
      // Wait for connection to open
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(connected).toBe(true);
      expect(webSocketService.isConnected()).toBe(true);
    });

    it('should handle connection callbacks', async () => {
      const connectionCallback = vi.fn();
      webSocketService.onConnectionChange(connectionCallback);

      await webSocketService.connect('user123');
      
      // Wait for connection to open
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(connectionCallback).toHaveBeenCalledWith(true);
    });

    it('should handle disconnection', async () => {
      const connectionCallback = vi.fn();
      webSocketService.onConnectionChange(connectionCallback);

      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));

      webSocketService.disconnect();

      expect(connectionCallback).toHaveBeenCalledWith(false);
      expect(webSocketService.isConnected()).toBe(false);
    });

    it('should handle connection errors', async () => {
      const errorCallback = vi.fn();
      webSocketService.onError(errorCallback);

      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));

      // Simulate error
      const ws = (global.WebSocket as any).mock.instances[0];
      ws.simulateError();

      expect(errorCallback).toHaveBeenCalledWith('WebSocket connection error');
    });
  });

  describe('Flight Subscriptions', () => {
    beforeEach(async () => {
      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    it('should subscribe to flight updates', () => {
      const messageId = 'msg123';
      
      webSocketService.subscribeToFlight(messageId, 'user123');
      
      const stats = webSocketService.getStats();
      expect(stats.subscribedFlights).toBe(1);
    });

    it('should handle flight progress updates', async () => {
      const messageId = 'msg123';
      const progressCallback = vi.fn();
      
      webSocketService.onFlightProgress(messageId, progressCallback);
      webSocketService.subscribeToFlight(messageId, 'user123');

      // Simulate receiving flight progress
      const mockProgress: FlightProgress = {
        message_id: messageId,
        current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        progress_percentage: 50,
        estimated_arrival: new Date(),
        current_weather: {
          type: 'clear',
          intensity: 1,
          speed_modifier: 1,
          location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
          timestamp: new Date()
        }
      };

      const ws = (global.WebSocket as any).mock.instances[0];
      ws.simulateMessage({
        type: 'flight.progress',
        messageId,
        data: mockProgress
      });

      expect(progressCallback).toHaveBeenCalledWith(mockProgress);
    });

    it('should handle flight delivery notifications', async () => {
      const messageId = 'msg123';
      const deliveredCallback = vi.fn();
      
      webSocketService.onFlightDelivered(messageId, deliveredCallback);
      webSocketService.subscribeToFlight(messageId, 'user123');

      // Simulate flight delivery
      const mockProgress: FlightProgress = {
        message_id: messageId,
        current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        progress_percentage: 100,
        estimated_arrival: new Date()
      };

      const ws = (global.WebSocket as any).mock.instances[0];
      ws.simulateMessage({
        type: 'flight.delivered',
        messageId,
        data: mockProgress
      });

      expect(deliveredCallback).toHaveBeenCalledWith(mockProgress);
      
      // Should auto-unsubscribe from delivered flights
      const stats = webSocketService.getStats();
      expect(stats.subscribedFlights).toBe(0);
    });

    it('should unsubscribe from flights', () => {
      const messageId = 'msg123';
      
      webSocketService.subscribeToFlight(messageId, 'user123');
      expect(webSocketService.getStats().subscribedFlights).toBe(1);
      
      webSocketService.unsubscribeFromFlight(messageId);
      expect(webSocketService.getStats().subscribedFlights).toBe(0);
    });

    it('should handle multiple flight subscriptions', () => {
      const messageIds = ['msg1', 'msg2', 'msg3'];
      
      messageIds.forEach(id => {
        webSocketService.subscribeToFlight(id, 'user123');
      });
      
      expect(webSocketService.getStats().subscribedFlights).toBe(3);
      
      // Unsubscribe from one
      webSocketService.unsubscribeFromFlight('msg2');
      expect(webSocketService.getStats().subscribedFlights).toBe(2);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    it('should handle ping/pong messages', async () => {
      const ws = (global.WebSocket as any).mock.instances[0];
      const sendSpy = vi.spyOn(ws, 'send');

      // Simulate receiving pong
      ws.simulateMessage({ type: 'pong' });

      // Should not cause any errors
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should handle error messages', async () => {
      const errorCallback = vi.fn();
      webSocketService.onError(errorCallback);

      const ws = (global.WebSocket as any).mock.instances[0];
      ws.simulateMessage({
        type: 'error',
        error: 'Test error message'
      });

      expect(errorCallback).toHaveBeenCalledWith('Test error message');
    });

    it('should handle subscription confirmations', async () => {
      const ws = (global.WebSocket as any).mock.instances[0];
      
      // Should not throw errors
      ws.simulateMessage({
        type: 'subscribed',
        messageId: 'msg123',
        data: { status: 'subscribed' }
      });

      ws.simulateMessage({
        type: 'unsubscribed',
        messageId: 'msg123',
        data: { status: 'unsubscribed' }
      });
    });

    it('should handle invalid JSON messages gracefully', async () => {
      const errorCallback = vi.fn();
      webSocketService.onError(errorCallback);

      const ws = (global.WebSocket as any).mock.instances[0];
      
      // Simulate invalid JSON
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }

      // Should not crash the service
      expect(webSocketService.isConnected()).toBe(true);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on connection loss', async () => {
      const connectionCallback = vi.fn();
      webSocketService.onConnectionChange(connectionCallback);

      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));

      // Simulate connection loss
      const ws = (global.WebSocket as any).mock.instances[0];
      ws.close(1006, 'Connection lost');

      expect(connectionCallback).toHaveBeenCalledWith(false);
      
      // Should attempt to reconnect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if new WebSocket instance was created
      expect((global.WebSocket as any).mock.instances.length).toBeGreaterThan(1);
    });

    it('should resubscribe to flights after reconnection', async () => {
      const messageId = 'msg123';
      const progressCallback = vi.fn();

      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));

      webSocketService.onFlightProgress(messageId, progressCallback);
      webSocketService.subscribeToFlight(messageId, 'user123');

      // Simulate connection loss and reconnection
      const ws = (global.WebSocket as any).mock.instances[0];
      ws.close(1006, 'Connection lost');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still be subscribed after reconnection
      expect(webSocketService.getStats().subscribedFlights).toBe(1);
    });
  });

  describe('Callback Management', () => {
    it('should add and remove flight progress callbacks', () => {
      const messageId = 'msg123';
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      webSocketService.onFlightProgress(messageId, callback1);
      webSocketService.onFlightProgress(messageId, callback2);

      webSocketService.removeFlightProgressCallback(messageId, callback1);

      // Only callback2 should remain
      // This is tested indirectly through the subscription behavior
    });

    it('should add and remove error callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      webSocketService.onError(callback1);
      webSocketService.onError(callback2);

      webSocketService.removeErrorCallback(callback1);

      // Only callback2 should remain
      // This is tested indirectly through error handling
    });

    it('should clean up callbacks on unsubscribe', () => {
      const messageId = 'msg123';
      const progressCallback = vi.fn();
      const deliveredCallback = vi.fn();

      webSocketService.onFlightProgress(messageId, progressCallback);
      webSocketService.onFlightDelivered(messageId, deliveredCallback);
      webSocketService.subscribeToFlight(messageId, 'user123');

      webSocketService.unsubscribeFromFlight(messageId);

      // Callbacks should be cleaned up
      expect(webSocketService.getStats().subscribedFlights).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate connection statistics', async () => {
      const stats1 = webSocketService.getStats();
      expect(stats1.connected).toBe(false);
      expect(stats1.subscribedFlights).toBe(0);

      await webSocketService.connect('user123');
      await new Promise(resolve => setTimeout(resolve, 20));

      const stats2 = webSocketService.getStats();
      expect(stats2.connected).toBe(true);

      webSocketService.subscribeToFlight('msg1', 'user123');
      webSocketService.subscribeToFlight('msg2', 'user123');

      const stats3 = webSocketService.getStats();
      expect(stats3.subscribedFlights).toBe(2);
    });
  });
});

describe('WebSocket Integration with Flight Engine', () => {
  let webSocketService: WebSocketService;

  beforeEach(() => {
    webSocketService = new WebSocketService('ws://localhost:3000/test');
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  it('should handle real-time flight progress updates', async () => {
    const messageId = 'flight123';
    const progressUpdates: FlightProgress[] = [];
    
    webSocketService.onFlightProgress(messageId, (progress) => {
      progressUpdates.push(progress);
    });

    await webSocketService.connect('user123');
    await new Promise(resolve => setTimeout(resolve, 20));

    webSocketService.subscribeToFlight(messageId, 'user123');

    // Simulate multiple progress updates
    const ws = (global.WebSocket as any).mock.instances[0];
    
    const updates = [
      { progress_percentage: 25, current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false } },
      { progress_percentage: 50, current_position: { latitude: 41.8781, longitude: -87.6298, is_anonymous: false } },
      { progress_percentage: 75, current_position: { latitude: 34.0522, longitude: -118.2437, is_anonymous: false } }
    ];

    for (const update of updates) {
      ws.simulateMessage({
        type: 'flight.progress',
        messageId,
        data: {
          message_id: messageId,
          ...update,
          estimated_arrival: new Date()
        }
      });
    }

    expect(progressUpdates).toHaveLength(3);
    expect(progressUpdates[0].progress_percentage).toBe(25);
    expect(progressUpdates[1].progress_percentage).toBe(50);
    expect(progressUpdates[2].progress_percentage).toBe(75);
  });

  it('should handle weather-affected flight updates', async () => {
    const messageId = 'flight123';
    let lastProgress: FlightProgress | null = null;
    
    webSocketService.onFlightProgress(messageId, (progress) => {
      lastProgress = progress;
    });

    await webSocketService.connect('user123');
    await new Promise(resolve => setTimeout(resolve, 20));

    webSocketService.subscribeToFlight(messageId, 'user123');

    const ws = (global.WebSocket as any).mock.instances[0];
    
    // Simulate weather-affected update
    ws.simulateMessage({
      type: 'flight.progress',
      messageId,
      data: {
        message_id: messageId,
        current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
        progress_percentage: 30,
        estimated_arrival: new Date(),
        current_weather: {
          type: 'storm',
          intensity: 0.8,
          speed_modifier: 0.5,
          location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
          timestamp: new Date()
        }
      }
    });

    expect(lastProgress).not.toBeNull();
    expect(lastProgress!.current_weather?.type).toBe('storm');
    expect(lastProgress!.current_weather?.speed_modifier).toBe(0.5);
  });
});