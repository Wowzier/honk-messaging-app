'use client';

import React, { useState, useEffect } from 'react';
import { FlightTracker } from '@/components/flight/FlightTracker';
import { useWebSocket, useFlightProgress } from '@/hooks/useWebSocket';
import { flightEngine } from '@/services/flightEngine';
import { notificationService } from '@/services/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Demo component showing WebSocket real-time flight tracking
 */
export function WebSocketDemo() {
  const [messageId, setMessageId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { isConnected, error, reconnect } = useWebSocket('demo-user');

  // Initialize notification service
  useEffect(() => {
    notificationService.initialize('demo-user');
    
    // Listen for notifications
    const handleNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
    };
    
    notificationService.onNotification(handleNotification);
    
    return () => {
      notificationService.removeNotificationCallback(handleNotification);
    };
  }, []);

  // Start a demo flight
  const startDemoFlight = async () => {
    const demoMessageId = `demo_${Date.now()}`;
    
    // Create a demo flight from New York to Los Angeles
    const startLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    };
    
    const endLocation = {
      latitude: 34.0522,
      longitude: -118.2437,
      state: 'California',
      country: 'United States',
      is_anonymous: false
    };

    try {
      // Create demo flight on server
      const response = await fetch('/api/flights/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: demoMessageId,
          startLocation,
          endLocation,
        }),
      });

      if (response.ok) {
        const flightRecord = await response.json();
        setMessageId(demoMessageId);
        
        // Create initial notification using client service
        notificationService.createNotification(
          'demo-user',
          'flight.update',
          'Demo Flight Started! 🦆',
          'Your demo duck has started its journey from New York to Los Angeles!'
        );
      } else {
        throw new Error('Failed to create demo flight');
      }
    } catch (error) {
      console.error('Failed to start demo flight:', error);
    }
  };

  // Stop the current flight
  const stopFlight = () => {
    if (messageId) {
      flightEngine.cancelFlight(messageId);
      setMessageId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Real-Time Flight Tracking Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            
            {error && (
              <Badge variant="destructive">
                Error: {error}
              </Badge>
            )}
            
            {!isConnected && (
              <Button onClick={reconnect} variant="outline" size="sm">
                Reconnect
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={startDemoFlight} 
              disabled={!!messageId || !isConnected}
            >
              Start Demo Flight
            </Button>
            
            <Button 
              onClick={stopFlight} 
              variant="destructive"
              disabled={!messageId}
            >
              Stop Flight
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            This demo shows real-time flight tracking using WebSocket connections. 
            Start a flight to see live progress updates, weather effects, and notifications.
          </p>
        </CardContent>
      </Card>

      {/* Flight Tracker */}
      {messageId && (
        <FlightTracker
          messageId={messageId}
          userId="demo-user"
          onDelivered={(progress) => {
            notificationService.createFlightDeliveredNotification('demo-user', progress);
          }}
        />
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {notification.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.body}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notification.created_at.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div>
              <p className="font-medium">Active Flight</p>
              <p className="text-gray-600">
                {messageId ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="font-medium">Notifications</p>
              <p className="text-gray-600">
                {notifications.length}
              </p>
            </div>
            <div>
              <p className="font-medium">Last Error</p>
              <p className="text-gray-600">
                {error || 'None'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>1. WebSocket Connection:</strong> Establishes real-time connection for live updates
          </p>
          <p>
            <strong>2. Flight Tracking:</strong> Shows live progress, position, and weather conditions
          </p>
          <p>
            <strong>3. Notifications:</strong> Displays real-time notifications for flight events
          </p>
          <p>
            <strong>4. Error Handling:</strong> Automatic reconnection and error recovery
          </p>
          <p>
            <strong>5. Connection Management:</strong> Handles disconnections and reconnections gracefully
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebSocketDemo;