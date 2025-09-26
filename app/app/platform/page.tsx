'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ParallaxCanvas from '@/components/ParallaxCanvas';
import { WeatherDisplay } from '@/components/messaging/WeatherDisplay';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { HonkMessage, LocationData } from '@/types';
import { locationService } from '@/services/locationService';

const CUSTOM_LAYERS = [
  { src: "/nature_5/sky.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
  { src: "/nature_5/clouds.png", speed: 0.4, yOffset: 10, alt: "Clouds" },
  { src: "/nature_5/grass.png", speed: 0.3, yOffset: -20, alt: "Grass" },
  { src: "nature_5/duck.png", speed: 0, yOffset: -345, alt: "Duck", customScale: 0.2, noTile: true, centered: true },
  { src: "/nature_5/grass-and-trees.png", speed: 0.8, yOffset: -60, alt: "Grass and Trees" },
];

export default function PlatformPage() {
  const { user, loading } = useRequireAuth();
  const searchParams = useSearchParams();
  const messageId = searchParams?.get('messageId');
  const [message, setMessage] = useState<HonkMessage | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch message details if messageId is provided
    if (messageId && user) {
      fetchMessageDetails(messageId);
    }
    
    // Get user location with fallback to New York
    const initializeLocation = async () => {
      try {
        const location = await locationService.getCurrentLocationWithFallback();
        setUserLocation(location);
        
        // Update user location in database if user is logged in
        if (user) {
          await locationService.updateUserLocation(user.id, location);
        }
      } catch (error) {
        console.error('Error initializing location:', error);
      }
    };
    
    initializeLocation();
  }, [messageId, user]);

  const fetchMessageDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/messages/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching message details:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect to login
  }

  return (
    <>
      {/* Background parallax with moving duck */}
      <ParallaxCanvas layers={CUSTOM_LAYERS} fullScreen />
      
      {/* Glassmorphism overlay elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-60 right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-purple-400/8 rounded-full blur-xl animate-float-slow"></div>
      </div>

  <div style={{ zIndex: 10 }}>
        {/* Header with message info */}
        {message && (
          <div className="absolute top-8 left-8 right-8 z-20">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl mb-3">🦆✈️</div>
                <h1 className="text-2xl font-bold text-white mb-2">Your Postcard is Flying!</h1>
                <p className="text-white/80 text-lg">"{message.title}"</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                  <span className="text-yellow-300">✈️</span>
                  <span className="text-white font-medium">
                    {message.status === 'flying' ? 'In Flight' : 
                     message.status === 'delivered' ? 'Delivered' : 'Processing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl w-full">
            
            {/* Time and Location */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">🕐</div>
                <h2 className="text-xl font-bold text-white mb-4">Current Time</h2>
                <div className="text-3xl font-mono text-white mb-2">
                  {formatTime(currentTime)}
                </div>
                <div className="text-white/70 text-lg mb-4">
                  {formatDate(currentTime)}
                </div>
                <div className="space-y-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/30">
                    <div className="text-sm text-white/60 mb-1">Timezone</div>
                    <div className="text-white font-medium">{getTimezone()}</div>
                  </div>
                  
                  {/* Location Status */}
                  {userLocation && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/30">
                      <div className="text-sm text-white/60 mb-1">Your Location</div>
                      <div className="text-white font-medium text-sm">
                        {userLocation.state}, {userLocation.country}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {locationService.getLocationSourceDescription(userLocation)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Weather Display */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🌤️</div>
                <h2 className="text-xl font-bold text-white">Flight Weather</h2>
              </div>
              <div className="flex justify-center">
                <WeatherDisplay className="bg-transparent border-none shadow-none" />
              </div>
            </div>

            {/* Flight Progress */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <h2 className="text-xl font-bold text-white mb-6">Flight Status</h2>
                
                {message ? (
                  <div className="space-y-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                      <div className="text-sm text-white/60 mb-2">From</div>
                      <div className="text-white font-medium">
                        {message.sender_location ? 
                          (() => {
                            try {
                              const loc = typeof message.sender_location === 'string' 
                                ? JSON.parse(message.sender_location) 
                                : message.sender_location;
                              return `${loc.state}, ${loc.country}`;
                            } catch {
                              return 'Unknown Location';
                            }
                          })() :
                          'Unknown Location'
                        }
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="text-2xl animate-bounce">✈️</div>
                    </div>
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                      <div className="text-sm text-white/60 mb-2">To</div>
                      <div className="text-white font-medium">
                        {message.recipient_location ? 
                          (() => {
                            try {
                              const loc = typeof message.recipient_location === 'string' 
                                ? JSON.parse(message.recipient_location) 
                                : message.recipient_location;
                              return `${loc.state}, ${loc.country}`;
                            } catch {
                              return 'Unknown Location';
                            }
                          })() :
                          'Unknown Location'
                        }
                      </div>
                    </div>

                    <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                      <div className="text-sm text-white/60 mb-2">Status</div>
                      <div className="text-white font-medium capitalize">
                        {message.status}
                      </div>
                      {message.created_at && (
                        <div className="text-xs text-white/50 mt-2">
                          Sent {new Date(message.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-white/70 mb-4">Welcome to the Flight Platform!</div>
                    <div className="text-sm text-white/50">Send a postcard to see flight tracking here</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-4">
            <a
              href="/postcard"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              Send Another Postcard
            </a>
            <a
              href="/inbox"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            >
              View Inbox
            </a>
          </div>
        </div>
      </div>

      {/* Style definitions */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-15px) translateX(8px); }
          66% { transform: translateY(8px) translateX(-8px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(12px) translateX(-12px); }
          66% { transform: translateY(-8px) translateX(12px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-12px) translateX(4px); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
