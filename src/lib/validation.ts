import { 
  MessageValidation, 
  LocationValidation, 
  LocationData, 
  HonkMessage, 
  User 
} from '@/types';

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

export function validateMessage(title: string, content: string): MessageValidation {
  const errors: string[] = [];

  // Title validation
  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }

  // Content validation
  if (!content || content.trim().length === 0) {
    errors.push('Message content is required');
  } else if (content.length > 280) {
    errors.push('Message content must be 280 characters or less');
  }

  return {
    title: title.trim(),
    content: content.trim(),
    isValid: errors.length === 0,
    errors
  };
}

export function validateLocation(latitude: number, longitude: number): LocationValidation {
  const errors: string[] = [];

  // Latitude validation
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    errors.push('Latitude must be a valid number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }

  // Longitude validation
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    errors.push('Longitude must be a valid number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }

  return {
    latitude,
    longitude,
    isValid: errors.length === 0,
    errors
  };
}

export function validateLocationData(location: LocationData): string[] {
  const errors: string[] = [];
  
  const locationValidation = validateLocation(location.latitude, location.longitude);
  errors.push(...locationValidation.errors);

  if (typeof location.is_anonymous !== 'boolean') {
    errors.push('is_anonymous must be a boolean value');
  }

  if (location.state && typeof location.state !== 'string') {
    errors.push('State must be a string');
  }

  if (location.country && typeof location.country !== 'string') {
    errors.push('Country must be a string');
  }

  return errors;
}

export function validateUser(user: Partial<User>): string[] {
  const errors: string[] = [];

  if (user.id && typeof user.id !== 'string') {
    errors.push('User ID must be a string');
  }

  if (user.total_journey_points !== undefined) {
    if (typeof user.total_journey_points !== 'number' || user.total_journey_points < 0) {
      errors.push('Total journey points must be a non-negative number');
    }
  }

  if (user.current_rank && typeof user.current_rank !== 'string') {
    errors.push('Current rank must be a string');
  }

  if (user.location_sharing_preference) {
    const validPreferences = ['state', 'country', 'anonymous'];
    if (!validPreferences.includes(user.location_sharing_preference)) {
      errors.push('Location sharing preference must be one of: state, country, anonymous');
    }
  }

  if (user.opt_out_random !== undefined && typeof user.opt_out_random !== 'boolean') {
    errors.push('Opt out random must be a boolean value');
  }

  if (user.current_location) {
    const locationErrors = validateLocationData(user.current_location);
    errors.push(...locationErrors.map(err => `Current location: ${err}`));
  }

  return errors;
}

export function validateHonkMessage(message: Partial<HonkMessage>): string[] {
  const errors: string[] = [];

  if (message.id && typeof message.id !== 'string') {
    errors.push('Message ID must be a string');
  }

  if (message.sender_id && typeof message.sender_id !== 'string') {
    errors.push('Sender ID must be a string');
  }

  if (message.recipient_id !== null && message.recipient_id !== undefined && typeof message.recipient_id !== 'string') {
    errors.push('Recipient ID must be a string or null');
  }

  if (message.title !== undefined) {
    const messageValidation = validateMessage(message.title, message.content || '');
    if (message.title && messageValidation.errors.some(err => err.includes('Title'))) {
      errors.push(...messageValidation.errors.filter(err => err.includes('Title')));
    }
  }

  if (message.content !== undefined) {
    const messageValidation = validateMessage(message.title || '', message.content);
    if (message.content && messageValidation.errors.some(err => err.includes('content'))) {
      errors.push(...messageValidation.errors.filter(err => err.includes('content')));
    }
  }

  if (message.sender_location) {
    const locationErrors = validateLocationData(message.sender_location);
    errors.push(...locationErrors.map(err => `Sender location: ${err}`));
  }

  if (message.recipient_location) {
    const locationErrors = validateLocationData(message.recipient_location);
    errors.push(...locationErrors.map(err => `Recipient location: ${err}`));
  }

  if (message.status) {
    const validStatuses = ['flying', 'delivered'];
    if (!validStatuses.includes(message.status)) {
      errors.push('Status must be either "flying" or "delivered"');
    }
  }

  return errors;
}

export function assertValid<T>(data: T, validator: (data: T) => string[]): void {
  const errors = validator(data);
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}