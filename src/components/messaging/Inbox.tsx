'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HonkMessage } from '@/types';
import { MessageDetailView } from './MessageDetailView';
import { InboxFiltersComponent, InboxFilters } from './InboxFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, Inbox as InboxIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PostcardGallery from '@/components/PostcardGallery';
import SteampunkSearch from '@/components/SteampunkSearch';

interface InboxResponse {
  messages: (HonkMessage & { sender_username?: string })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(HonkMessage & { sender_username?: string })[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<(HonkMessage & { sender_username?: string; sender_rank?: string }) | null>(null);
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

  const [filters, setFilters] = useState<InboxFilters>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const fetchMessages = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      if (filters.search.trim()) {
        params.append('search', filters.search.trim());
      }

      const response = await fetch(`/api/messages/inbox?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data: InboxResponse = await response.json();
      
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...prev, ...data.messages]);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Fetch messages when filters change
  useEffect(() => {
    fetchMessages(1);
  }, [filters]);

  // Auto-refresh every 30 seconds for flying messages
  useEffect(() => {
    const interval = setInterval(() => {
      const hasFlyingMessages = messages.some(m => m.status === 'flying');
      if (hasFlyingMessages && !loading && !refreshing) {
        fetchMessages(1, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [messages, loading, refreshing, fetchMessages]);

  const handleMessageClick = async (message: HonkMessage) => {
    try {
      // Fetch full message details
      const response = await fetch(`/api/messages/${message.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMessage(data.message);
        
        // Mark as read if it's a delivered message to current user
        if (message.recipient_id === user?.id && message.status === 'delivered') {
          await fetch(`/api/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify({ action: 'mark_read' }),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching message details:', error);
    }
  };

  const handleReply = (message: HonkMessage) => {
    // Navigate to reply page with message context
    const replyParams = new URLSearchParams({
      reply_to: message.id,
      recipient_id: message.sender_id,
    });
    window.location.href = `/reply?${replyParams}`;
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !loading) {
      fetchMessages(pagination.page + 1);
    }
  };

  const handleRefresh = () => {
    fetchMessages(1, true);
  };

  const handleBack = () => {
    setSelectedMessage(null);
  };

  if (selectedMessage) {
    return (
      <MessageDetailView
        message={selectedMessage}
        onBack={handleBack}
        onReply={handleReply}
        currentUserId={user?.id || ''}
      />
    );
  }

  return (
    <div 
      className="h-screen w-full relative"
      style={{
        backgroundImage: "url('/graph-paper-background.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Steampunk Search Bar - Top Center */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <SteampunkSearch
          value={filters.search}
          onChange={(value) => setFilters({ ...filters, search: value })}
          onFilterClick={() => setFilters({ ...filters, status: filters.status === 'all' ? 'flying' : filters.status === 'flying' ? 'delivered' : 'all' })}
          placeholder="Search postcards..."
        />
      </div>

      {/* Status Indicator - Top Right */}
      <div className="absolute top-8 right-8 z-20">
        <div className="flex gap-3">
          <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg border-2 border-amber-600/50 text-amber-200 font-bold">
            {filters.status === 'all' ? '📮 All Postcards' : filters.status === 'flying' ? '✈️ Flying' : '📬 Delivered'}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg border-2 border-amber-600/50 text-amber-200 hover:bg-black/80 transition-all disabled:opacity-50 font-bold"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-red-100/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-red-200/50">
            <div className="flex items-center gap-2 text-red-800">
              <span>❌</span>
              <span>{error}</span>
              <button 
                onClick={() => fetchMessages(1)}
                className="ml-auto bg-red-200 hover:bg-red-300 rounded-full px-3 py-1 text-sm transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && messages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 text-center shadow-2xl border border-white/30">
            <div className="text-6xl mb-4 animate-spin">🦆</div>
            <span className="text-white text-lg font-semibold" style={{ fontFamily: 'cursive, "Comic Sans MS", sans-serif' }}>
              Loading your postcards...
            </span>
          </div>
        </div>
      )}

      {/* Main Gallery - Full Screen */}
      <div className="h-full">
        <PostcardGallery
          messages={messages}
          onMessageClick={handleMessageClick}
          searchQuery={filters.search} // Pass the search query to PostcardGallery
          bend={3}
          textColor="#2c3e50"
          borderRadius={0.05}
          scrollSpeed={2}
          scrollEase={0.05}
        />
      </div>

      {/* Refreshing Indicator */}
      {refreshing && messages.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 z-20 border border-white/30">
          <div className="animate-spin">🦆</div>
          <span style={{ fontFamily: 'cursive, "Comic Sans MS", sans-serif' }}>Refreshing...</span>
        </div>
      )}
    </div>
  );
}