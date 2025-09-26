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
    <>
      {/* White background like home page */}
      <div className="fixed inset-0 bg-white"></div>
      
      {/* Subtle floating elements for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gray-100/50 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-96 h-96 bg-blue-50/30 rounded-full blur-2xl animate-float-delayed"></div>
        <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-purple-50/20 rounded-full blur-xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-pink-50/20 rounded-full blur-xl animate-float-delayed"></div>
      </div>

      <div className="relative h-screen w-full">
        {/* Header with search and status */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Title */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center border border-gray-200 shadow-lg">
                  <span className="text-2xl">📬</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Your Inbox</h1>
                  <p className="text-gray-600 text-sm">
                    {messages.length > 0 ? `${messages.length} postcards` : 'No postcards yet'}
                  </p>
                </div>
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search postcards..."
                    className="w-full px-6 py-3 bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:bg-white shadow-lg transition-all duration-300"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>

              {/* Right: Status and refresh */}
              <div className="flex items-center gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'flying' | 'delivered' })}
                  className="px-4 py-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-blue-400 focus:bg-white shadow-lg transition-all duration-300"
                >
                  <option value="all" className="bg-white text-gray-800">📮 All Postcards</option>
                  <option value="flying" className="bg-white text-gray-800">✈️ Flying</option>
                  <option value="delivered" className="bg-white text-gray-800">📬 Delivered</option>
                </select>
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl text-gray-800 hover:bg-white hover:border-blue-400 shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshing ? '🔄' : '↻'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-red-200">
              <div className="flex items-center gap-3 text-red-600">
                <span className="text-xl">❌</span>
                <span className="text-lg">{error}</span>
                <button 
                  onClick={() => fetchMessages(1)}
                  className="ml-auto bg-red-100 hover:bg-red-200 border border-red-300 rounded-xl px-4 py-2 text-sm transition-all"
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
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-2xl border border-gray-200">
              <div className="text-8xl mb-6 animate-bounce">📬</div>
              <span className="text-gray-800 text-2xl font-semibold">
                Loading your postcards...
              </span>
            </div>
          </div>
        )}

        {/* Main Gallery - Full Screen with improved scrolling */}
        <div className="h-full pt-24 pb-6">
          <div className="h-full overflow-hidden">
            <PostcardGallery
              messages={messages}
              onMessageClick={handleMessageClick}
              searchQuery={filters.search}
              bend={3}
              textColor="#2c3e50"
              borderRadius={0.05}
              scrollSpeed={1.2}
              scrollEase={0.08}
            />
          </div>
        </div>

        {/* Refreshing Indicator */}
        {refreshing && messages.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-white/90 backdrop-blur-md border border-gray-200 text-gray-800 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-20">
            <div className="animate-spin text-xl">🔄</div>
            <span className="text-lg font-medium">Refreshing...</span>
          </div>
        )}
      </div>

      {/* Style definitions */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(15px) translateX(-15px); }
          66% { transform: translateY(-10px) translateX(15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        .animate-gradient-shift {
          background-size: 400% 400%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}