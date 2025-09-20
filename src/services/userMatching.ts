import { User, LocationData } from '@/types';
import { calculateDistance, isTooBoringDistance, getDistanceWeight } from '@/utils/distance';
import { dbManager } from '@/lib/database';

export interface EligibleUser {
  user: User;
  distance: number;
  weight: number;
}

export interface UserMatchingOptions {
  excludeUserIds?: string[];
  minDistance?: number;
  maxCandidates?: number;
}

export interface UserMatchingResult {
  success: boolean;
  selectedUser?: User;
  distance?: number;
  totalCandidates: number;
  eligibleCandidates: number;
  message?: string;
}

/**
 * Tailwind Algorithm for random user matching
 * Implements geographic weighting system based on distance ranges
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class UserMatchingService {
  private static readonly INACTIVE_THRESHOLD_DAYS = 14;
  private static readonly MIN_BORING_DISTANCE_KM = 500;
  private static readonly DEFAULT_MAX_CANDIDATES = 1000;

  /**
   * Find a random user to receive a message using the Tailwind Algorithm
   * Requirement 2.1: Use Tailwind Algorithm to select eligible user
   */
  static async findRandomRecipient(
    senderLocation: LocationData,
    senderId: string,
    options: UserMatchingOptions = {}
  ): Promise<UserMatchingResult> {
    try {
      // Get all potential candidates
      const allUsers = await this.getAllActiveUsers();
      
      // Filter eligible users
      const eligibleUsers = await this.filterEligibleUsers(
        allUsers,
        senderLocation,
        senderId,
        options
      );

      if (eligibleUsers.length === 0) {
        return {
          success: false,
          totalCandidates: allUsers.length,
          eligibleCandidates: 0,
          message: 'No eligible recipients found. Try adjusting your location sharing settings or try again later.'
        };
      }

      // Apply geographic weighting and select random user
      const selectedUser = this.selectWeightedRandomUser(eligibleUsers);
      const selectedCandidate = eligibleUsers.find(u => u.user.id === selectedUser.id);

      return {
        success: true,
        selectedUser,
        distance: selectedCandidate?.distance,
        totalCandidates: allUsers.length,
        eligibleCandidates: eligibleUsers.length
      };
    } catch (error) {
      console.error('Error in findRandomRecipient:', error);
      return {
        success: false,
        totalCandidates: 0,
        eligibleCandidates: 0,
        message: 'An error occurred while finding a recipient. Please try again.'
      };
    }
  }

  /**
   * Get all active users from the database
   * Requirement 2.3: Exclude users inactive for more than 14 days
   */
  private static async getAllActiveUsers(): Promise<User[]> {
    const db = dbManager.getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.INACTIVE_THRESHOLD_DAYS);

    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE last_active >= ? 
      AND current_location IS NOT NULL
    `);

    const rows = stmt.all(cutoffDate.toISOString());
    return rows.map(row => dbManager.rowToUser(row));
  }

  /**
   * Filter users based on eligibility criteria
   * Requirements: 2.2, 2.3, 2.6
   */
  private static async filterEligibleUsers(
    users: User[],
    senderLocation: LocationData,
    senderId: string,
    options: UserMatchingOptions
  ): Promise<EligibleUser[]> {
    const eligibleUsers: EligibleUser[] = [];
    const excludeIds = new Set([senderId, ...(options.excludeUserIds || [])]);
    const minDistance = options.minDistance || this.MIN_BORING_DISTANCE_KM;

    for (const user of users) {
      // Requirement 2.2: Exclude users who have opted out of random messages
      if (user.opt_out_random) {
        continue;
      }

      // Exclude sender and any specified user IDs
      if (excludeIds.has(user.id)) {
        continue;
      }

      // User must have a current location
      if (!user.current_location) {
        continue;
      }

      // Calculate distance
      const distance = calculateDistance(senderLocation, user.current_location);

      // Requirement 2.6: Exclude distances less than 500km as "too boring"
      if (isTooBoringDistance(distance) || distance < minDistance) {
        continue;
      }

      // Requirement 2.4: Assign higher weights to users at greater distances
      const weight = getDistanceWeight(distance);

      eligibleUsers.push({
        user,
        distance,
        weight
      });
    }

    // Limit candidates if specified
    if (options.maxCandidates && eligibleUsers.length > options.maxCandidates) {
      // Sort by weight (descending) and take top candidates
      eligibleUsers.sort((a, b) => b.weight - a.weight);
      return eligibleUsers.slice(0, options.maxCandidates);
    }

    return eligibleUsers;
  }

  /**
   * Select a random user using weighted selection
   * Requirement 2.4: Higher weights for greater distances (cross-continental preferred)
   */
  private static selectWeightedRandomUser(eligibleUsers: EligibleUser[]): User {
    if (eligibleUsers.length === 0) {
      throw new Error('No eligible users provided for selection');
    }

    if (eligibleUsers.length === 1) {
      return eligibleUsers[0].user;
    }

    // Calculate total weight
    const totalWeight = eligibleUsers.reduce((sum, candidate) => sum + candidate.weight, 0);

    // Generate random number between 0 and totalWeight
    const randomValue = Math.random() * totalWeight;

    // Find the selected user using weighted selection
    let currentWeight = 0;
    for (const candidate of eligibleUsers) {
      currentWeight += candidate.weight;
      if (randomValue <= currentWeight) {
        return candidate.user;
      }
    }

    // Fallback to last user (should not happen with proper implementation)
    return eligibleUsers[eligibleUsers.length - 1].user;
  }

  /**
   * Get statistics about user matching for debugging/monitoring
   */
  static async getMatchingStatistics(
    senderLocation: LocationData,
    senderId: string
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    eligibleUsers: number;
    optedOutUsers: number;
    tooCloseUsers: number;
    distanceDistribution: Record<string, number>;
  }> {
    const allUsers = await this.getAllActiveUsers();
    const eligibleUsers = await this.filterEligibleUsers(allUsers, senderLocation, senderId, {});
    
    let optedOutUsers = 0;
    let tooCloseUsers = 0;
    const distanceDistribution: Record<string, number> = {
      'local': 0,
      'regional': 0,
      'national': 0,
      'continental': 0,
      'intercontinental': 0
    };

    for (const user of allUsers) {
      if (user.id === senderId) continue;
      
      if (user.opt_out_random) {
        optedOutUsers++;
        continue;
      }

      if (!user.current_location) continue;

      const distance = calculateDistance(senderLocation, user.current_location);
      
      if (isTooBoringDistance(distance)) {
        tooCloseUsers++;
      }

      // Count distance distribution
      if (distance < 100) distanceDistribution.local++;
      else if (distance < 500) distanceDistribution.regional++;
      else if (distance < 2000) distanceDistribution.national++;
      else if (distance < 8000) distanceDistribution.continental++;
      else distanceDistribution.intercontinental++;
    }

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.length,
      eligibleUsers: eligibleUsers.length,
      optedOutUsers,
      tooCloseUsers,
      distanceDistribution
    };
  }

  /**
   * Validate that a user can be selected as a recipient
   */
  static async validateRecipient(
    recipientId: string,
    senderLocation: LocationData,
    senderId: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    if (recipientId === senderId) {
      return { isValid: false, reason: 'Cannot send message to yourself' };
    }

    try {
      const db = dbManager.getDatabase();
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const row = stmt.get(recipientId);

      if (!row) {
        return { isValid: false, reason: 'Recipient not found' };
      }

      const user = dbManager.rowToUser(row);

      if (user.opt_out_random) {
        return { isValid: false, reason: 'Recipient has opted out of random messages' };
      }

      if (!user.current_location) {
        return { isValid: false, reason: 'Recipient location not available' };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.INACTIVE_THRESHOLD_DAYS);

      if (user.last_active < cutoffDate) {
        return { isValid: false, reason: 'Recipient has been inactive for too long' };
      }

      const distance = calculateDistance(senderLocation, user.current_location);
      if (isTooBoringDistance(distance)) {
        return { isValid: false, reason: 'Recipient is too close (less than 500km)' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating recipient:', error);
      return { isValid: false, reason: 'Error validating recipient' };
    }
  }
}