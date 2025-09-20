import { FlightProgress } from '@/types';

// WebSocket message types
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  messageId?: string;
  userId?: string;
  data?: unknown;
}

interface WebSocketResponse {
  type: 'flight.progress' | 'flight.delivered' | 'error' | 'pong' | 'subscribed' | 'unsubscribed';
  messageId?: string;
  data?: unknown;
  error?: string;
}

// Event callback types
type FlightProgressCallback = (progress: FlightProgress) => void;
type FlightDeliveredCallback = (progress: FlightProgress) => void;
type ErrorCallback = (error: string) => void;
type ConnectionCallback = (connected: boolean) => void;

/**
 * WebSocket client service for real-time flight updates
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  // Event callbacks
  private flightProgressCallbacks = new Map<string, FlightProgressCallback[]>();
  private flightDeliveredCallbacks = new Map<string, FlightDeliveredCallback[]>();
  private errorCallbacks: ErrorCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];

  // Subscribed flights
  private subscribedFlights = new Set<string>();
  private pendingSubscriptions = new Set<string>();

  constructor(url?: string) {
    this.url = url || this.getWebSocketUrl();
  }

  /**
   * Get WebSocket URL based on current location
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3000/api/websocket';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/websocket`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId?: string): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      // For Next.js, we'll use a different approach since WebSocket upgrade is complex
      // We'll simulate the connection for now and use HTTP polling as fallback
      if (typeof window !== 'undefined') {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          this.startPingInterval();
          this.resubscribeToFlights();
          this.notifyConnectionCallbacks(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketResponse = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPingInterval();
          this.notifyConnectionCallbacks(false);
          
          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.notifyErrorCallbacks('WebSocket connection error');
        };

        return true;
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.notifyErrorCallbacks('Failed to connect to WebSocket server');
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }

    return false;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.subscribedFlights.clear();
    this.pendingSubscriptions.clear();
    this.notifyConnectionCallbacks(false);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to flight progress updates
   */
  subscribeToFlight(messageId: string, userId?: string): void {
    if (this.subscribedFlights.has(messageId)) {
      return; // Already subscribed
    }

    this.subscribedFlights.add(messageId);

    if (this.isConnected()) {
      this.sendMessage({
        type: 'subscribe',
        messageId,
        userId
      });
    } else {
      // Queue for when connection is established
      this.pendingSubscriptions.add(messageId);
      
      // Try to connect if not already connecting
      if (!this.isConnecting) {
        this.connect(userId);
      }
    }
  }

  /**
   * Unsubscribe from flight progress updates
   */
  unsubscribeFromFlight(messageId: string): void {
    this.subscribedFlights.delete(messageId);
    this.pendingSubscriptions.delete(messageId);

    if (this.isConnected()) {
      this.sendMessage({
        type: 'unsubscribe',
        messageId
      });
    }

    // Clean up callbacks
    this.flightProgressCallbacks.delete(messageId);
    this.flightDeliveredCallbacks.delete(messageId);
  }

  /**
   * Add flight progress callback
   */
  onFlightProgress(messageId: string, callback: FlightProgressCallback): void {
    if (!this.flightProgressCallbacks.has(messageId)) {
      this.flightProgressCallbacks.set(messageId, []);
    }
    this.flightProgressCallbacks.get(messageId)!.push(callback);
  }

  /**
   * Add flight delivered callback
   */
  onFlightDelivered(messageId: string, callback: FlightDeliveredCallback): void {
    if (!this.flightDeliveredCallbacks.has(messageId)) {
      this.flightDeliveredCallbacks.set(messageId, []);
    }
    this.flightDeliveredCallbacks.get(messageId)!.push(callback);
  }

  /**
   * Add error callback
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Add connection status callback
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Remove flight progress callback
   */
  removeFlightProgressCallback(messageId: string, callback: FlightProgressCallback): void {
    const callbacks = this.flightProgressCallbacks.get(messageId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.flightProgressCallbacks.delete(messageId);
      }
    }
  }

  /**
   * Remove flight delivered callback
   */
  removeFlightDeliveredCallback(messageId: string, callback: FlightDeliveredCallback): void {
    const callbacks = this.flightDeliveredCallbacks.get(messageId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.flightDeliveredCallbacks.delete(messageId);
      }
    }
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: ErrorCallback): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove connection callback
   */
  removeConnectionCallback(callback: ConnectionCallback): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.notifyErrorCallbacks('Failed to send message');
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketResponse): void {
    switch (message.type) {
      case 'flight.progress':
        if (message.messageId && message.data) {
          this.notifyFlightProgressCallbacks(message.messageId, message.data as FlightProgress);
        }
        break;

      case 'flight.delivered':
        if (message.messageId && message.data) {
          this.notifyFlightDeliveredCallbacks(message.messageId, message.data as FlightProgress);
          // Auto-unsubscribe from delivered flights
          this.subscribedFlights.delete(message.messageId);
        }
        break;

      case 'error':
        if (message.error) {
          this.notifyErrorCallbacks(message.error);
        }
        break;

      case 'pong':
        // Pong received, connection is alive
        break;

      case 'subscribed':
      case 'unsubscribed':
        // Subscription status updates
        console.log(`Flight ${message.messageId} ${message.type}`);
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyErrorCallbacks('Failed to reconnect after maximum attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Resubscribe to all flights after reconnection
   */
  private resubscribeToFlights(): void {
    // Resubscribe to existing flights
    for (const messageId of this.subscribedFlights) {
      this.sendMessage({
        type: 'subscribe',
        messageId
      });
    }

    // Subscribe to pending flights
    for (const messageId of this.pendingSubscriptions) {
      this.subscribedFlights.add(messageId);
      this.sendMessage({
        type: 'subscribe',
        messageId
      });
    }
    this.pendingSubscriptions.clear();
  }

  /**
   * Notify flight progress callbacks
   */
  private notifyFlightProgressCallbacks(messageId: string, progress: FlightProgress): void {
    const callbacks = this.flightProgressCallbacks.get(messageId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Error in flight progress callback:', error);
        }
      });
    }
  }

  /**
   * Notify flight delivered callbacks
   */
  private notifyFlightDeliveredCallbacks(messageId: string, progress: FlightProgress): void {
    const callbacks = this.flightDeliveredCallbacks.get(messageId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Error in flight delivered callback:', error);
        }
      });
    }
  }

  /**
   * Notify error callbacks
   */
  private notifyErrorCallbacks(error: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  /**
   * Notify connection callbacks
   */
  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Send message to a specific user (server-side method)
   */
  sendToUser(userId: string, message: { type: string; data: unknown }): void {
    // This method is primarily for server-side use
    // For client-side, we'll use HTTP fallback to notify the server
    if (typeof window !== 'undefined') {
      // Client-side: send via HTTP API
      fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendToUser',
          userId,
          message
        })
      }).catch(error => {
        console.error('Error sending message to user via HTTP:', error);
      });
    } else {
      // Server-side: would need access to connection map
      console.log(`Sending message to user ${userId}:`, message);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connected: this.isConnected(),
      subscribedFlights: this.subscribedFlights.size,
      reconnectAttempts: this.reconnectAttempts,
      pendingSubscriptions: this.pendingSubscriptions.size
    };
  }
}

/**
 * Singleton WebSocket service instance
 */
export const webSocketService = new WebSocketService();