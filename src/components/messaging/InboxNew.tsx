'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HonkMessage } from '@/types';
import { MessageDetailView } from './MessageDetailView';
import { Loader2, RefreshCw, Inbox as InboxIcon, MessageSquare, PlusCircle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import ParallaxCanvas from '@/components/ParallaxCanvas';

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

// Define layers outside component to prevent re-creation
const PARALLAX_LAYERS = [
  { src: "/nature_5/sky.png", speed: 0.2, yOffset: 0, alt: "Sky", scaleToFit: true },
  { src: "/nature_5/clouds.png", speed: 0.4, yOffset: 10, alt: "Clouds" },
  { src: "/nature_5/grass.png", speed: 0.3, yOffset: -20, alt: "Grass" },
];

export function InboxNew() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<(HonkMessage & { sender_username?: string })[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<(HonkMessage & { sender_username?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
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
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

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
      
      handleReply(message);
    } catch (error) {
      console.error('Error handling message click:', error);
    }
  };

  const handleReply = (message: HonkMessage) => {
    const replyParams = new URLSearchParams({
      reply_to: message.id,
      recipient_id: message.sender_id,
    });
    window.location.href = `/reply?${replyParams}`;
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
    <div className="h-screen w-screen fixed inset-0 overflow-hidden">
      {/* Parallax Background */}
      <ParallaxCanvas
        layers={PARALLAX_LAYERS}
        initialSpeed={1}
        fullScreen={true}
      />

      {/* Main content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-4">
        {/* Top header */}
        <div className="flex items-center justify-between w-full max-w-6xl mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-journal-paper/90 backdrop-blur-sm px-6 py-3 rounded-full border-4 border-white shadow-lg">
              <h1 className="text-3xl font-bold text-journal-highlight flex items-center gap-2">
                <InboxIcon className="w-8 h-8" />
                Postcard Mailbox
              </h1>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-journal-button-light text-journal-button px-4 py-3 rounded-full border-3 border-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={() => router.push('/postcard')}
            className="bg-journal-accent text-journal-accent-foreground px-6 py-3 rounded-full border-3 border-white shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-bold text-lg">New Postcard</span>
          </button>
        </div>

        {/* Messages container */}
        <div className="w-full max-w-6xl h-[calc(100vh-200px)] p-6 shadow-2xl bg-chart-2/80 backdrop-blur-sm rounded-4xl border-4 overflow-hidden">
          <div className="bg-journal-paper h-full rounded-lg shadow-inner overflow-y-auto p-6">
            {/* Search bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-journal-button" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search postcards..."
                  className="w-full pl-12 pr-4 py-3 bg-journal-paper-alt border-3 border-journal-accent/30 rounded-full text-lg font-semibold text-primary placeholder:text-journal-button/50 focus:border-journal-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="bg-red-100 border-3 border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-bold">⚠️ {error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-journal-accent animate-spin mb-4" />
                <p className="text-xl font-bold text-journal-highlight">Loading your postcards...</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-16 h-16 text-journal-accent mb-4" />
                <p className="text-2xl font-bold text-journal-highlight mb-2">No postcards yet</p>
                <p className="text-lg text-journal-button">Send your first postcard to get started!</p>
              </div>
            )}

            {/* Messages grid */}
            {messages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className="hover:scale-105 transition-all text-left relative group"
                  >
                    {/* Status badge */}
                    <div className={`absolute top-2 right-2 text-xs px-3 py-1 rounded-full font-bold z-10 ${
                      message.status === 'delivered' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {message.status}
                    </div>

                    {/* Postcard preview - single border design */}
                      <div className="bg-journal-paper rounded-2xl p-4 shadow-xl transition-colors">
                      {/* Message area with white background like in editor - centered text */}
                      <div className="bg-white rounded-lg p-4 min-h-[140px] flex items-center justify-center">
                        {/* Message content - centered */}
                        <div className="text-sm text-primary font-semibold line-clamp-6 text-center w-full" style={{ color: '#666' }}>
                          {message.content || 'No message'}
                        </div>
                      </div>
                    </div>

                    {/* Date footer - outside the postcard */}
                    <div className="flex items-center justify-between text-xs text-journal-button/90 mt-2 px-2">
                      <span className="font-semibold">
                        From: {message.sender_username || 'Unknown'}
                      </span>
                      <span>
                        {new Date(message.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Load more */}
            {pagination.hasNext && !loading && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchMessages(pagination.page + 1)}
                  className="bg-journal-accent text-journal-accent-foreground px-6 py-3 rounded-full border-3 border-white shadow-lg hover:scale-105 transition-transform"
                >
                  <span className="font-bold">Load More</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="w-full max-w-6xl mt-4 bg-journal-paper/90 backdrop-blur-sm px-6 py-3 rounded-full border-3 border-white shadow-lg flex justify-between items-center text-sm text-journal-button font-semibold">
          <div className="flex gap-6">
            <span>📊 {messages.filter(m => m.status === 'delivered').length} delivered</span>
            <span>✈️ {messages.filter(m => m.status === 'flying').length} in transit</span>
            <span>📬 {messages.length} total</span>
          </div>
          {refreshing && <span className="text-journal-accent">🔄 Refreshing...</span>}
        </div>
      </div>
    </div>
  );
}
