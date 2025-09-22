import { FlightProgress, NotificationRecord, NotificationType } from '@/types';
import { webSocketService } from './websocket';

/**
 * Notification service for handling real-time notifications
 */
export class NotificationService {
  private notifications: NotificationRecord[] = [];
  private callbacks: ((notification: NotificationRecord) => void)[] = [];
  private isInitialized = false;

  /**
   * Initialize the notification service
   */
  initialize(userId: string): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Connect to WebSocket for real-time updates
    webSocketService.connect(userId);

    // Set up global flight progress handler for notifications
    this.setupFlightNotifications();
  }

  /**
   * Set up flight-related notifications
   */
  private setupFlightNotifications(): void {
    // We'll handle flight notifications through the WebSocket service
    // This is a placeholder for future notification logic
  }

  /**
   * Create a new notification
   */
  createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ): NotificationRecord {
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      title,
      body,
      metadata,
      created_at: new Date()
    };

    // Store in memory
    this.notifications.unshift(notification);
    
    // Persist to database
    this.persistNotification(notification);
    
    // Notify callbacks
    this.notifyCallbacks(notification);

    // Show browser notification if permission granted
    this.showBrowserNotification(notification);

    return notification;
  }

  /**
   * Persist notification to database
   */
  private async persistNotification(notification: NotificationRecord): Promise<void> {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notification,
          created_at: notification.created_at.toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error persisting notification:', error);
    }
  }

  /**
   * Create flight update notification
   */
  createFlightUpdateNotification(userId: string, progress: FlightProgress): NotificationRecord {
    const progressPercent = Math.round(progress.progress_percentage);
    
    let title = 'Flight Update';
    let body = `Your duck is ${progressPercent}% of the way to its destination`;

    // Special messages for milestones
    if (progressPercent === 25) {
      body = 'Your duck has completed a quarter of its journey! 🦆';
    } else if (progressPercent === 50) {
      body = 'Your duck is halfway there! 🦆✈️';
    } else if (progressPercent === 75) {
      body = 'Your duck is three-quarters of the way! Almost there! 🦆🎯';
    }

    // Weather-related updates
    if (progress.current_weather) {
      const weather = progress.current_weather;
      if (weather.type === 'storm') {
        body += ' ⛈️ Flying through a storm - speed reduced!';
      } else if (weather.type === 'rain') {
        body += ' 🌧️ Flying through rain - taking it slow!';
      } else if (weather.type === 'wind') {
        if (weather.speed_modifier > 1) {
          body += ' 💨 Tailwinds helping speed up the journey!';
        } else {
          body += ' 💨 Headwinds slowing down the flight!';
        }
      }
    }

    return this.createNotification(
      userId,
      'flight.update',
      title,
      body,
      {
        messageId: progress.message_id,
        progress: progressPercent,
        weather: progress.current_weather
      }
    );
  }

  /**
   * Create flight delivered notification
   */
  createFlightDeliveredNotification(userId: string, progress: FlightProgress): NotificationRecord {
    return this.createNotification(
      userId,
      'flight.delivered',
      'Message Delivered! 🎉',
      'Your duck has successfully delivered the message!',
      {
        messageId: progress.message_id,
        deliveredAt: new Date().toISOString()
      }
    );
  }

  /**
   * Create message received notification
   */
  createMessageReceivedNotification(
    userId: string,
    senderName: string,
    messageTitle: string,
    messageId?: string
  ): NotificationRecord {
    return this.createNotification(
      userId,
      'message.received',
      'New Message Received! 📬',
      `You received a message "${messageTitle}" from ${senderName}`,
      {
        senderName,
        messageTitle,
        messageId
      }
    );
  }

  /**
   * Create reward unlocked notification
   */
  createRewardUnlockedNotification(
    userId: string,
    rewardName: string,
    rewardType: string
  ): NotificationRecord {
    return this.createNotification(
      userId,
      'reward.unlocked',
      'New Reward Unlocked! 🏆',
      `You've unlocked: ${rewardName}`,
      {
        rewardName,
        rewardType
      }
    );
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: NotificationRecord): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Navigate based on notification type
        if (notification.type === 'message.received') {
          window.location.href = '/inbox';
        } else if (notification.type === 'flight.delivered' || notification.type === 'flight.update') {
          // Could navigate to flight tracking page
          window.location.href = '/';
        }
      };
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Get all notifications for a user
   */
  getNotifications(userId: string): NotificationRecord[] {
    // Load from database if not in memory
    this.loadNotificationsFromDatabase(userId);
    return this.notifications.filter(n => n.user_id === userId);
  }

  /**
   * Load notifications from database
   */
  private async loadNotificationsFromDatabase(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      const rows = await response.json();

      for (const row of rows) {
        const existingIndex = this.notifications.findIndex(n => n.id === row.id);
        if (existingIndex === -1) {
          const notification: NotificationRecord = {
            id: row.id,
            user_id: row.user_id,
            type: row.type as NotificationType,
            title: row.title,
            body: row.body,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            created_at: new Date(row.created_at),
            read_at: row.read_at ? new Date(row.read_at) : undefined
          };
          this.notifications.push(notification);
        }
      }
    } catch (error) {
      console.error('Error loading notifications from database:', error);
    }
  }

  /**
   * Get unread notifications for a user
   */
  getUnreadNotifications(userId: string): NotificationRecord[] {
    return this.notifications.filter(n => n.user_id === userId && !n.read_at);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read_at) {
      notification.read_at = new Date();
      
      // Persist to database
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId,
            readAt: notification.read_at.toISOString(),
          }),
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: string): void {
    const now = new Date();
    this.notifications
      .filter(n => n.user_id === userId && !n.read_at)
      .forEach(n => n.read_at = now);
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  clearOldNotifications(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.notifications = this.notifications.filter(
      n => n.created_at > thirtyDaysAgo
    );
  }

  /**
   * Subscribe to notification updates
   */
  onNotification(callback: (notification: NotificationRecord) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from notification updates
   */
  removeNotificationCallback(callback: (notification: NotificationRecord) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks of new notification
   */
  private notifyCallbacks(notification: NotificationRecord): void {
    this.callbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Get notification statistics
   */
  getStats(userId: string) {
    const userNotifications = this.getNotifications(userId);
    const unreadCount = this.getUnreadNotifications(userId).length;

    return {
      total: userNotifications.length,
      unread: unreadCount,
      byType: userNotifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<NotificationType, number>)
    };
  }

  /**
   * Clear all notifications for a user
   */
  clearAllNotifications(userId: string): void {
    this.notifications = this.notifications.filter(n => n.user_id !== userId);
  }
}

/**
 * Singleton notification service instance
 */
export const notificationService = new NotificationService();