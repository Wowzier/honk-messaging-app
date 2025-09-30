'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { HonkMessage } from '@/types';
import { MacWindow } from '@/components/MacWindow';
import { MessageDetailView } from '@/components/messaging/MessageDetailView';
import PostcardGallery from '@/components/PostcardGallery';
import ParallaxCanvas from '@/components/ParallaxCanvas';

interface InboxFilters {
  status?: 'delivered' | 'flying' | 'all';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

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
  const router = useRouter();
  const [messages, setMessages] = useState<(HonkMessage & { sender_username?: string })[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<(HonkMessage & { sender_username?: string }) | null>(null);

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

  // Forest parallax layers (same as postcard)
  const PARALLAX_LAYERS = useMemo(() => [
    { src: "/forest/background1/Plan-5.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
    { src: "/forest/background1/Plan-4.png", speed: 0.3, yOffset: 0, alt: "Layer 4" },
    { src: "/forest/background1/Plan-3.png", speed: 0.5, yOffset: 0, alt: "Layer 3" },
    { src: "/forest/background1/Plan-2.png", speed: 0.7, yOffset: 0, alt: "Layer 2" },
    { src: "/forest/background1/Plan-1.png", speed: 0.9, yOffset: 0, alt: "Layer 1" },
  ], []);

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
      });

      if (filters.sortBy) {
        params.append('sortBy', filters.sortBy);
      }
      
      if (filters.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }

      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }

      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }

      const token = Cookies.get('honk_auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/messages/inbox?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
      // Mark as read if it's a delivered message to current user
      if (message.recipient_id === user?.id && message.status === 'delivered') {
        const token = Cookies.get('honk_auth_token');
        if (token) {
          await fetch(`/api/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'mark_read' }),
          });
        }
      }
      
      // Go directly to reply
      handleReply(message);
    } catch (error) {
      console.error('Error handling message click:', error);
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
    <div className="h-screen w-screen fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
      {/* Parallax Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <ParallaxCanvas
          layers={PARALLAX_LAYERS}
          initialSpeed={1}
          fullScreen={true}
        />
        {/* Transparent texture overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 2px),
              radial-gradient(circle, rgba(255,255,255,0.2) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '20px 20px, 30px 30px',
            backgroundPosition: '0 0, 10px 10px',
            opacity: 0.35,
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative h-full w-full flex flex-col items-center justify-center p-4 pointer-events-auto" style={{ zIndex: 1 }}>
        <div className="w-full max-w-6xl h-full max-h-[900px] bg-journal-paper/95 backdrop-blur-sm rounded-3xl border-4 border-journal-accent/30 shadow-2xl p-6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-journal-accent/10">
            <h1 className="text-3xl font-bold text-journal-accent flex items-center gap-3">
              <span className="text-4xl">📬</span>
              <span>Your Postcards</span>
            </h1>
            <button
              onClick={() => router.push('/postcard')}
              className="px-6 py-3 bg-journal-accent hover:bg-journal-accent/90 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <span className="text-xl">✉️</span>
              <span>New Postcard</span>
            </button>
          </div>
            
            {/* Filters/Search Bar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search postcards..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-journal-accent/20 rounded-2xl focus:border-journal-accent focus:outline-none bg-white shadow-sm transition-all"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'flying' | 'delivered' })}
                className="px-5 py-3 border-2 border-journal-accent/20 rounded-2xl focus:border-journal-accent focus:outline-none bg-white font-medium shadow-sm transition-all cursor-pointer"
              >
                <option value="all">📮 All Mail</option>
                <option value="flying">✈️ In Transit</option>
                <option value="delivered">📬 Delivered</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-5 py-3 bg-white hover:bg-gray-50 border-2 border-journal-accent/20 rounded-2xl font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh"
              >
                <span className={`text-xl ${refreshing ? 'animate-spin inline-block' : ''}`}>
                  {refreshing ? '🔄' : '↻'}
                </span>
              </button>
            </div>

            {/* Main Gallery Area */}
            <div className="flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/40 to-white/20">
              {/* Error State */}
              {error && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 px-8 py-5 bg-white border-3 border-red-400 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-4 text-red-600">
                    <span className="text-3xl">❌</span>
                    <span className="font-semibold text-lg">{error}</span>
                    <button 
                      onClick={() => fetchMessages(1)}
                      className="ml-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && messages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="px-12 py-10 bg-white/95 backdrop-blur-md border-3 border-journal-accent/30 rounded-3xl text-center shadow-2xl">
                    <div className="text-7xl mb-6 animate-bounce">📬</div>
                    <div className="text-2xl font-bold text-journal-accent mb-3">
                      Loading your postcards...
                    </div>
                    <div className="text-base text-gray-500">
                      Please wait while we fetch your mail
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && messages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="text-8xl mb-6">📮</div>
                    <h2 className="text-3xl font-bold text-gray-700 mb-4">
                      Your mailbox is empty!
                    </h2>
                    <p className="text-gray-500 mb-8 text-lg">
                      Send your first postcard to friends and start collecting memories!
                    </p>
                    <button
                      onClick={() => router.push('/postcard')}
                      className="px-8 py-4 bg-journal-accent hover:bg-journal-accent/90 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3 mx-auto"
                    >
                      <span className="text-2xl">✉️</span>
                      <span>Create Your First Postcard</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery */}
              <PostcardGallery
                messages={messages}
                onMessageClick={handleMessageClick}
                searchQuery={filters.search}
                bend={2}
                textColor="#000000"
                borderRadius={0.02}
                scrollSpeed={1.2}
                scrollEase={0.08}
              />
            </div>

            {/* Status Bar */}
            <div className="mt-6 pt-5 border-t-2 border-journal-accent/10 flex justify-between items-center">
              <div className="flex gap-6 text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span>{messages.filter(m => m.status === 'delivered').length} delivered</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-lg">✈️</span>
                  <span>{messages.filter(m => m.status === 'flying').length} in transit</span>
                </span>
                {filters.search && (
                  <span className="flex items-center gap-2 text-journal-accent">
                    <span className="text-lg">🔍</span>
                    <span>Searching: "{filters.search}"</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                {refreshing ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <span>Click to read • Scroll to browse</span>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}