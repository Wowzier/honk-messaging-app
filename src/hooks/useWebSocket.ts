import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService } from '@/services/websocket';
import { FlightProgress } from '@/types';

/**
 * Hook for managing WebSocket connection and flight subscriptions
 */
export function useWebSocket(userId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const isInitialized = useRef(false);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setError(null);
        setConnectionAttempts(0);
      } else {
        setConnectionAttempts(prev => prev + 1);
      }
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    // Register callbacks
    webSocketService.onConnectionChange(handleConnectionChange);
    webSocketService.onError(handleError);

    // Connect to WebSocket
    webSocketService.connect(userId);

    // Cleanup on unmount
    return () => {
      webSocketService.removeConnectionCallback(handleConnectionChange);
      webSocketService.removeErrorCallback(handleError);
    };
  }, [userId]);

  // Reconnect function
  const reconnect = useCallback(() => {
    setError(null);
    webSocketService.connect(userId);
  }, [userId]);

  // Disconnect function
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  return {
    isConnected,
    error,
    connectionAttempts,
    reconnect,
    disconnect,
    stats: webSocketService.getStats()
  };
}

/**
 * Hook for subscribing to flight progress updates
 */
export function useFlightProgress(messageId: string | null, userId?: string) {
  const [progress, setProgress] = useState<FlightProgress | null>(null);
  const [isDelivered, setIsDelivered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!messageId) {
      setProgress(null);
      setIsDelivered(false);
      setIsSubscribed(false);
      return;
    }

    const handleProgress = (flightProgress: FlightProgress) => {
      setProgress(flightProgress);
      setError(null);
    };

    const handleDelivered = (flightProgress: FlightProgress) => {
      setProgress(flightProgress);
      setIsDelivered(true);
      setError(null);
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    // Register callbacks
    webSocketService.onFlightProgress(messageId, handleProgress);
    webSocketService.onFlightDelivered(messageId, handleDelivered);
    webSocketService.onError(handleError);

    // Subscribe to flight
    webSocketService.subscribeToFlight(messageId, userId);
    setIsSubscribed(true);

    // Cleanup on unmount or messageId change
    return () => {
      webSocketService.removeFlightProgressCallback(messageId, handleProgress);
      webSocketService.removeFlightDeliveredCallback(messageId, handleDelivered);
      webSocketService.removeErrorCallback(handleError);
      webSocketService.unsubscribeFromFlight(messageId);
      setIsSubscribed(false);
    };
  }, [messageId, userId]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (messageId) {
      setError(null);
      webSocketService.unsubscribeFromFlight(messageId);
      webSocketService.subscribeToFlight(messageId, userId);
    }
  }, [messageId, userId]);

  return {
    progress,
    isDelivered,
    error,
    isSubscribed,
    refresh
  };
}

/**
 * Hook for managing multiple flight subscriptions
 */
export function useMultipleFlights(messageIds: string[], userId?: string) {
  const [flightProgress, setFlightProgress] = useState<Map<string, FlightProgress>>(new Map());
  const [deliveredFlights, setDeliveredFlights] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const progressCallbacks = new Map<string, (progress: FlightProgress) => void>();
    const deliveredCallbacks = new Map<string, (progress: FlightProgress) => void>();

    // Set up callbacks for each message
    messageIds.forEach(messageId => {
      const handleProgress = (progress: FlightProgress) => {
        setFlightProgress(prev => new Map(prev.set(messageId, progress)));
        setErrors(prev => {
          const newErrors = new Map(prev);
          newErrors.delete(messageId);
          return newErrors;
        });
      };

      const handleDelivered = (progress: FlightProgress) => {
        setFlightProgress(prev => new Map(prev.set(messageId, progress)));
        setDeliveredFlights(prev => new Set(prev.add(messageId)));
        setErrors(prev => {
          const newErrors = new Map(prev);
          newErrors.delete(messageId);
          return newErrors;
        });
      };

      progressCallbacks.set(messageId, handleProgress);
      deliveredCallbacks.set(messageId, handleDelivered);

      // Register callbacks
      webSocketService.onFlightProgress(messageId, handleProgress);
      webSocketService.onFlightDelivered(messageId, handleDelivered);

      // Subscribe to flight
      webSocketService.subscribeToFlight(messageId, userId);
    });

    // Error handler
    const handleError = (errorMessage: string) => {
      // For simplicity, we'll set the error for all flights
      // In a real implementation, you might want to track which flight caused the error
      messageIds.forEach(messageId => {
        setErrors(prev => new Map(prev.set(messageId, errorMessage)));
      });
    };

    webSocketService.onError(handleError);

    // Cleanup
    return () => {
      messageIds.forEach(messageId => {
        const progressCallback = progressCallbacks.get(messageId);
        const deliveredCallback = deliveredCallbacks.get(messageId);

        if (progressCallback) {
          webSocketService.removeFlightProgressCallback(messageId, progressCallback);
        }
        if (deliveredCallback) {
          webSocketService.removeFlightDeliveredCallback(messageId, deliveredCallback);
        }

        webSocketService.unsubscribeFromFlight(messageId);
      });

      webSocketService.removeErrorCallback(handleError);
    };
  }, [messageIds.join(','), userId]); // Use join to create stable dependency

  // Convert Map to object for easier consumption
  const progressObject = Object.fromEntries(flightProgress);
  const errorsObject = Object.fromEntries(errors);

  return {
    flightProgress: progressObject,
    deliveredFlights: Array.from(deliveredFlights),
    errors: errorsObject,
    totalFlights: messageIds.length,
    activeFlights: messageIds.length - deliveredFlights.size
  };
}

/**
 * Hook for WebSocket connection status with automatic reconnection
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      if (connected) {
        setStatus('connected');
        setLastError(null);
        setReconnectAttempts(0);
      } else {
        setStatus('disconnected');
      }
    };

    const handleError = (error: string) => {
      setStatus('error');
      setLastError(error);
      setReconnectAttempts(prev => prev + 1);
    };

    webSocketService.onConnectionChange(handleConnectionChange);
    webSocketService.onError(handleError);

    // Set initial status
    setStatus(webSocketService.isConnected() ? 'connected' : 'disconnected');

    return () => {
      webSocketService.removeConnectionCallback(handleConnectionChange);
      webSocketService.removeErrorCallback(handleError);
    };
  }, []);

  const reconnect = useCallback(() => {
    setStatus('connecting');
    setLastError(null);
    webSocketService.connect();
  }, []);

  return {
    status,
    lastError,
    reconnectAttempts,
    reconnect,
    isConnected: status === 'connected'
  };
}