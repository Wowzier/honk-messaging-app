import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UserMatchingService } from '@/services/userMatching';
import { LocationData } from '@/types';
import { dbManager } from '@/lib/database';
import { runMigrations } from '@/lib/migrations';
import path from 'path';

describe('UserMatching Integration Tests', () => {
  const testDbPath = path.join(process.cwd(), 'test-usermatching.db');
  
  beforeAll(async () => {
    // Connect to test database
    dbManager.connect(testDbPath);
    
    // Run migrations to set up tables
    await runMigrations();
    
    // Insert test users
    const db = dbManager.getDatabase();
    
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, username, password_hash, created_at, last_active, 
                        total_journey_points, current_rank, location_sharing_preference, 
                        opt_out_random, current_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    const oldDate = new Date('2024-01-01').toISOString();
    
    // Active user in New York
    insertUser.run(
      'user1',
      'user1@example.com',
      'user1',
      'hash1',
      now,
      now,
      0,
      'Fledgling Courier',
      'state',
      0,
      JSON.stringify({ latitude: 40.7128, longitude: -74.0060, is_anonymous: false })
    );
    
    // Active user in London
    insertUser.run(
      'user2',
      'user2@example.com',
      'user2',
      'hash2',
      now,
      now,
      0,
      'Fledgling Courier',
      'country',
      0,
      JSON.stringify({ latitude: 51.5074, longitude: -0.1278, is_anonymous: false })
    );
    
    // Inactive user in Tokyo
    insertUser.run(
      'user3',
      'user3@example.com',
      'user3',
      'hash3',
      oldDate,
      oldDate,
      0,
      'Fledgling Courier',
      'anonymous',
      0,
      JSON.stringify({ latitude: 35.6762, longitude: 139.6503, is_anonymous: true })
    );
    
    // Opted-out user in Sydney
    insertUser.run(
      'user4',
      'user4@example.com',
      'user4',
      'hash4',
      now,
      now,
      0,
      'Fledgling Courier',
      'state',
      1,
      JSON.stringify({ latitude: -33.8688, longitude: 151.2093, is_anonymous: false })
    );
    
    // User too close (Los Angeles)
    insertUser.run(
      'user5',
      'user5@example.com',
      'user5',
      'hash5',
      now,
      now,
      0,
      'Fledgling Courier',
      'state',
      0,
      JSON.stringify({ latitude: 34.0522, longitude: -118.2437, is_anonymous: false })
    );
  });
  
  afterAll(() => {
    // Clean up test database
    dbManager.close();
    const fs = require('fs');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
  
  it('should find eligible recipients using Tailwind Algorithm', async () => {
    const senderLocation: LocationData = {
      latitude: 37.7749, // San Francisco
      longitude: -122.4194,
      is_anonymous: false,
    };
    
    const result = await UserMatchingService.findRandomRecipient(
      senderLocation,
      'sender123'
    );
    
    expect(result.success).toBe(true);
    expect(result.selectedUser).toBeDefined();
    expect(result.totalCandidates).toBe(5); // All users in database
    expect(result.eligibleCandidates).toBe(2); // Only user1 and user2 are eligible
    
    // Should select either user1 (NYC) or user2 (London)
    expect(['user1', 'user2']).toContain(result.selectedUser?.id);
    
    // Should exclude:
    // - user3 (inactive)
    // - user4 (opted out)
    // - user5 (too close to SF)
  });
  
  it('should provide accurate matching statistics', async () => {
    const senderLocation: LocationData = {
      latitude: 37.7749, // San Francisco
      longitude: -122.4194,
      is_anonymous: false,
    };
    
    const stats = await UserMatchingService.getMatchingStatistics(
      senderLocation,
      'sender123'
    );
    
    expect(stats.totalUsers).toBe(4); // Active users only (excludes user3)
    expect(stats.activeUsers).toBe(4);
    expect(stats.eligibleUsers).toBe(2); // user1 and user2
    expect(stats.optedOutUsers).toBe(1); // user4
    expect(stats.tooCloseUsers).toBe(1); // user5
    expect(stats.distanceDistribution).toBeDefined();
  });
  
  it('should validate recipients correctly', async () => {
    const senderLocation: LocationData = {
      latitude: 37.7749, // San Francisco
      longitude: -122.4194,
      is_anonymous: false,
    };
    
    // Valid recipient
    const validResult = await UserMatchingService.validateRecipient(
      'user1',
      senderLocation,
      'sender123'
    );
    expect(validResult.isValid).toBe(true);
    
    // Invalid: opted out
    const optedOutResult = await UserMatchingService.validateRecipient(
      'user4',
      senderLocation,
      'sender123'
    );
    expect(optedOutResult.isValid).toBe(false);
    expect(optedOutResult.reason).toContain('opted out');
    
    // Invalid: too close
    const tooCloseResult = await UserMatchingService.validateRecipient(
      'user5',
      senderLocation,
      'sender123'
    );
    expect(tooCloseResult.isValid).toBe(false);
    expect(tooCloseResult.reason).toContain('too close');
    
    // Invalid: sender
    const senderResult = await UserMatchingService.validateRecipient(
      'sender123',
      senderLocation,
      'sender123'
    );
    expect(senderResult.isValid).toBe(false);
    expect(senderResult.reason).toContain('Cannot send message to yourself');
  });
  
  it('should handle edge case with no eligible recipients', async () => {
    // Create a scenario where no recipients are eligible
    const db = dbManager.getDatabase();
    
    // Temporarily opt out all users
    db.prepare('UPDATE users SET opt_out_random = 1').run();
    
    const senderLocation: LocationData = {
      latitude: 37.7749,
      longitude: -122.4194,
      is_anonymous: false,
    };
    
    const result = await UserMatchingService.findRandomRecipient(
      senderLocation,
      'sender123'
    );
    
    expect(result.success).toBe(false);
    expect(result.selectedUser).toBeUndefined();
    expect(result.message).toContain('No eligible recipients found');
    
    // Restore users for other tests
    db.prepare('UPDATE users SET opt_out_random = 0 WHERE id IN (?, ?, ?)').run('user1', 'user2', 'user5');
  });
});