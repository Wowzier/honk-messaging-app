'use client';

import React from 'react';
import { ComposeHonk } from './ComposeHonk';

/**
 * Example usage of the ComposeHonk component
 * This demonstrates how to integrate the component with a message sending service
 */
export function ComposeHonkExample() {
    const handleSendMessage = async (messageData: {
        title: string;
        content: string;
        locationSharing: 'state' | 'country' | 'anonymous';
    }) => {
        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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