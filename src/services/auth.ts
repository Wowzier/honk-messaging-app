import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from '@/lib/database';
import { 
  User, 
  AuthUser, 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse,
  UserProfile,
  UserRow 
} from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'honk-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

export class AuthService {
  private get db() {
    return dbManager.getDatabase();
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Validate input
      const validation = this.validateRegistration(credentials);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', ')
        };
      }

      // Check if user already exists
      const existingUser = this.findUserByEmail(credentials.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      const existingUsername = this.findUserByUsername(credentials.username);
      if (existingUsername) {
        return {
          success: false,
          message: 'Username is already taken'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(credentials.password, SALT_ROUNDS);

      // Create user
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      const insertUser = this.db.prepare(`
        INSERT INTO users (
          id, email, username, password_hash, created_at, last_active,
          total_journey_points, current_rank, location_sharing_preference, opt_out_random
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertUser.run(
        userId,
        credentials.email,
        credentials.username,
        passwordHash,
        now,
        now,
        0,
        'Fledgling Courier',
        credentials.location_sharing_preference || 'state',
        0
      );

      // Get the created user
      const user = this.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Failed to create user'
        };
      }

      // Generate JWT token
      const token = this.generateToken(user);
      const authUser = this.userToAuthUser(user);

      return {
        success: true,
        user: authUser,
        token,
        message: 'User registered successfully'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = this.findUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Update last active
      this.updateLastActive(user.id);

      // Generate JWT token
      const token = this.generateToken(user);
      const authUser = this.userToAuthUser(user);

      return {
        success: true,
        user: authUser,
        token,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  /**
   * Verify JWT token and get user
   */
  verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = this.findUserById(decoded.userId);
      
      if (!user) {
        return null;
      }

      // Update last active
      this.updateLastActive(user.id);

      return this.userToAuthUser(user);
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  updateProfile(userId: string, profile: Partial<UserProfile>): boolean {
    try {
      const updates: string[] = [];
      const values: (string | number)[] = [];

      if (profile.username !== undefined) {
        // Check if username is already taken by another user
        const existingUser = this.findUserByUsername(profile.username);
        if (existingUser && existingUser.id !== userId) {
          return false;
        }
        updates.push('username = ?');
        values.push(profile.username);
      }

      if (profile.location_sharing_preference !== undefined) {
        updates.push('location_sharing_preference = ?');
        values.push(profile.location_sharing_preference);
      }

      if (profile.opt_out_random !== undefined) {
        updates.push('opt_out_random = ?');
        values.push(profile.opt_out_random ? 1 : 0);
      }

      if (profile.current_location !== undefined) {
        updates.push('current_location = ?');
        values.push(JSON.stringify(profile.current_location));
      }

      if (updates.length === 0) {
        return true; // Nothing to update
      }

      values.push(userId);
      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      
      const result = this.db.prepare(updateQuery).run(...values);
      return result.changes > 0;

    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): AuthUser | null {
    const user = this.findUserById(userId);
    return user ? this.userToAuthUser(user) : null;
  }

  /**
   * Private helper methods
   */
  private findUserByEmail(email: string): User | null {
    try {
      const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
      return row ? dbManager.rowToUser(row) : null;
    } catch (error) {
      console.error('Find user by email error:', error);
      return null;
    }
  }

  private findUserByUsername(username: string): User | null {
    try {
      const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
      return row ? dbManager.rowToUser(row) : null;
    } catch (error) {
      console.error('Find user by username error:', error);
      return null;
    }
  }

  private findUserById(id: string): User | null {
    try {
      const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
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

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  private userToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      created_at: user.created_at,
      last_active: user.last_active,
      total_journey_points: user.total_journey_points,
      current_rank: user.current_rank,
      location_sharing_preference: user.location_sharing_preference,
      opt_out_random: user.opt_out_random,
      current_location: user.current_location
    };
  }

  private validateRegistration(credentials: RegisterCredentials): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation
    if (!credentials.email || credentials.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.push('Invalid email format');
    }

    // Username validation
    if (!credentials.username || credentials.username.trim().length === 0) {
      errors.push('Username is required');
    } else if (credentials.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (credentials.username.length > 30) {
      errors.push('Username must be less than 30 characters');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(credentials.username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Password validation
    if (!credentials.password || credentials.password.length === 0) {
      errors.push('Password is required');
    } else if (credentials.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(credentials.password)) {
      errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }

    // Location sharing preference validation
    if (credentials.location_sharing_preference && 
        !['state', 'country', 'anonymous'].includes(credentials.location_sharing_preference)) {
      errors.push('Invalid location sharing preference');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const authService = new AuthService();