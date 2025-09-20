'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ReplyCompose } from '@/components/messaging/ReplyCompose';
import { HonkMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

function ReplyPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading reply...</p>
      </div>
    </div>
  );
}

function ReplyPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [originalMessage, setOriginalMessage] = useState<
    (HonkMessage & { sender_username?: string; sender_rank?: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const replyToId = searchParams.get('reply_to');
  const recipientId = searchParams.get('recipient_id');

  useEffect(() => {
    if (!replyToId || !user) return;

    const fetchOriginalMessage = async () => {
      try {
        const response = await fetch(`/api/messages/${replyToId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch original message');
        }

        const data = await response.json();
        setOriginalMessage(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load message');
      } finally {
        setLoading(false);
      }
    };

    fetchOriginalMessage();
  }, [replyToId, user]);

  const handleSendReply = async (replyData: {
    title: string;
    content: string;
    locationSharing: 'state' | 'country' | 'anonymous';
    recipient_id: string;
    reply_to_message_id: string;
  }) => {
    setSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(replyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      // Redirect to inbox on success
      window.location.href = '/inbox';
    } catch (err) {
      console.error('Failed to send reply:', err);
      throw err; // Let the ReplyCompose component handle the error display
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to reply
          </h1>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!replyToId || !recipientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Reply Link
            </h2>
            <p className="text-gray-600 mb-4">
              The reply link is missing required information.
            </p>
            <Link href="/inbox">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Link href="/inbox">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inbox
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!originalMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Message Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The original message could not be found.
            </p>
            <Link href="/inbox">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inbox
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <ReplyCompose
          originalMessage={originalMessage}
          onSend={handleSendReply}
          onCancel={handleCancel}
          isLoading={sending}
        />
      </div>
    </div>
  );
}

export default function ReplyPage() {
  return (
    <Suspense fallback={<ReplyPageFallback />}>
      <ReplyPageContent />
    </Suspense>
  );
}

