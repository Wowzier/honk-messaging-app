import { describe, it, expect } from 'vitest';
import { MESSAGE_LIMITS, FLIGHT_CONSTANTS } from '../constants';

describe('Constants', () => {
  it('should have correct message limits', () => {
    expect(MESSAGE_LIMITS.CONTENT_MAX_LENGTH).toBe(280);
    expect(MESSAGE_LIMITS.TITLE_MAX_LENGTH).toBe(100);
  });

  it('should have correct flight constants', () => {
    expect(FLIGHT_CONSTANTS.MIN_DISTANCE_KM).toBe(500);
    expect(FLIGHT_CONSTANTS.POINTS_PER_KM).toBe(1);
  });
});
