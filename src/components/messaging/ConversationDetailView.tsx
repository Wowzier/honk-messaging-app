'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HonkMessage, Conversation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Reply, User, MapPin, Clock, Award } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface ConversationWithDetails extends Conversation {
  other_participant_id: string;
  other_participant_username: string;
  other_participant_rank?: string;
}

interface ConversationDetailResponse {
  conversation: ConversationWithDetails;
  messages: (HonkMessage & { sender_username?: string; sender_rank?: string })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ConversationDetailViewProps {
  conversation: ConversationWithDetails;
  onBack: () => void;
  onReply: (message: HonkMessage) => void;
}

export function ConversationDetailView({ 
  conversation, 
  onBack, 
  onReply 
}: ConversationDetailViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(HonkMessage & { sender_username?: string; sender_rank?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchMessages = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      const response = await fetch(`/api/conversations/${conversation.id}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation messages');
      }

      const data: ConversationDetailResponse = await response.json();
      
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]); // Prepend older messages
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchMessages(pagination.page + 1);
    }
  };

  const getStatusBadge = (message: HonkMessage) => {
    if (message.status === 'flying') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
          🦆 Flying
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
        ✅ Delivered
      </Badge>
    );
  };

  const renderLocationInfo = (location: any) => {
    if (!location || location.is_anonymous) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>Anonymous</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <MapPin className="h-3 w-3" />
        <span>
          {location.state && location.country 
            ? `${location.state}, ${location.country}`
            : location.country || 'Unknown'
          }
        </span>
      </div>
    );
  };

  const renderMessage = (message: HonkMessage & { sender_username?: string; sender_rank?: string }) => {
    const isFromCurrentUser = message.sender_id === user?.id;
    const canReply = !isFromCurrentUser && message.status === 'delivered';

    return (
      <Card 
        key={message.id} 
        className={`${isFromCurrentUser ? 'ml-8 bg-blue-50 border-blue-200' : 'mr-8'}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-sm">
                  {isFromCurrentUser ? 'You' : (message.sender_username || 'Anonymous')}
                </span>
                {message.sender_rank && (
                  <Badge variant="outline" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    {message.sender_rank}
                  </Badge>
                )}
                {getStatusBadge(message)}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {renderLocationInfo(message.sender_location)}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(message.created_at)} ago</span>
                </div>
              </div>
            </div>
            
            {canReply && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {message.title}
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          
          {message.journey_data && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>🛫 {Math.round(message.journey_data.total_distance)}km</span>
                <span>⭐ {message.journey_data.journey_points_earned} points</span>
                <span>📊 {Math.round(message.journey_data.current_progress)}% complete</span>
              </div>
            </div>
          )}
          
          {message.delivered_at && (
            <div className="mt-3 text-xs text-green-600">
              ✅ Delivered {format(message.delivered_at, 'PPP')} at {format(message.delivered_at, 'p')}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Conversation with {conversation.other_participant_username}
          </h1>
          <p className="text-gray-600">
            {pagination.total} message{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>❌</span>
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchMessages(1)}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && messages.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading messages...</span>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {/* Load More Button (for older messages) */}
          {pagination.hasNext && (
            <div className="flex justify-center pb-4">
              <Button 
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load Older Messages (${pagination.total - messages.length} remaining)`
                )}
              </Button>
            </div>
          )}

          {/* Messages List */}
          {messages.map(renderMessage)}
        </div>
      )}

      {/* Empty State */}
      {!loading && messages.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No messages in this conversation
            </h3>
            <p className="text-gray-600">
              This conversation appears to be empty.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}