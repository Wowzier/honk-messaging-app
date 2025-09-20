'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComposeHonk } from './ComposeHonk';
import { FlightTracker } from './FlightTracker';
import { WeatherDisplay } from './WeatherDisplay';
import { LocationData } from '@/types';

interface DemoMessagingFlowProps {
  className?: string;
}

interface ActiveMessage {
  id: string;
  title: string;
  content: string;
  startLocation: LocationData;
  endLocation: LocationData;
}

const DEMO_DESTINATIONS = [
  {
    latitude: 51.5074,
    longitude: -0.1278,
    state: 'London',
    country: 'United Kingdom',
    is_anonymous: false
  },
  {
    latitude: 35.6762,
    longitude: 139.6503,
    state: 'Tokyo',
    country: 'Japan',
    is_anonymous: false
  },
  {
    latitude: -33.8688,
    longitude: 151.2093,
    state: 'New South Wales',
    country: 'Australia',
    is_anonymous: false
  },
  {
    latitude: 48.8566,
    longitude: 2.3522,
    state: 'Île-de-France',
    country: 'France',
    is_anonymous: false
  },
  {
    latitude: -22.9068,
    longitude: -43.1729,
    state: 'Rio de Janeiro',
    country: 'Brazil',
    is_anonymous: false
  }
];

const DEFAULT_USER_LOCATION: LocationData = {
  latitude: 40.7128,
  longitude: -74.0060,
  state: 'New York',
  country: 'United States',
  is_anonymous: false
};

export function DemoMessagingFlow({ className = '' }: DemoMessagingFlowProps) {
  const [currentStep, setCurrentStep] = useState<'compose' | 'tracking'>('compose');
  const [activeMessage, setActiveMessage] = useState<ActiveMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation] = useState<LocationData>(DEFAULT_USER_LOCATION);

  // Handle message sending
  const handleSendMessage = useCallback(async (messageData: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Apply location sharing preferences
      const senderLocation: LocationData = {
        ...userLocation,
        is_anonymous: messageData.locationSharing === 'anonymous',
        state: messageData.locationSharing === 'anonymous' ? undefined : userLocation.state,
        country: messageData.locationSharing === 'anonymous' ? undefined : 
                 messageData.locationSharing === 'country' ? userLocation.country : userLocation.country
      };

      // Select random destination
      const recipient = DEMO_DESTINATIONS[Math.floor(Math.random() * DEMO_DESTINATIONS.length)];

      // Create message ID
      const messageId = `demo_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the active message
      const newMessage: ActiveMessage = {
        id: messageId,
        title: messageData.title,
        content: messageData.content,
        startLocation: senderLocation,
        endLocation: recipient
      };

      setActiveMessage(newMessage);

      // Simulate a brief delay for realism
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Switch to tracking view
      setCurrentStep('tracking');

    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  // Handle starting a new message
  const handleNewMessage = useCallback(() => {
    setActiveMessage(null);
    setCurrentStep('compose');
    setError(null);
  }, []);

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold">
            🦆 Honk! Messaging Demo
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Experience duck courier messaging with real-time weather effects
          </p>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Message Compose/Tracking */}
        <div className="space-y-4">
          {currentStep === 'compose' ? (
            <ComposeHonk
              onSend={handleSendMessage}
              isLoading={isLoading}
            />
          ) : (
            <div className="space-y-4">
              {/* Message Info */}
              {activeMessage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📨 Your Honk is Flying!</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="font-semibold">{activeMessage.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {activeMessage.content}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">From</div>
                        <div className="font-medium">
                          {activeMessage.startLocation.state || 'Anonymous'}, {' '}
                          {activeMessage.startLocation.country || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">To</div>
                        <div className="font-medium">
                          {activeMessage.endLocation.state || 'Anonymous'}, {' '}
                          {activeMessage.endLocation.country || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleNewMessage}
                      variant="outline"
                      className="w-full"
                    >
                      Send Another Honk
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Flight Tracker */}
              {activeMessage && (
                <FlightTracker
                  messageId={activeMessage.id}
                  startLocation={activeMessage.startLocation}
                  endLocation={activeMessage.endLocation}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column - Weather and Info */}
        <div className="space-y-4">
          {/* Weather Display */}
          <WeatherDisplay location={userLocation} />

          {/* Instructions/Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span>1️⃣</span>
                <div>
                  <div className="font-medium">Write Your Honk</div>
                  <div className="text-muted-foreground">
                    Compose a message up to 280 characters with a catchy title
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span>2️⃣</span>
                <div>
                  <div className="font-medium">Duck Takes Flight</div>
                  <div className="text-muted-foreground">
                    Your message is assigned to a duck courier who flies it to a random recipient
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span>3️⃣</span>
                <div>
                  <div className="font-medium">Weather Affects Journey</div>
                  <div className="text-muted-foreground">
                    Rain, storms, and wind change flight speed and may trigger route changes
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span>4️⃣</span>
                <div>
                  <div className="font-medium">Earn Journey Points</div>
                  <div className="text-muted-foreground">
                    Get 1 point per km traveled, plus bonuses for weather and distance
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Mode Notice */}
          <Alert>
            <AlertDescription>
              🚧 Demo Mode: This demonstrates the Honk! messaging system with simulated flights. 
              The flight tracker shows real weather effects and route calculations!
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}