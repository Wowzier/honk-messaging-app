'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComposeHonk } from './ComposeHonk';
import { FlightTracker } from './FlightTracker';
import { WeatherDisplay } from './WeatherDisplay';
// Remove direct service imports to avoid client-side database issues
// import { flightEngine } from '@/services/flightEngine';
// import { geolocationService } from '@/services/geolocation';
import { LocationData, FlightProgress } from '@/types';

interface MessagingFlowProps {
  currentUser?: {
    id: string;
    username: string;
    location?: LocationData;
  };
  className?: string;
}

interface ActiveMessage {
  id: string;
  title: string;
  content: string;
  startLocation: LocationData;
  endLocation: LocationData;
  flightProgress?: FlightProgress;
}

export function MessagingFlow({ currentUser, className = '' }: MessagingFlowProps) {
  const [currentStep, setCurrentStep] = useState<'compose' | 'tracking'>('compose');
  const [activeMessage, setActiveMessage] = useState<ActiveMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(currentUser?.location || null);

  // Get user location if not provided
  const getUserLocation = useCallback(async (): Promise<LocationData | null> => {
    if (userLocation) return userLocation;

    try {
      // Try to get browser geolocation first
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          });
        });
        
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          state: 'Current Location',
          country: 'Unknown',
          is_anonymous: false
        };
        setUserLocation(location);
        return location;
      }
    } catch (error) {
      console.log('Browser geolocation not available or denied');
    }

    // Fallback to a default location (New York)
    const fallbackLocation: LocationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    };
    setUserLocation(fallbackLocation);
    return fallbackLocation;
  }, [userLocation]);

  // Handle message sending
  const handleSendMessage = useCallback(async (messageData: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user location
      const startLocation = await getUserLocation();
      if (!startLocation) {
        throw new Error('Unable to determine your location');
      }

      // Apply location sharing preferences
      const senderLocation: LocationData = {
        ...startLocation,
        is_anonymous: messageData.locationSharing === 'anonymous',
        state: messageData.locationSharing === 'anonymous' ? undefined : startLocation.state,
        country: messageData.locationSharing === 'anonymous' ? undefined : 
                 messageData.locationSharing === 'country' ? startLocation.country : startLocation.country
      };

      // For demo purposes, use a random destination
      const demoDestinations = [
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
      
      const recipient = demoDestinations[Math.floor(Math.random() * demoDestinations.length)];

      // Create message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the active message
      const newMessage: ActiveMessage = {
        id: messageId,
        title: messageData.title,
        content: messageData.content,
        startLocation: senderLocation,
        endLocation: recipient
      };

      setActiveMessage(newMessage);

      // Initialize flight via API (avoiding client-side database issues)
      const response = await fetch('/api/flights/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          startLocation: senderLocation,
          endLocation: recipient
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize duck flight');
      }

      const flight = await response.json();

      // Update active message with recipient
      setActiveMessage(prev => prev ? { ...prev, endLocation: recipient } : null);

      // For demo purposes, simulate flight progress
      // In a real app, this would use WebSocket or polling
      setTimeout(() => {
        setActiveMessage(prev => prev ? { 
          ...prev, 
          flightProgress: {
            message_id: messageId,
            current_position: senderLocation,
            progress_percentage: 25,
            estimated_arrival: new Date(Date.now() + 30000)
          }
        } : null);
      }, 2000);

      // Switch to tracking view
      setCurrentStep('tracking');

    } catch (error) {
      console.error('Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [getUserLocation]);

  // Handle starting a new message
  const handleNewMessage = useCallback(() => {
    if (activeMessage) {
      // Cancel current flight via API
      fetch(`/api/flights/${activeMessage.id}/cancel`, { method: 'POST' })
        .catch(console.error);
    }
    
    setActiveMessage(null);
    setCurrentStep('compose');
    setError(null);
  }, [activeMessage]);

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold">
            🦆 Honk! Messaging
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Send messages across the world with duck couriers
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
          <WeatherDisplay location={userLocation || undefined} />

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
          {!currentUser && (
            <Alert>
              <AlertDescription>
                🚧 Demo Mode: This is a demonstration of the Honk! messaging system.
                In the live experience, every visitor receives a courier ID automatically so they can send real messages right away.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}