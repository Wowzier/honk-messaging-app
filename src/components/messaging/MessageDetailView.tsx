'use client';

import React, { useState } from 'react';
import { HonkMessage, JourneyData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Reply, MapPin, Clock, Award } from 'lucide-react';

interface MessageDetailViewProps {
  message: HonkMessage & { sender_username?: string; sender_rank?: string };
  onBack: () => void;
  onReply?: (message: HonkMessage) => void;
  currentUserId: string;
}

export function MessageDetailView({ 
  message, 
  onBack, 
  onReply, 
  currentUserId 
}: MessageDetailViewProps) {
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const getStatusBadge = () => {
    if (message.status === 'flying') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          🦆 Flying
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        ✅ Delivered
      </Badge>
    );
  };

  const renderJourneyInfo = () => {
    if (!message.journey_data) return null;

    const journey = message.journey_data;
    const distance = Math.round(journey.total_distance);
    const points = journey.journey_points_earned || 0;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Journey Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{distance}</div>
              <div className="text-sm text-gray-600">Kilometers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{points}</div>
              <div className="text-sm text-gray-600">Journey Points</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(journey.current_progress)}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(journey.estimated_duration / 60)}
              </div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>
          </div>

          {journey.weather_events && journey.weather_events.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Weather Encountered</h4>
              <div className="flex flex-wrap gap-2">
                {journey.weather_events.map((event, index) => (
                  <Badge key={index} variant="outline">
                    {event.type === 'storm' && '⛈️'}
                    {event.type === 'rain' && '🌧️'}
                    {event.type === 'wind' && '💨'}
                    {event.type === 'clear' && '☀️'}
                    {' '}
                    {event.type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {journey.route && journey.route.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Flight Route</h4>
              <div className="text-sm text-gray-600">
                {journey.route.length} waypoints • 
                From {message.sender_location?.state || message.sender_location?.country || 'Unknown'} to{' '}
                {message.recipient_location?.state || message.recipient_location?.country || 'Your location'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLocationInfo = () => {
    const senderLocation = message.sender_location;
    if (!senderLocation || senderLocation.is_anonymous) {
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>Anonymous location</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-600">
        <MapPin className="h-4 w-4" />
        <span>
          {senderLocation.state && senderLocation.country 
            ? `${senderLocation.state}, ${senderLocation.country}`
            : senderLocation.country || 'Unknown location'
          }
        </span>
      </div>
    );
  };

  const canReply = message.recipient_id === currentUserId && message.status === 'delivered';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inbox
        </Button>
        
        <div className="flex-1" />
        
        {getStatusBadge()}
      </div>

      {/* Message Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{message.title}</CardTitle>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">From:</span>
                  <span>{message.sender_username || 'Anonymous'}</span>
                  {message.sender_rank && (
                    <Badge variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      {message.sender_rank}
                    </Badge>
                  )}
                </div>
                
                {renderLocationInfo()}
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Sent {formatDistanceToNow(message.created_at)} ago
                    {message.delivered_at && (
                      <span> • Delivered {formatDistanceToNow(message.delivered_at)} ago</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            {canReply && (
              <Button onClick={handleReply}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            )}
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6">
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          
          {message.delivered_at && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <span className="text-2xl">🎉</span>
                <div>
                  <div className="font-semibold">Message Delivered!</div>
                  <div className="text-sm">
                    Your duck successfully delivered this message on{' '}
                    {format(message.delivered_at, 'PPP')} at{' '}
                    {format(message.delivered_at, 'p')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journey Information */}
      {renderJourneyInfo()}

      {/* Delivery Timestamps */}
      {(message.created_at || message.delivered_at) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Message Sent</div>
                  <div className="text-sm text-gray-600">
                    {format(message.created_at, 'PPP')} at {format(message.created_at, 'p')}
                  </div>
                </div>
              </div>
              
              {message.delivered_at && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium">Message Delivered</div>
                    <div className="text-sm text-gray-600">
                      {format(message.delivered_at, 'PPP')} at {format(message.delivered_at, 'p')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}