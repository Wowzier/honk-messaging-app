import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  sanitizeMessage,
  getCharacterCount,
  getRemainingCharacters,
  isWithinLimit,
  type MessageData,
} from '@/utils/messageValidation';

describe('Message Validation', () => {
  describe('validateMessage', () => {
    it('should validate a correct message', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'This is a test message',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.title).toBe('Hello World');
      expect(result.content).toBe('This is a test message');
    });

    it('should reject empty title', () => {
      const messageData: MessageData = {
        title: '',
        content: 'This is a test message',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject whitespace-only title', () => {
      const messageData: MessageData = {
        title: '   ',
        content: 'This is a test message',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject title exceeding limit', () => {
      const messageData: MessageData = {
        title: 'a'.repeat(101),
        content: 'This is a test message',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData, { titleLimit: 100 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be 100 characters or less');
    });

    it('should reject empty content', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: '',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content is required');
    });

    it('should reject whitespace-only content', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: '   \n\t  ',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content is required');
    });

    it('should reject content exceeding limit', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'a'.repeat(281),
        locationSharing: 'state',
      };

      const result = validateMessage(messageData, { contentLimit: 280 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message must be 280 characters or less');
    });

    it('should reject missing location sharing when required', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'This is a test message',
      };

      const result = validateMessage(messageData, { requireLocationSharing: true });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location sharing preference is required');
    });

    it('should allow missing location sharing when not required', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'This is a test message',
      };

      const result = validateMessage(messageData, { requireLocationSharing: false });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject potentially harmful content', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'This is a test <script>alert("xss")</script> message',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message contains potentially harmful content');
    });

    it('should reject javascript: URLs', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'Check this out: javascript:alert("xss")',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message contains potentially harmful content');
    });

    it('should reject event handlers', () => {
      const messageData: MessageData = {
        title: 'Hello World',
        content: 'This is onclick="alert(1)" dangerous',
        locationSharing: 'state',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message contains potentially harmful content');
    });

    it('should handle custom limits', () => {
      const messageData: MessageData = {
        title: 'a'.repeat(50),
        content: 'b'.repeat(150),
        locationSharing: 'country',
      };

      const result = validateMessage(messageData, {
        titleLimit: 60,
        contentLimit: 200,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple errors', () => {
      const messageData: MessageData = {
        title: '',
        content: '',
      };

      const result = validateMessage(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // title, content, location sharing
      expect(result.errors).toContain('Title is required');
      expect(result.errors).toContain('Message content is required');
      expect(result.errors).toContain('Location sharing preference is required');
    });
  });

  describe('sanitizeMessage', () => {
    it('should trim whitespace from title and content', () => {
      const messageData: MessageData = {
        title: '  Hello World  ',
        content: '  This is a test message  ',
        locationSharing: 'state',
      };

      const result = sanitizeMessage(messageData);

      expect(result.title).toBe('Hello World');
      expect(result.content).toBe('This is a test message');
      expect(result.locationSharing).toBe('state');
    });

    it('should normalize multiple spaces', () => {
      const messageData: MessageData = {
        title: 'Hello    World',
        content: 'This  is   a    test     message',
        locationSharing: 'country',
      };

      const result = sanitizeMessage(messageData);

      expect(result.title).toBe('Hello World');
      expect(result.content).toBe('This is a test message');
    });

    it('should handle newlines and tabs', () => {
      const messageData: MessageData = {
        title: 'Hello\n\tWorld',
        content: 'This\nis\ta\ntest\tmessage',
        locationSharing: 'anonymous',
      };

      const result = sanitizeMessage(messageData);

      expect(result.title).toBe('Hello World');
      expect(result.content).toBe('This is a test message');
    });
  });

  describe('getCharacterCount', () => {
    it('should return correct character count', () => {
      expect(getCharacterCount('Hello')).toBe(5);
      expect(getCharacterCount('')).toBe(0);
      expect(getCharacterCount('Hello World!')).toBe(12);
    });

    it('should count unicode characters correctly', () => {
      expect(getCharacterCount('🦆🚀')).toBe(4); // Each emoji is 2 characters in JS
      expect(getCharacterCount('café')).toBe(4);
    });
  });

  describe('getRemainingCharacters', () => {
    it('should calculate remaining characters correctly', () => {
      expect(getRemainingCharacters('Hello', 10)).toBe(5);
      expect(getRemainingCharacters('Hello World', 10)).toBe(-1);
      expect(getRemainingCharacters('', 280)).toBe(280);
    });
  });

  describe('isWithinLimit', () => {
    it('should return true when within limit', () => {
      expect(isWithinLimit('Hello', 10)).toBe(true);
      expect(isWithinLimit('Hello World', 11)).toBe(true);
      expect(isWithinLimit('', 0)).toBe(true);
    });

    it('should return false when exceeding limit', () => {
      expect(isWithinLimit('Hello World', 10)).toBe(false);
      expect(isWithinLimit('a', 0)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isWithinLimit('Hello', 5)).toBe(true); // Exactly at limit
      expect(isWithinLimit('Hello!', 5)).toBe(false); // One over limit
    });
  });
});