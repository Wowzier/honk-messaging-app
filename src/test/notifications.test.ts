import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from '@/services/notifications';
import { FlightProgress } from '@/types';

// Mock WebSocket service
vi.mock('@/services/websocket', () => ({
    webSocketService: {
        connect: vi.fn()
    }
}));

// Mock browser Notification API
const mockNotification = vi.fn();
const mockRequestPermission = vi.fn();

Object.defineProperty(global, 'Notification', {
    value: mockNotification,
    configurable: true
});

Object.defineProperty(mockNotification, 'permission', {
    value: 'default',
    writable: true,
    configurable: true
});

Object.defineProperty(mockNotification, 'requestPermission', {
    value: mockRequestPermission,
    configurable: true
});

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(() => {
        notificationService = new NotificationService();
        vi.clearAllMocks();
        mockNotification.mockClear();
        mockRequestPermission.mockClear();
    });

    afterEach(() => {
        // Clean up any timers or intervals
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize with WebSocket connection', async () => {
            const { webSocketService } = await import('@/services/websocket');

            notificationService.initialize('user123');

            expect(webSocketService.connect).toHaveBeenCalledWith('user123');
        });

        it('should not initialize twice', async () => {
            const { webSocketService } = await import('@/services/websocket');

            notificationService.initialize('user123');
            notificationService.initialize('user123');

            expect(webSocketService.connect).toHaveBeenCalledTimes(1);
        });
    });

    describe('Notification Creation', () => {
        it('should create a basic notification', () => {
            const notification = notificationService.createNotification(
                'user123',
                'system.alert',
                'Test Title',
                'Test Body',
                { key: 'value' }
            );

            expect(notification).toMatchObject({
                user_id: 'user123',
                type: 'system.alert',
                title: 'Test Title',
                body: 'Test Body',
                metadata: { key: 'value' }
            });
            expect(notification.id).toBeDefined();
            expect(notification.created_at).toBeInstanceOf(Date);
        });

        it('should create flight update notification', () => {
            const mockProgress: FlightProgress = {
                message_id: 'msg123',
                current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
                progress_percentage: 50,
                estimated_arrival: new Date()
            };

            const notification = notificationService.createFlightUpdateNotification('user123', mockProgress);

            expect(notification.type).toBe('flight.update');
            expect(notification.title).toBe('Flight Update');
            expect(notification.body).toContain('halfway there');
            expect(notification.metadata?.messageId).toBe('msg123');
        });

        it('should create special milestone notifications', () => {
            const testCases = [
                { progress: 25, expectedText: 'quarter of its journey' },
                { progress: 50, expectedText: 'halfway there' },
                { progress: 75, expectedText: 'three-quarters' }
            ];

            testCases.forEach(({ progress, expectedText }) => {
                const mockProgress: FlightProgress = {
                    message_id: 'msg123',
                    current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
                    progress_percentage: progress,
                    estimated_arrival: new Date()
                };

                const notification = notificationService.createFlightUpdateNotification('user123', mockProgress);
                expect(notification.body).toContain(expectedText);
            });
        });

        it('should create weather-specific notifications', () => {
            const weatherTypes = [
                { type: 'storm', expectedText: 'Flying through a storm' },
                { type: 'rain', expectedText: 'Flying through rain' },
                { type: 'wind', speedModifier: 1.2, expectedText: 'Tailwinds helping' },
                { type: 'wind', speedModifier: 0.8, expectedText: 'Headwinds slowing' }
            ];

            weatherTypes.forEach(({ type, speedModifier = 1, expectedText }) => {
                const mockProgress: FlightProgress = {
                    message_id: 'msg123',
                    current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
                    progress_percentage: 30,
                    estimated_arrival: new Date(),
                    current_weather: {
                        type: type as any,
                        intensity: 1,
                        speed_modifier: speedModifier,
                        location: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
                        timestamp: new Date()
                    }
                };

                const notification = notificationService.createFlightUpdateNotification('user123', mockProgress);
                expect(notification.body).toContain(expectedText);
            });
        });

        it('should create flight delivered notification', () => {
            const mockProgress: FlightProgress = {
                message_id: 'msg123',
                current_position: { latitude: 40.7128, longitude: -74.0060, is_anonymous: false },
                progress_percentage: 100,
                estimated_arrival: new Date()
            };

            const notification = notificationService.createFlightDeliveredNotification('user123', mockProgress);

            expect(notification.type).toBe('flight.delivered');
            expect(notification.title).toBe('Message Delivered! 🎉');
            expect(notification.body).toContain('successfully delivered');
            expect(notification.metadata?.messageId).toBe('msg123');
        });

        it('should create message received notification', () => {
            const notification = notificationService.createMessageReceivedNotification(
                'user123',
                'John Doe',
                'Hello World'
            );

            expect(notification.type).toBe('message.received');
            expect(notification.title).toBe('New Message Received! 📬');
            expect(notification.body).toContain('John Doe');
            expect(notification.body).toContain('Hello World');
        });

        it('should create reward unlocked notification', () => {
            const notification = notificationService.createRewardUnlockedNotification(
                'user123',
                'Speed Demon',
                'achievement'
            );

            expect(notification.type).toBe('reward.unlocked');
            expect(notification.title).toBe('New Reward Unlocked! 🏆');
            expect(notification.body).toContain('Speed Demon');
            expect(notification.metadata?.rewardName).toBe('Speed Demon');
        });
    });

    describe('Browser Notifications', () => {
        beforeEach(() => {
            // Mock window object
            Object.defineProperty(global, 'window', {
                value: {
                    focus: vi.fn(),
                    location: { href: '' }
                },
                configurable: true
            });
        });

        it('should request notification permission', async () => {
            mockRequestPermission.mockResolvedValue('granted');
            mockNotification.permission = 'default';

            const permission = await notificationService.requestPermission();

            expect(mockRequestPermission).toHaveBeenCalled();
            expect(permission).toBe('granted');
        });

        it('should show browser notification when permission is granted', async () => {
            mockNotification.permission = 'granted';
            const mockNotificationInstance = {
                close: vi.fn(),
                onclick: null
            };
            mockNotification.mockReturnValue(mockNotificationInstance);

            const notification = notificationService.createNotification(
                'user123',
                'system.alert',
                'Test Title',
                'Test Body'
            );

            // Wait for async browser notification
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockNotification).toHaveBeenCalledWith('Test Title', {
                body: 'Test Body',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id,
                requireInteraction: false,
                silent: false
            });
        });

        it('should not show browser notification when permission is denied', async () => {
            mockNotification.permission = 'denied';

            notificationService.createNotification(
                'user123',
                'system.alert',
                'Test Title',
                'Test Body'
            );

            // Wait for async browser notification
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockNotification).not.toHaveBeenCalled();
        });
    });

    describe('Notification Management', () => {
        beforeEach(() => {
            // Create some test notifications
            notificationService.createNotification('user1', 'system.alert', 'Title 1', 'Body 1');
            notificationService.createNotification('user1', 'flight.update', 'Title 2', 'Body 2');
            notificationService.createNotification('user2', 'message.received', 'Title 3', 'Body 3');
        });

        it('should get notifications for a specific user', () => {
            const user1Notifications = notificationService.getNotifications('user1');
            const user2Notifications = notificationService.getNotifications('user2');

            expect(user1Notifications).toHaveLength(2);
            expect(user2Notifications).toHaveLength(1);
            expect(user1Notifications[0].user_id).toBe('user1');
            expect(user2Notifications[0].user_id).toBe('user2');
        });

        it('should get unread notifications', () => {
            const unreadNotifications = notificationService.getUnreadNotifications('user1');
            expect(unreadNotifications).toHaveLength(2);

            // Mark one as read
            const notifications = notificationService.getNotifications('user1');
            notificationService.markAsRead(notifications[0].id);

            const updatedUnread = notificationService.getUnreadNotifications('user1');
            expect(updatedUnread).toHaveLength(1);
        });

        it('should mark notification as read', () => {
            const notifications = notificationService.getNotifications('user1');
            const notification = notifications[0];

            expect(notification.read_at).toBeUndefined();

            notificationService.markAsRead(notification.id);

            const updatedNotifications = notificationService.getNotifications('user1');
            const updatedNotification = updatedNotifications.find(n => n.id === notification.id);
            expect(updatedNotification?.read_at).toBeInstanceOf(Date);
        });

        it('should mark all notifications as read for a user', () => {
            notificationService.markAllAsRead('user1');

            const unreadNotifications = notificationService.getUnreadNotifications('user1');
            expect(unreadNotifications).toHaveLength(0);

            // user2 notifications should still be unread
            const user2Unread = notificationService.getUnreadNotifications('user2');
            expect(user2Unread).toHaveLength(1);
        });

        it('should clear old notifications', () => {
            // Create an old notification by mocking the date
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

            const oldNotification = notificationService.createNotification(
                'user1',
                'system.alert',
                'Old Title',
                'Old Body'
            );
            oldNotification.created_at = oldDate;

            const beforeClear = notificationService.getNotifications('user1');
            expect(beforeClear.length).toBeGreaterThan(2);

            notificationService.clearOldNotifications();

            const afterClear = notificationService.getNotifications('user1');
            expect(afterClear.length).toBeLessThan(beforeClear.length);
        });

        it('should clear all notifications for a user', () => {
            notificationService.clearAllNotifications('user1');

            const user1Notifications = notificationService.getNotifications('user1');
            const user2Notifications = notificationService.getNotifications('user2');

            expect(user1Notifications).toHaveLength(0);
            expect(user2Notifications).toHaveLength(1); // user2 notifications should remain
        });
    });

    describe('Callback System', () => {
        it('should notify callbacks when new notification is created', () => {
            const callback = vi.fn();
            notificationService.onNotification(callback);

            const notification = notificationService.createNotification(
                'user123',
                'system.alert',
                'Test Title',
                'Test Body'
            );

            expect(callback).toHaveBeenCalledWith(notification);
        });

        it('should remove notification callbacks', () => {
            const callback = vi.fn();
            notificationService.onNotification(callback);
            notificationService.removeNotificationCallback(callback);

            notificationService.createNotification(
                'user123',
                'system.alert',
                'Test Title',
                'Test Body'
            );

            expect(callback).not.toHaveBeenCalled();
        });

        it('should handle callback errors gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Callback error');
            });
            const goodCallback = vi.fn();

            notificationService.onNotification(errorCallback);
            notificationService.onNotification(goodCallback);

            // Should not throw error
            expect(() => {
                notificationService.createNotification(
                    'user123',
                    'system.alert',
                    'Test Title',
                    'Test Body'
                );
            }).not.toThrow();

            expect(goodCallback).toHaveBeenCalled();
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            notificationService.createNotification('user1', 'system.alert', 'Title 1', 'Body 1');
            notificationService.createNotification('user1', 'flight.update', 'Title 2', 'Body 2');
            notificationService.createNotification('user1', 'flight.update', 'Title 3', 'Body 3');
            notificationService.createNotification('user2', 'message.received', 'Title 4', 'Body 4');
        });

        it('should provide accurate statistics', () => {
            const stats = notificationService.getStats('user1');

            expect(stats.total).toBe(3);
            expect(stats.unread).toBe(3);
            expect(stats.byType['system.alert']).toBe(1);
            expect(stats.byType['flight.update']).toBe(2);
        });

        it('should update statistics after marking as read', () => {
            const notifications = notificationService.getNotifications('user1');
            notificationService.markAsRead(notifications[0].id);

            const stats = notificationService.getStats('user1');
            expect(stats.unread).toBe(2);
        });
    });
});