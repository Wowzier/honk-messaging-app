import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserMatchingService } from '@/services/userMatching';
import { User, LocationData } from '@/types';
import { dbManager } from '@/lib/database';
import { calculateDistance } from '@/utils/distance';

// Mock the database manager
vi.mock('@/lib/database', () => ({
  dbManager: {
    getDatabase: vi.fn(),
    rowToUser: vi.fn(),
  },
}));

// Mock the distance utilities
vi.mock('@/utils/distance', () => ({
  calculateDistance: vi.fn(),
  isTooBoringDistance: vi.fn(),
  getDistanceWeight: vi.fn(),
}));

describe('UserMatchingService', () => {
  const mockSenderLocation: LocationData = {
    latitude: 37.7749,
    longitude: -122.4194,
    is_anonymous: false,
  };

  const mockUsers: User[] = [
    {
      id: 'user1',
      email: 'user1@example.com',
      username: 'user1',
      password_hash: 'hash1',
      created_at: new Date('2024-01-01'),
      last_active: new Date(),
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'state',
      opt_out_random: false,
      current_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        is_anonymous: false,
      },
    },
    {
      id: 'user2',
      email: 'user2@example.com',
      username: 'user2',
      password_hash: 'hash2',
      created_at: new Date('2024-01-01'),
      last_active: new Date(),
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'country',
      opt_out_random: false,
      current_location: {
        latitude: 51.5074,
        longitude: -0.1278,
        is_anonymous: false,
      },
    },
    {
      id: 'user3',
      email: 'user3@example.com',
      username: 'user3',
      password_hash: 'hash3',
      created_at: new Date('2024-01-01'),
      last_active: new Date('2024-01-01'), // Inactive user
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'anonymous',
      opt_out_random: false,
      current_location: {
        latitude: 35.6762,
        longitude: 139.6503,
        is_anonymous: true,
      },
    },
    {
      id: 'user4',
      email: 'user4@example.com',
      username: 'user4',
      password_hash: 'hash4',
      created_at: new Date('2024-01-01'),
      last_active: new Date(),
      total_journey_points: 0,
      current_rank: 'Fledgling Courier',
      location_sharing_preference: 'state',
      opt_out_random: true, // Opted out
      current_location: {
        latitude: -33.8688,
        longitude: 151.2093,
        is_anonymous: false,
      },
    },
  ];

  const mockDatabase = {
    prepare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock database methods
    (dbManager.getDatabase as any).mockReturnValue(mockDatabase);
    (dbManager.rowToUser as any).mockImplementation((row: any) => row);
    
    // Mock distance calculations
    (calculateDistance as any).mockImplementation((loc1: LocationData, loc2: LocationData) => {
      // Return different distances for different users
      if (loc2.latitude === 40.7128) return 4129; // SF to NYC
      if (loc2.latitude === 51.5074) return 8630; // SF to London
      if (loc2.latitude === 35.6762) return 8275; // SF to Tokyo
      if (loc2.latitude === -33.8688) return 12000; // SF to Sydney
      return 1000; // Default
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findRandomRecipient', () => {
    it('should find a random recipient successfully', async () => {
      // Mock database query to return active users
      const mockStmt = {
        all: vi.fn().mockReturnValue(mockUsers.filter(u => u.last_active > new Date('2024-12-01'))),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      // Mock distance utilities
      const { isTooBoringDistance, getDistanceWeight } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);
      (getDistanceWeight as any).mockImplementation((distance: number) => {
        if (distance > 8000) return 3.0;
        if (distance > 5000) return 2.0;
        return 1.0;
      });

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(true);
      expect(result.selectedUser).toBeDefined();
      expect(result.totalCandidates).toBeGreaterThan(0);
      expect(result.eligibleCandidates).toBeGreaterThan(0);
    });

    it('should exclude opted-out users', async () => {
      // Mock database query to return all users including opted-out ones
      const mockStmt = {
        all: vi.fn().mockReturnValue(mockUsers),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance, getDistanceWeight } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);
      (getDistanceWeight as any).mockReturnValue(1.0);

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      // Should exclude user4 who opted out
      expect(result.success).toBe(true);
      if (result.selectedUser) {
        expect(result.selectedUser.id).not.toBe('user4');
      }
    });

    it('should exclude inactive users', async () => {
      // Mock database query to return only active users (should exclude user3)
      const activeUsers = mockUsers.filter(u => u.last_active > new Date('2024-12-01'));
      const mockStmt = {
        all: vi.fn().mockReturnValue(activeUsers),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance, getDistanceWeight } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);
      (getDistanceWeight as any).mockReturnValue(1.0);

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(true);
      if (result.selectedUser) {
        expect(result.selectedUser.id).not.toBe('user3');
      }
    });

    it('should exclude users that are too close', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue(mockUsers.filter(u => u.last_active > new Date('2024-12-01'))),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance, getDistanceWeight } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockImplementation((distance: number) => distance < 500);
      (getDistanceWeight as any).mockReturnValue(1.0);

      // Mock one user as too close
      (calculateDistance as any).mockImplementation((loc1: LocationData, loc2: LocationData) => {
        if (loc2.latitude === 40.7128) return 100; // Too close
        if (loc2.latitude === 51.5074) return 8630; // Far enough
        return 1000;
      });

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(true);
      if (result.selectedUser) {
        expect(result.selectedUser.id).not.toBe('user1'); // Should exclude the close user
      }
    });

    it('should return failure when no eligible recipients exist', async () => {
      // Mock database query to return no users
      const mockStmt = {
        all: vi.fn().mockReturnValue([]),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(false);
      expect(result.selectedUser).toBeUndefined();
      expect(result.message).toContain('No eligible recipients found');
    });

    it('should exclude sender from selection', async () => {
      const usersIncludingSender = [...mockUsers, {
        ...mockUsers[0],
        id: 'sender123',
      }];

      const mockStmt = {
        all: vi.fn().mockReturnValue(usersIncludingSender),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance, getDistanceWeight } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);
      (getDistanceWeight as any).mockReturnValue(1.0);

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(true);
      if (result.selectedUser) {
        expect(result.selectedUser.id).not.toBe('sender123');
      }
    });

    it('should handle database errors gracefully', async () => {
      // Mock database to throw an error
      mockDatabase.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await UserMatchingService.findRandomRecipient(
        mockSenderLocation,
        'sender123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('error occurred');
    });
  });

  describe('getMatchingStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStmt = {
        all: vi.fn().mockReturnValue(mockUsers.filter(u => u.last_active > new Date('2024-12-01'))),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockImplementation((distance: number) => distance < 500);

      const stats = await UserMatchingService.getMatchingStatistics(
        mockSenderLocation,
        'sender123'
      );

      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.activeUsers).toBeGreaterThan(0);
      expect(stats.optedOutUsers).toBe(1); // user4 opted out
      expect(stats.distanceDistribution).toBeDefined();
    });
  });

  describe('validateRecipient', () => {
    it('should validate a good recipient', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(mockUsers[0]),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);

      const result = await UserMatchingService.validateRecipient(
        'user1',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject sender as recipient', async () => {
      const result = await UserMatchingService.validateRecipient(
        'sender123',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Cannot send message to yourself');
    });

    it('should reject opted-out users', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(mockUsers[3]), // user4 who opted out
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const result = await UserMatchingService.validateRecipient(
        'user4',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('opted out');
    });

    it('should reject users that are too close', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(mockUsers[0]),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(true);

      const result = await UserMatchingService.validateRecipient(
        'user1',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('too close');
    });

    it('should reject inactive users', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(mockUsers[2]), // user3 who is inactive
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const { isTooBoringDistance } = await import('@/utils/distance');
      (isTooBoringDistance as any).mockReturnValue(false);

      const result = await UserMatchingService.validateRecipient(
        'user3',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('should reject non-existent users', async () => {
      const mockStmt = {
        get: vi.fn().mockReturnValue(null),
      };
      mockDatabase.prepare.mockReturnValue(mockStmt);

      const result = await UserMatchingService.validateRecipient(
        'nonexistent',
        mockSenderLocation,
        'sender123'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });
});