import { MessageValidation } from '@/types';

export interface MessageData {
  title: string;
  content: string;
  locationSharing?: 'state' | 'country' | 'anonymous';
}

export interface ValidationOptions {
  titleLimit?: number;
  contentLimit?: number;
  requireLocationSharing?: boolean;
}

export function validateMessage(
  data: MessageData,
  options: ValidationOptions = {}
): MessageValidation {
  const {
    titleLimit = 100,
    contentLimit = 280,
    requireLocationSharing = true,
  } = options;

  const errors: string[] = [];
  let isValid = true;

  // Title validation
  if (!data.title || !data.title.trim()) {
    errors.push('Title is required');
    isValid = false;
  } else if (data.title.length > titleLimit) {
    errors.push(`Title must be ${titleLimit} characters or less`);
    isValid = false;
  }

  // Content validation
  if (!data.content || !data.content.trim()) {
    errors.push('Message content is required');
    isValid = false;
  } else if (data.content.length > contentLimit) {
    errors.push(`Message must be ${contentLimit} characters or less`);
    isValid = false;
  }

  // Location sharing validation
  if (requireLocationSharing && !data.locationSharing) {
    errors.push('Location sharing preference is required');
    isValid = false;
  }

  // Additional content validation
  if (data.content && data.content.trim()) {
    // Check for potentially harmful content patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(data.content)) {
        errors.push('Message contains potentially harmful content');
        isValid = false;
        break;
      }
    }
  }

  return {
    title: data.title,
    content: data.content,
    isValid,
    errors,
  };
}

export function sanitizeMessage(data: MessageData): MessageData {
  return {
    title: data.title.trim().replace(/\s+/g, ' '),
    content: data.content.trim().replace(/\s+/g, ' '),
    locationSharing: data.locationSharing,
  };
}

export function getCharacterCount(text: string): number {
  return text.length;
}

export function getRemainingCharacters(text: string, limit: number): number {
  return limit - text.length;
}

export function isWithinLimit(text: string, limit: number): boolean {
  return text.length <= limit;
}