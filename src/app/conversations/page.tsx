'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ConversationsList } from '@/components/messaging/ConversationsList';
import { ConversationDetailView } from '@/components/messaging/ConversationDetailView';
import { HonkMessage, Conversation } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ConversationWithDetails extends Conversation {
  other_participant_id: string;
  other_participant_username: string;
  other_participant_rank?: string;
  latest_message: (HonkMessage & { sender_username?: string }) | null;
  message_count: number;
}

export default function ConversationsPage() {
  const { user, loading } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);

  const handleConversationSelect = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleReply = (message: HonkMessage) => {
    // Navigate to reply page with message context
    const replyParams = new URLSearchParams({
      reply_to: message.id,
      recipient_id: message.sender_id,
    });
    window.location.href = `/reply?${replyParams}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.username ?? 'Courier';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        {!selectedConversation && (
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Main
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {displayName}!</span>
              <Link href="/inbox">
                <Button variant="outline">Inbox</Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main>
          {!user && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900">
              We&apos;re still assigning your courier ID. Feel free to browse—messages will sync automatically once your token is ready.
            </div>
          )}
          {selectedConversation ? (
            <ConversationDetailView
              conversation={selectedConversation}
              onBack={handleBack}
              onReply={handleReply}
            />
          ) : (
            <ConversationsList onConversationSelect={handleConversationSelect} />
          )}
        </main>
      </div>
    </div>
  );
}