import { FlightProgress } from '@/types';

/**
 * Client-side message delivery service
 */
export class MessageDeliveryClientService {
  /**
   * Handle flight completion and initiate message delivery
   */
  async handleFlightCompletion(messageId: string, flightProgress: FlightProgress): Promise<void> {
    try {
      const response = await fetch('/api/messages/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          flightProgress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Delivery failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error handling flight completion for message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get flight progress
   */
  async getFlightProgress(messageId: string): Promise<FlightProgress | null> {
    try {
      const response = await fetch(`/api/messages/delivery?messageId=${encodeURIComponent(messageId)}`);
      if (!response.ok) {
        throw new Error(`Failed to get flight progress: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error getting flight progress for ${messageId}:`, error);
      return null;
    }
  }
}

export const messageDeliveryClientService = new MessageDeliveryClientService();