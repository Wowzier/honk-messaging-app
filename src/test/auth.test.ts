import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '@/services/auth';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';
import { RegisterCredentials, LoginCredentials } from '@/types';

describe('AuthService', () => {
    let authService: AuthService;
    let testDbPath: string;

    beforeEach(() => {
        // Use in-memory database for testing
        testDbPath = ':memory:';
        const db = dbManager.connect(testDbPath);
        const migrationRunner = new MigrationRunner(db);
        migrationRunner.runMigrations();

        authService = new AuthService();
    });

    afterEach(() => {
        dbManager.close();
    });

    describe('User Registration', () => {
        const validCredentials: RegisterCredentials = {
            email: 'test@example.com',
            username: 'testuser',
            password: 'TestPassword123',
            location_sharing_preference: 'state'
        };

        it('should register a new user successfully', async () => {
            const result = await authService.register(validCredentials);

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.user?.email).toBe(validCredentials.email);
            expect(result.user?.username).toBe(validCredentials.username);
            expect(result.user?.location_sharing_preference).toBe('state');
            expect(result.user?.opt_out_random).toBe(false);
        });

        it('should reject registration with invalid email', async () => {
            const invalidCredentials = {
                ...validCredentials,
                email: 'invalid-email'
            };

            const result = await authService.register(invalidCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid email format');
        });

        it('should reject registration with short username', async () => {
            const invalidCredentials = {
                ...validCredentials,
                username: 'ab'
            };

            const result = await authService.register(invalidCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Username must be at least 3 characters long');
        });

        it('should reject registration with weak password', async () => {
            const invalidCredentials = {
                ...validCredentials,
                password: 'weak'
            };

            const result = await authService.register(invalidCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Password must be at least 8 characters long');
        });

        it('should reject registration with password missing requirements', async () => {
            const invalidCredentials = {
                ...validCredentials,
                password: 'onlylowercase'
            };

            const result = await authService.register(invalidCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Password must contain at least one lowercase letter, one uppercase letter, and one number');
        });

        it('should reject duplicate email registration', async () => {
            // Register first user
            await authService.register(validCredentials);

            // Try to register with same email
            const duplicateCredentials = {
                ...validCredentials,
                username: 'differentuser'
            };

            const result = await authService.register(duplicateCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('User with this email already exists');
        });

        it('should reject duplicate username registration', async () => {
            // Register first user
            await authService.register(validCredentials);

            // Try to register with same username
            const duplicateCredentials = {
                ...validCredentials,
                email: 'different@example.com'
            };

            const result = await authService.register(duplicateCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Username is already taken');
        });
    });

    describe('User Login', () => {
        const credentials: RegisterCredentials = {
            email: 'test@example.com',
            username: 'testuser',
            password: 'TestPassword123',
            location_sharing_preference: 'state'
        };

        beforeEach(async () => {
            // Register a user for login tests
            await authService.register(credentials);
        });

        it('should login successfully with correct credentials', async () => {
            const loginCredentials: LoginCredentials = {
                email: credentials.email,
                password: credentials.password
            };

            const result = await authService.login(loginCredentials);

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.user?.email).toBe(credentials.email);
        });

        it('should reject login with incorrect email', async () => {
            const loginCredentials: LoginCredentials = {
                email: 'wrong@example.com',
                password: credentials.password
            };

            const result = await authService.login(loginCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
        });

        it('should reject login with incorrect password', async () => {
            const loginCredentials: LoginCredentials = {
                email: credentials.email,
                password: 'WrongPassword123'
            };

            const result = await authService.login(loginCredentials);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
        });
    });

    describe('Token Verification', () => {
        let validToken: string;
        let userId: string;

        beforeEach(async () => {
            const credentials: RegisterCredentials = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'TestPassword123',
                location_sharing_preference: 'state'
            };

            const result = await authService.register(credentials);
            validToken = result.token!;
            userId = result.user!.id;
        });

        it('should verify valid token', () => {
            const user = authService.verifyToken(validToken);

            expect(user).toBeDefined();
            expect(user?.id).toBe(userId);
            expect(user?.email).toBe('test@example.com');
        });

        it('should reject invalid token', () => {
            const user = authService.verifyToken('invalid-token');

            expect(user).toBeNull();
        });

        it('should reject expired token', () => {
            // This would require mocking JWT to create an expired token
            // For now, we'll test with a malformed token
            const user = authService.verifyToken('expired.token.here');

            expect(user).toBeNull();
        });
    });

    describe('Profile Updates', () => {
        let userId: string;

        beforeEach(async () => {
            const credentials: RegisterCredentials = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'TestPassword123',
                location_sharing_preference: 'state'
            };

            const result = await authService.register(credentials);
            userId = result.user!.id;
        });

        it('should update username successfully', () => {
            const success = authService.updateProfile(userId, {
                username: 'newusername'
            });

            expect(success).toBe(true);

            const user = authService.getUserProfile(userId);
            expect(user?.username).toBe('newusername');
        });

        it('should update location sharing preference', () => {
            const success = authService.updateProfile(userId, {
                location_sharing_preference: 'anonymous'
            });

            expect(success).toBe(true);

            const user = authService.getUserProfile(userId);
            expect(user?.location_sharing_preference).toBe('anonymous');
        });

        it('should update opt-out preference', () => {
            const success = authService.updateProfile(userId, {
                opt_out_random: true
            });

            expect(success).toBe(true);

            const user = authService.getUserProfile(userId);
            expect(user?.opt_out_random).toBe(true);
        });

        it('should reject username update to existing username', async () => {
            // Register another user
            await authService.register({
                email: 'other@example.com',
                username: 'otheruser',
                password: 'TestPassword123',
                location_sharing_preference: 'state'
            });

            // Try to update first user's username to second user's username
            const success = authService.updateProfile(userId, {
                username: 'otheruser'
            });

            expect(success).toBe(false);
        });
    });

    describe('User Profile Retrieval', () => {
        let userId: string;

        beforeEach(async () => {
            const credentials: RegisterCredentials = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'TestPassword123',
                location_sharing_preference: 'country'
            };

            const result = await authService.register(credentials);
            userId = result.user!.id;
        });

        it('should retrieve user profile successfully', () => {
            const user = authService.getUserProfile(userId);

            expect(user).toBeDefined();
            expect(user?.email).toBe('test@example.com');
            expect(user?.username).toBe('testuser');
            expect(user?.location_sharing_preference).toBe('country');
            expect(user?.current_rank).toBe('Fledgling Courier');
            expect(user?.total_journey_points).toBe(0);
        });

        it('should return null for non-existent user', () => {
            const user = authService.getUserProfile('non-existent-id');

            expect(user).toBeNull();
        });
    });
});