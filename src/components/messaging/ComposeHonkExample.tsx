'use client';

import React, { useMemo } from 'react';
import Cookies from 'js-cookie';
import { ComposeHonk } from './ComposeHonk';

/**
 * Example usage of the ComposeHonk component
 * This demonstrates how to integrate the component with a message sending service
 */
export function ComposeHonkExample() {
    const authToken = useMemo(() => {
        const tokenFromCookie = typeof document !== 'undefined' ? Cookies.get('honk_auth_token') : undefined;
        if (tokenFromCookie && tokenFromCookie.trim()) {
            return tokenFromCookie;
        }

        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('auth_token');
            if (stored && stored.trim()) {
                return stored;
            }
        }

        return null;
    }, []);

    const handleSendMessage = async (messageData: {
        title: string;
        content: string;
        locationSharing: 'state' | 'country' | 'anonymous';
    }) => {
        try {
            if (!authToken) {
                throw new Error('Courier ID missing. Please refresh and try again.');
            }

            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(messageData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const result = await response.json();
            console.log('Message sent successfully!', result);

            // Redirect to inbox or show success message
            window.location.href = '/inbox';

        } catch (error) {
            console.error('Failed to send message:', error);
            // Re-throw the error so the component can handle it
            throw error;
        }
    };

    return (
        <div className="container mx-auto py-8">
            <ComposeHonk
                onSend={handleSendMessage}
                characterLimit={280}
                titleLimit={100}
            />
        </div>
    );
}