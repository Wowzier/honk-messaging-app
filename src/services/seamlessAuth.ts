import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { dbManager } from '@/lib/database';
import { User, AuthUser } from '@/types';

interface DeviceInfo {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
}

interface DeviceLinkCode {
  id: string;
  user_id: string;
  code: string;
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

export class SeamlessAuthService {
  private get db() {
    return dbManager.getDatabase();
  }

  /**
   * Generate a unique device fingerprint
   */
  private generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const fingerprint = [
      deviceInfo.userAgent,
      deviceInfo.screenResolution,
      deviceInfo.timezone,
      deviceInfo.language,
      deviceInfo.platform,
      // Add some randomness to prevent exact duplicates
      Date.now().toString()
    ].join('|');
    
    return createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Generate a secure unique user ID
   */
  private generateSecureUserId(): string {
    // Create a UUID with additional entropy
    const uuid = uuidv4();
    const randomSuffix = randomBytes(8).toString('hex');
    const timestamp = Date.now().toString(36);
    
    // Combine and hash for security
    const combined = `${uuid}-${timestamp}-${randomSuffix}`;
    return createHash('sha256').update(combined).digest('hex').substring(0, 32);
  }

  /**
   * Generate a 6-digit sharing code
   */
  private generate6DigitCode(): string {
    // Generate a secure 6-digit code
    const code = randomBytes(3).readUIntBE(0, 3) % 1000000;
    return code.toString().padStart(6, '0');
  }

  /**
   * Create or get user automatically based on device
   */
  async getOrCreateUser(deviceInfo: DeviceInfo): Promise<{ user: AuthUser; isNew: boolean }> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
      
      // Check if user exists with this device fingerprint
      const existingUser = this.db.prepare(`
        SELECT * FROM users WHERE device_fingerprint = ?
      `).get(deviceFingerprint) as any;

      if (existingUser) {
        // Update last active
        this.updateLastActive(existingUser.id);
        const user = dbManager.rowToUser(existingUser);
        return { user: this.userToAuthUser(user), isNew: false };
      }

      // Create new user
      const userId = this.generateSecureUserId();
      const now = new Date().toISOString();
      const username = `User${userId.substring(0, 8)}`;

      const insertUser = this.db.prepare(`
        INSERT INTO users (
          id, username, device_fingerprint, created_at, last_active,
          total_journey_points, current_rank, location_sharing_preference, opt_out_random
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertUser.run(
        userId,
        username,
        deviceFingerprint,
        now,
        now,
        0,
        'Fledgling Courier',
        'state',
        0
      );

      // Get the created user
      const newUser = this.findUserById(userId);
      if (!newUser) {
        throw new Error('Failed to create user');
      }

      return { user: this.userToAuthUser(newUser), isNew: true };

    } catch (error) {
      console.error('Error creating/getting user:', error);
      throw error;
    }
  }

  /**
   * Create a 6-digit sharing code for device linking
   */
  async createDeviceLinkCode(userId: string): Promise<string> {
    try {
      const code = this.generate6DigitCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing codes for this user
      this.db.prepare('DELETE FROM device_link_codes WHERE user_id = ?').run(userId);

      // Insert new code
      const insertCode = this.db.prepare(`
        INSERT INTO device_link_codes (id, user_id, code, created_at, expires_at, used)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertCode.run(
        uuidv4(),
        userId,
        code,
        now.toISOString(),
        expiresAt.toISOString(),
        false
      );

      return code;
    } catch (error) {
      console.error('Error creating device link code:', error);
      throw error;
    }
  }

  /**
   * Link device using 6-digit code
   */
  async linkDeviceWithCode(code: string, deviceInfo: DeviceInfo): Promise<{ user: AuthUser; success: boolean }> {
    try {
      const now = new Date();
      
      // Find valid code
      const linkCode = this.db.prepare(`
        SELECT * FROM device_link_codes 
        WHERE code = ? AND used = 0 AND expires_at > ?
      `).get(code, now.toISOString()) as any;

      if (!linkCode) {
        throw new Error('Invalid or expired code');
      }

      // Mark code as used
      this.db.prepare('UPDATE device_link_codes SET used = 1 WHERE id = ?').run(linkCode.id);

      // Get user
      const user = this.findUserById(linkCode.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user's device fingerprint to include new device
      const newFingerprint = this.generateDeviceFingerprint(deviceInfo);
      this.db.prepare(`
        UPDATE users SET device_fingerprint = ?, last_active = ? WHERE id = ?
      `).run(newFingerprint, now.toISOString(), user.id);

      return { user: this.userToAuthUser(user), success: true };
    } catch (error) {
      console.error('Error linking device:', error);
      return { user: null as any, success: false };
    }
  }

  /**
   * Clean up expired codes
   */
  async cleanupExpiredCodes(): Promise<void> {
    const now = new Date();
    this.db.prepare('DELETE FROM device_link_codes WHERE expires_at < ?').run(now.toISOString());
  }

  // Private helper methods
  private findUserById(id: string): User | null {
    try {
      const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      return row ? dbManager.rowToUser(row) : null;
    } catch (error) {
      console.error('Find user by id error:', error);
      return null;
    }
  }

  private updateLastActive(userId: string): void {
    try {
      const now = new Date().toISOString();
      this.db.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(now, userId);
    } catch (error) {
      console.error('Update last active error:', error);
    }
  }

  private userToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      username: user.username || `User${user.id.substring(0, 8)}`,
      created_at: user.created_at,
      last_active: user.last_active,
      total_journey_points: user.total_journey_points,
      current_rank: user.current_rank,
      location_sharing_preference: user.location_sharing_preference,
      opt_out_random: user.opt_out_random,
      current_location: user.current_location,
      total_flights_sent: user.total_flights_sent || 0,
      total_flights_received: user.total_flights_received || 0,
      total_distance_traveled: user.total_distance_traveled || 0,
      countries_visited: user.countries_visited || [],
      states_visited: user.states_visited || [],
      achievements: user.achievements || []
    };
  }
}

export const seamlessAuthService = new SeamlessAuthService();