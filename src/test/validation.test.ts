import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  validateLocation,
  validateLocationData,
  validateUser,
  validateHonkMessage,
  ValidationError,
  assertValid
} from '@/lib/validation';
import { LocationData, User, HonkMessage } from '@/types';

describe('Message Validation', () => {
  it('should validate valid messages', () => {
    const result = validateMessage('Hello World', 'This is a test message');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.title).toBe('Hello World');
    expect(result.content).toBe('This is a test message');
  });

  it('should trim whitespace from title and content', () => {
    const result = validateMessage('  Hello World  ', '  This is a test message  ');
    expect(result.title).toBe('Hello World');
    expect(result.content).toBe('This is a test message');
  });

  it('should reject empty title', () => {
    const result = validateMessage('', 'Valid content');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should reject empty content', () => {
    const result = validateMessage('Valid title', '');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Message content is required');
  });

  it('should reject title longer than 100 characters', () => {
    const longTitle = 'a'.repeat(101);
    const result = validateMessage(longTitle, 'Valid content');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Title must be 100 characters or less');
  });

  it('should reject content longer than 280 characters', () => {
    const longContent = 'a'.repeat(281);
    const result = validateMessage('Valid title', longContent);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Message content must be 280 characters or less');
  });

  it('should accept title exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    const result = validateMessage(title, 'Valid content');
    expect(result.isValid).toBe(true);
  });

  it('should accept content exactly 280 characters', () => {
    const content = 'a'.repeat(280);
    const result = validateMessage('Valid title', content);
    expect(result.isValid).toBe(true);
  });
});

describe('Location Validation', () => {
  it('should validate valid coordinates', () => {
    const result = validateLocation(40.7128, -74.0060); // New York City
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.latitude).toBe(40.7128);
    expect(result.longitude).toBe(-74.0060);
  });

  it('should validate edge case coordinates', () => {
    const result1 = validateLocation(90, 180); // North Pole, International Date Line
    expect(result1.isValid).toBe(true);
    
    const result2 = validateLocation(-90, -180); // South Pole, International Date Line
    expect(result2.isValid).toBe(true);
  });

  it('should reject invalid latitude', () => {
    const result = validateLocation(91, 0);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Latitude must be between -90 and 90 degrees');
  });

  it('should reject invalid longitude', () => {
    const result = validateLocation(0, 181);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Longitude must be between -180 and 180 degrees');
  });

  it('should reject non-numeric coordinates', () => {
    const result = validateLocation(NaN, NaN);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Latitude must be a valid number');
    expect(result.errors).toContain('Longitude must be a valid number');
  });
});

describe('LocationData Validation', () => {
  it('should validate valid location data', () => {
    const location: LocationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      state: 'New York',
      country: 'United States',
      is_anonymous: false
    };
    
    const errors = validateLocationData(location);
    expect(errors).toHaveLength(0);
  });

  it('should validate anonymous location data', () => {
    const location: LocationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      is_anonymous: true
    };
    
    const errors = validateLocationData(location);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid coordinates in location data', () => {
    const location: LocationData = {
      latitude: 91,
      longitude: 181,
      is_anonymous: false
    };
    
    const errors = validateLocationData(location);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(err => err.includes('Latitude'))).toBe(true);
    expect(errors.some(err => err.includes('Longitude'))).toBe(true);
  });

  it('should reject non-boolean is_anonymous', () => {
    const location = {
      latitude: 40.7128,
      longitude: -74.0060,
      is_anonymous: 'false' // Should be boolean, not string
    } as any;
    
    const errors = validateLocationData(location);
    expect(errors).toContain('is_anonymous must be a boolean value');
  });
});

describe('User Validation', () => {
  it('should validate valid user data', () => {
    const user: Partial<User> = {
      id: 'user-123',
      total_journey_points: 1000,
      current_rank: 'Sky Navigator',
      location_sharing_preference: 'state',
      opt_out_random: false,
      current_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'United States',
        is_anonymous: false
      }
    };
    
    const errors = validateUser(user);
    expect(errors).toHaveLength(0);
  });

  it('should reject negative journey points', () => {
    const user: Partial<User> = {
      total_journey_points: -100
    };
    
    const errors = validateUser(user);
    expect(errors).toContain('Total journey points must be a non-negative number');
  });

  it('should reject invalid location sharing preference', () => {
    const user: Partial<User> = {
      location_sharing_preference: 'invalid' as any
    };
    
    const errors = validateUser(user);
    expect(errors).toContain('Location sharing preference must be one of: state, country, anonymous');
  });

  it('should validate all valid location sharing preferences', () => {
    const preferences: Array<'state' | 'country' | 'anonymous'> = ['state', 'country', 'anonymous'];
    
    preferences.forEach(preference => {
      const user: Partial<User> = {
        location_sharing_preference: preference
      };
      
      const errors = validateUser(user);
      expect(errors).toHaveLength(0);
    });
  });

  it('should reject non-boolean opt_out_random', () => {
    const user: Partial<User> = {
      opt_out_random: 'true' as any
    };
    
    const errors = validateUser(user);
    expect(errors).toContain('Opt out random must be a boolean value');
  });

  it('should validate user with invalid current location', () => {
    const user: Partial<User> = {
      current_location: {
        latitude: 91, // Invalid
        longitude: -74.0060,
        is_anonymous: false
      }
    };
    
    const errors = validateUser(user);
    expect(errors.some(err => err.includes('Current location'))).toBe(true);
  });
});

describe('HonkMessage Validation', () => {
  it('should validate valid message data', () => {
    const message: Partial<HonkMessage> = {
      id: 'msg-123',
      sender_id: 'user-123',
      recipient_id: 'user-456',
      title: 'Hello!',
      content: 'This is a test message',
      sender_location: {
        latitude: 40.7128,
        longitude: -74.0060,
        state: 'New York',
        country: 'United States',
        is_anonymous: false
      },
      recipient_location: {
        latitude: 34.0522,
        longitude: -118.2437,
        state: 'California',
        country: 'United States',
        is_anonymous: false
      },
      status: 'flying'
    };
    
    const errors = validateHonkMessage(message);
    expect(errors).toHaveLength(0);
  });

  it('should validate message with null recipient_id', () => {
    const message: Partial<HonkMessage> = {
      sender_id: 'user-123',
      recipient_id: null,
      title: 'Hello!',
      content: 'This is a test message'
    };
    
    const errors = validateHonkMessage(message);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid status', () => {
    const message: Partial<HonkMessage> = {
      status: 'invalid' as any
    };
    
    const errors = validateHonkMessage(message);
    expect(errors).toContain('Status must be either "flying" or "delivered"');
  });

  it('should validate both valid statuses', () => {
    const statuses: Array<'flying' | 'delivered'> = ['flying', 'delivered'];
    
    statuses.forEach(status => {
      const message: Partial<HonkMessage> = {
        status
      };
      
      const errors = validateHonkMessage(message);
      expect(errors.filter(err => err.includes('Status'))).toHaveLength(0);
    });
  });

  it('should validate message with invalid sender location', () => {
    const message: Partial<HonkMessage> = {
      sender_location: {
        latitude: 91, // Invalid
        longitude: -74.0060,
        is_anonymous: false
      }
    };
    
    const errors = validateHonkMessage(message);
    expect(errors.some(err => err.includes('Sender location'))).toBe(true);
  });

  it('should validate message with invalid recipient location', () => {
    const message: Partial<HonkMessage> = {
      recipient_location: {
        latitude: 40.7128,
        longitude: 181, // Invalid
        is_anonymous: false
      }
    };
    
    const errors = validateHonkMessage(message);
    expect(errors.some(err => err.includes('Recipient location'))).toBe(true);
  });
});

describe('ValidationError and assertValid', () => {
  it('should create ValidationError with multiple errors', () => {
    const errors = ['Error 1', 'Error 2', 'Error 3'];
    const error = new ValidationError(errors);
    
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toEqual(errors);
    expect(error.message).toBe('Validation failed: Error 1, Error 2, Error 3');
  });

  it('should not throw when validation passes', () => {
    const validUser: Partial<User> = {
      total_journey_points: 100,
      location_sharing_preference: 'state'
    };
    
    expect(() => {
      assertValid(validUser, validateUser);
    }).not.toThrow();
  });

  it('should throw ValidationError when validation fails', () => {
    const invalidUser: Partial<User> = {
      total_journey_points: -100,
      location_sharing_preference: 'invalid' as any
    };
    
    expect(() => {
      assertValid(invalidUser, validateUser);
    }).toThrow(ValidationError);
  });

  it('should throw with correct error details', () => {
    const invalidUser: Partial<User> = {
      total_journey_points: -100
    };
    
    try {
      assertValid(invalidUser, validateUser);
      fail('Should have thrown ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).errors).toContain('Total journey points must be a non-negative number');
    }
  });
});