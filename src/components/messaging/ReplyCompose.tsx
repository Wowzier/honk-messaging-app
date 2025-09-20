'use client';

import React, { useState } from 'react';
import { HonkMessage } from '@/types';
import { ComposeHonk } from './ComposeHonk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Reply, MapPin, User } from 'lucide-react';

interface ReplyComposeProps {
  originalMessage: HonkMessage & { sender_username?: string; sender_rank?: string };
  onSend: (replyData: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
    recipient_id: string;
    reply_to_message_id: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReplyCompose({ 
  originalMessage, 
  onSend, 
  onCancel, 
  isLoading = false 
}: ReplyComposeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async (messageData: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
  }) => {
    setIsSubmitting(true);
    try {
      await onSend({
        ...messageData,
        recipient_id: originalMessage.sender_id,
        reply_to_message_id: originalMessage.id
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLocationInfo = () => {
    const senderLocation = originalMessage.sender_location;
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Reply className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Reply to Honk</h1>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Original Message Preview */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Original Message</CardTitle>
            <Badge variant="outline" className="text-xs">
              Replying to
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span className="font-medium">From:</span>
            <span>{originalMessage.sender_username || 'Anonymous'}</span>
            {originalMessage.sender_rank && (
              <Badge variant="outline" className="text-xs">
                {originalMessage.sender_rank}
              </Badge>
            )}
          </div>
          
          {renderLocationInfo()}
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              {originalMessage.title}
            </h4>
            <p className="text-gray-700 text-sm line-clamp-3">
              {originalMessage.content}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Reply Compose Form */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Reply</h2>
        <ComposeHonk
          onSend={handleSend}
          characterLimit={280}
          titleLimit={100}
          isLoading={isLoading || isSubmitting}
        />
      </div>
    </div>
  );
}