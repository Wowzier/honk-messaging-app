'use client';

import React from 'react';
import { HonkMessage } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface InboxMessageProps {
  message: HonkMessage & { sender_username?: string };
  onClick: (message: HonkMessage) => void;
}

export function InboxMessage({ message, onClick }: InboxMessageProps) {
  const handleClick = () => {
    onClick(message);
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

  const getJourneyInfo = () => {
    if (message.journey_data) {
      const distance = Math.round(message.journey_data.total_distance);
      const points = message.journey_data.journey_points_earned || 0;
      return `${distance}km • ${points} points`;
    }
    return null;
  };

  const getTimeDisplay = () => {
    if (message.status === 'delivered' && message.delivered_at) {
      return `Delivered ${formatDistanceToNow(message.delivered_at)} ago`;
    }
    return `Sent ${formatDistanceToNow(message.created_at)} ago`;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {message.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              From: {message.sender_username || 'Anonymous'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            {getStatusBadge()}
            <span className="text-xs text-gray-500">
              {getTimeDisplay()}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-gray-700 line-clamp-2 mb-3">
          {message.content}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            {getJourneyInfo() && (
              <span className="flex items-center gap-1">
                🗺️ {getJourneyInfo()}
              </span>
            )}
            
            {message.sender_location && !message.sender_location.is_anonymous && (
              <span className="flex items-center gap-1">
                📍 {message.sender_location.state || message.sender_location.country}
              </span>
            )}
          </div>
          
          {message.status === 'flying' && message.journey_data && (
            <span className="text-blue-600 font-medium">
              {Math.round(message.journey_data.current_progress)}% complete
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}