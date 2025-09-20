'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HonkMessage, Conversation } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, MessageSquare, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface ConversationWithDetails extends Conversation {
  other_participant_id: string;
  other_participant_username: string;
  latest_message: (HonkMessage & { sender_username?: string }) | null;
  message_count: number;
}

interface ConversationsResponse {
  conversations: ConversationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ConversationsListProps {
  onConversationSelect: (conversation: ConversationWithDetails) => void;
}

export function ConversationsList({ onConversationSelect }: ConversationsListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchConversations = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/conversations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data: ConversationsResponse = await response.json();
      
      if (page === 1) {
        setConversations(data.conversations);
      } else {
        setConversations(prev => [...prev, ...data.conversations]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations(1);
  }, [fetchConversations]);

  const handleRefresh = () => {
    fetchConversations(1, true);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchConversations(pagination.page + 1);
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Conversations</h1>
            <p className="text-gray-600">Your message threads</p>
          </div>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
                onClick={() => fetchConversations(1)}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && conversations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading conversations...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && conversations.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-600">
              Start a conversation by replying to a message in your inbox.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      {conversations.length > 0 && (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onConversationSelect(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Participant Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {conversation.other_participant_username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Latest Message Preview */}
                    {conversation.latest_message && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {conversation.latest_message.title}
                          </span>
                          {getStatusBadge(conversation.latest_message)}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {conversation.latest_message.content}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(conversation.latest_message.created_at)} ago
                          </span>
                          <span>•</span>
                          <span>
                            From: {conversation.latest_message.sender_username || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last Activity */}
                  <div className="text-xs text-gray-500 text-right">
                    <div>Last activity</div>
                    <div>{formatDistanceToNow(conversation.last_message_at)} ago</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More Button */}
          {pagination.hasNext && (
            <div className="flex justify-center pt-6">
              <Button 
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${pagination.total - conversations.length} remaining)`
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Refreshing Indicator */}
      {refreshing && conversations.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Refreshing...</span>
        </div>
      )}
    </div>
  );
}