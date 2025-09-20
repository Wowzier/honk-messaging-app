import { HonkMessage, FlightProgress, NotificationRecord, User } from '@/types';
import { dbManager } from '@/lib/database';
import { notificationService } from './notifications';
import { flightEngine } from './flightEngine';
import { webSocketService } from './websocket';
import { RankingService } from './ranking';

/**
 * Configuration for message delivery service
 */
interface DeliveryConfig {
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
}

/**
 * Default delivery configuration
 */
const DEFAULT_CONFIG: DeliveryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000, // 1 second initial delay
  retryBackoffMultiplier: 2,
  maxRetryDelayMs: 30000 // 30 seconds max delay
};

/**
 * Delivery attempt record for tracking retries
 */
interface DeliveryAttempt {
  messageId: string;
  attemptCount: number;
  lastAttempt: Date;
  nextRetry: Date;
  error?: string;
}

/**
 * Message delivery service for handling completed flights and notifications
 */
export class MessageDeliveryService {
  private config: DeliveryConfig;
  private pendingDeliveries: Map<string, DeliveryAttempt> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<DeliveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupFlightCompletionHandler();
  }

  /**
   * Set up handler for flight completion events
   */
  private setupFlightCompletionHandler(): void {
    // Listen for flight completion events from the flight engine
    // This would be called when a flight reaches 100% progress
  }

  /**
   * Handle flight completion and initiate message delivery
   */
  async handleFlightCompletion(messageId: string, flightProgress: FlightProgress): Promise<void> {
    try {
      console.log(`Flight completed for message ${messageId}, initiating delivery...`);
      
      // Attempt to deliver the message
      const success = await this.deliverMessage(messageId, flightProgress);
      
      if (!success) {
        // Schedule retry if delivery failed
        await this.scheduleRetry(messageId);
      }
    } catch (error) {
      console.error(`Error handling flight completion for message ${messageId}:`, error);
      await this.scheduleRetry(messageId);
    }
  }

  /**
   * Deliver a message to the recipient
   */
  async deliverMessage(messageId: string, flightProgress: FlightProgress): Promise<boolean> {
    const db = dbManager.getDatabase();
    
    try {
      // Start transaction for atomic delivery
      return db.transaction(() => {
        // Get message details
        const messageRow = db.prepare(`
          SELECT * FROM messages WHERE id = ?
        `).get(messageId);

        if (!messageRow) {
          throw new Error(`Message ${messageId} not found`);
        }

        const message = dbManager.rowToMessage(messageRow);

        // Check if message is already delivered
        if (message.status === 'delivered') {
          console.log(`Message ${messageId} already delivered`);
          return true;
        }

        // Update message status to delivered with timestamp
        const deliveredAt = new Date();
        const updateResult = db.prepare(`
          UPDATE messages 
          SET status = 'delivered', delivered_at = ?
          WHERE id = ? AND status = 'flying'
        `).run(deliveredAt.toISOString(), messageId);

        if (updateResult.changes === 0) {
          throw new Error(`Failed to update message status for ${messageId}`);
        }

        // Get recipient information for notifications
        if (message.recipient_id) {
          const recipientRow = db.prepare(`
            SELECT * FROM users WHERE id = ?
          `).get(message.recipient_id);

          if (recipientRow) {
            const recipient = dbManager.rowToUser(recipientRow);
            
            // Get sender information for notification
            const senderRow = db.prepare(`
              SELECT * FROM users WHERE id = ?
            `).get(message.sender_id);

            const sender = senderRow ? dbManager.rowToUser(senderRow) : null;

            // Create delivery notification for recipient
            this.createDeliveryNotification(recipient, message, sender);

            // Create delivery confirmation notification for sender
            this.createDeliveryConfirmationNotification(message.sender_id, flightProgress);

            // Update recipient's flight statistics
            this.updateRecipientStatistics(recipient, message);

            // Send real-time notification via WebSocket
            this.sendRealTimeNotification(recipient.id, message, flightProgress);
          }
        }

        // Update journey data with final delivery information
        this.updateJourneyData(messageId, flightProgress);

        // Award journey points to sender for completed delivery
        this.awardJourneyPoints(messageId);

        console.log(`Message ${messageId} delivered successfully`);
        return true;
      })();

    } catch (error) {
      console.error(`Error delivering message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Create delivery notification for recipient
   */
  private createDeliveryNotification(
    recipient: User, 
    message: HonkMessage, 
    sender: User | null
  ): void {
    const senderName = sender ? sender.username : 'Anonymous';
    
    notificationService.createMessageReceivedNotification(
      recipient.id,
      senderName,
      message.title
    );
  }

  /**
   * Create delivery confirmation notification for sender
   */
  private createDeliveryConfirmationNotification(
    senderId: string, 
    flightProgress: FlightProgress
  ): void {
    notificationService.createFlightDeliveredNotification(senderId, flightProgress);
  }

  /**
   * Update recipient's flight statistics
   */
  private updateRecipientStatistics(recipient: User, message: HonkMessage): void {
    const db = dbManager.getDatabase();
    
    try {
      // Update total flights received
      db.prepare(`
        UPDATE users 
        SET total_flights_received = total_flights_received + 1,
            last_active = ?
        WHERE id = ?
      `).run(new Date().toISOString(), recipient.id);

      // Update location statistics if journey data is available
      if (message.journey_data && message.sender_location) {
        this.updateLocationStatistics(recipient.id, message.sender_location);
      }

    } catch (error) {
      console.error(`Error updating recipient statistics for ${recipient.id}:`, error);
    }
  }

  /**
   * Update location statistics for user
   */
  private updateLocationStatistics(userId: string, senderLocation: any): void {
    const db = dbManager.getDatabase();
    
    try {
      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!userRow) return;

      const user = dbManager.rowToUser(userRow);
      
      // Add new countries/states visited based on sender location
      const updatedCountries = [...user.countries_visited];
      const updatedStates = [...user.states_visited];

      if (senderLocation.country && !updatedCountries.includes(senderLocation.country)) {
        updatedCountries.push(senderLocation.country);
      }

      if (senderLocation.state && !updatedStates.includes(senderLocation.state)) {
        updatedStates.push(senderLocation.state);
      }

      // Update user statistics
      db.prepare(`
        UPDATE users 
        SET countries_visited = ?, states_visited = ?
        WHERE id = ?
      `).run(
        JSON.stringify(updatedCountries),
        JSON.stringify(updatedStates),
        userId
      );

      // Award bonus points for new locations (Requirement 6.4)
      const newLocations = (updatedCountries.length - user.countries_visited.length) + 
                          (updatedStates.length - user.states_visited.length);
      
      if (newLocations > 0) {
        const bonusPoints = newLocations * 500; // 500 points per new location
        db.prepare(`
          UPDATE users 
          SET total_journey_points = total_journey_points + ?
          WHERE id = ?
        `).run(bonusPoints, userId);

        // Create reward notification
        notificationService.createRewardUnlockedNotification(
          userId,
          `${bonusPoints} Journey Points`,
          'location_bonus'
        );
      }

    } catch (error) {
      console.error(`Error updating location statistics for ${userId}:`, error);
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private sendRealTimeNotification(
    recipientId: string, 
    message: HonkMessage, 
    flightProgress: FlightProgress
  ): void {
    try {
      webSocketService.sendToUser(recipientId, {
        type: 'message_delivered',
        data: {
          messageId: message.id,
          title: message.title,
          senderId: message.sender_id,
          deliveredAt: new Date().toISOString(),
          flightProgress
        }
      });
    } catch (error) {
      console.error(`Error sending real-time notification to ${recipientId}:`, error);
    }
  }

  /**
   * Award journey points to sender for completed delivery
   */
  private async awardJourneyPoints(messageId: string): Promise<void> {
    try {
      // Get journey data from flight engine
      const journeyData = flightEngine.createJourneyData(messageId);
      if (!journeyData) {
        console.log(`No journey data available for message ${messageId}`);
        return;
      }

      // Process journey completion and award points
      const advancement = await RankingService.processJourneyCompletion(messageId, journeyData);
      
      if (advancement) {
        // Notify user of rank advancement
        notificationService.createRewardUnlockedNotification(
          advancement.previous_rank === 'Fledgling Courier' ? 
            (await this.getSenderId(messageId)) : 
            (await this.getSenderId(messageId)),
          `Rank Advanced to ${advancement.new_rank}!`,
          'rank_advancement',
          {
            previous_rank: advancement.previous_rank,
            new_rank: advancement.new_rank,
            points_earned: advancement.points_earned,
            total_points: advancement.total_points,
            rewards_unlocked: advancement.rewards_unlocked
          }
        );

        console.log(`User advanced from ${advancement.previous_rank} to ${advancement.new_rank} with ${advancement.points_earned} points`);
      }
    } catch (error) {
      console.error(`Error awarding journey points for message ${messageId}:`, error);
    }
  }

  /**
   * Get sender ID for a message
   */
  private async getSenderId(messageId: string): Promise<string> {
    const db = dbManager.getDatabase();
    const messageRow = db.prepare('SELECT sender_id FROM messages WHERE id = ?').get(messageId);
    return messageRow?.sender_id || '';
  }

  /**
   * Update journey data with final delivery information
   */
  private updateJourneyData(messageId: string, flightProgress: FlightProgress): void {
    const db = dbManager.getDatabase();
    
    try {
      // Get current journey data
      const messageRow = db.prepare('SELECT journey_data FROM messages WHERE id = ?').get(messageId);
      if (!messageRow || !messageRow.journey_data) return;

      const journeyData = JSON.parse(messageRow.journey_data);
      
      // Update with final delivery information
      journeyData.current_progress = 100;
      journeyData.delivered_at = new Date().toISOString();
      journeyData.final_position = flightProgress.current_position;

      // Update in database
      db.prepare(`
        UPDATE messages 
        SET journey_data = ?
        WHERE id = ?
      `).run(JSON.stringify(journeyData), messageId);

    } catch (error) {
      console.error(`Error updating journey data for ${messageId}:`, error);
    }
  }

  /**
   * Schedule retry for failed delivery
   */
  private async scheduleRetry(messageId: string): Promise<void> {
    const existing = this.pendingDeliveries.get(messageId);
    const attemptCount = existing ? existing.attemptCount + 1 : 1;

    if (attemptCount > this.config.maxRetries) {
      console.error(`Max retries exceeded for message ${messageId}, marking as failed`);
      await this.markDeliveryFailed(messageId);
      return;
    }

    // Calculate retry delay with exponential backoff
    const baseDelay = this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, attemptCount - 1);
    const retryDelay = Math.min(baseDelay, this.config.maxRetryDelayMs);
    const nextRetry = new Date(Date.now() + retryDelay);

    const deliveryAttempt: DeliveryAttempt = {
      messageId,
      attemptCount,
      lastAttempt: new Date(),
      nextRetry,
      error: existing?.error
    };

    this.pendingDeliveries.set(messageId, deliveryAttempt);

    // Clear existing timer
    const existingTimer = this.retryTimers.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule retry
    const timer = setTimeout(async () => {
      console.log(`Retrying delivery for message ${messageId} (attempt ${attemptCount})`);
      
      // Get current flight progress
      const flightProgress = flightEngine.getFlightProgress(messageId);
      if (flightProgress && flightProgress.progress_percentage >= 100) {
        const success = await this.deliverMessage(messageId, flightProgress);
        
        if (success) {
          this.pendingDeliveries.delete(messageId);
          this.retryTimers.delete(messageId);
        } else {
          await this.scheduleRetry(messageId);
        }
      } else {
        // Flight not complete yet, schedule another retry
        await this.scheduleRetry(messageId);
      }
    }, retryDelay);

    this.retryTimers.set(messageId, timer);
    
    console.log(`Scheduled retry for message ${messageId} in ${retryDelay}ms (attempt ${attemptCount}/${this.config.maxRetries})`);
  }

  /**
   * Mark delivery as permanently failed
   */
  private async markDeliveryFailed(messageId: string): Promise<void> {
    const db = dbManager.getDatabase();
    
    try {
      // Update message status to indicate delivery failure
      db.prepare(`
        UPDATE messages 
        SET status = 'flying'
        WHERE id = ?
      `).run(messageId);

      // Get message details for sender notification
      const messageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
      if (messageRow) {
        const message = dbManager.rowToMessage(messageRow);
        
        // Notify sender of delivery failure
        notificationService.createNotification(
          message.sender_id,
          'system.alert',
          'Delivery Failed',
          'Your duck encountered an issue and couldn\'t deliver the message. It will keep trying!',
          { messageId, failureReason: 'max_retries_exceeded' }
        );
      }

      // Clean up retry tracking
      this.pendingDeliveries.delete(messageId);
      const timer = this.retryTimers.get(messageId);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(messageId);
      }

      console.log(`Message ${messageId} marked as delivery failed`);
    } catch (error) {
      console.error(`Error marking delivery as failed for ${messageId}:`, error);
    }
  }

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageId: string): DeliveryAttempt | null {
    return this.pendingDeliveries.get(messageId) || null;
  }

  /**
   * Get all pending deliveries
   */
  getPendingDeliveries(): DeliveryAttempt[] {
    return Array.from(this.pendingDeliveries.values());
  }

  /**
   * Cancel pending delivery retries for a message
   */
  cancelDeliveryRetries(messageId: string): boolean {
    const timer = this.retryTimers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(messageId);
    }

    const wasTracking = this.pendingDeliveries.has(messageId);
    this.pendingDeliveries.delete(messageId);
    
    return wasTracking;
  }

  /**
   * Process all pending deliveries (useful for startup recovery)
   */
  async processPendingDeliveries(): Promise<void> {
    const db = dbManager.getDatabase();
    
    try {
      // Find messages that should be delivered but aren't
      const undeliveredMessages = db.prepare(`
        SELECT id FROM messages 
        WHERE status = 'flying' 
        AND id IN (
          SELECT message_id FROM flights 
          WHERE status = 'delivered' OR progress_percentage >= 100
        )
      `).all();

      for (const row of undeliveredMessages) {
        const messageId = row.id;
        const flightProgress = flightEngine.getFlightProgress(messageId);
        
        if (flightProgress && flightProgress.progress_percentage >= 100) {
          console.log(`Processing pending delivery for message ${messageId}`);
          await this.handleFlightCompletion(messageId, flightProgress);
        }
      }
    } catch (error) {
      console.error('Error processing pending deliveries:', error);
    }
  }

  /**
   * Cleanup method to clear all timers
   */
  cleanup(): void {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    this.pendingDeliveries.clear();
  }
}

/**
 * Singleton instance of the message delivery service
 */
export const messageDeliveryService = new MessageDeliveryService();