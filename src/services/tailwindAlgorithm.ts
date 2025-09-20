import { LocationData, User } from '@/types';
import { dbManager } from '@/lib/database';

/**
 * Tailwind Algorithm for selecting random message recipients
 * Implements geographic weighting to favor longer distances
 */
class TailwindAlgorithm {
  /**
   * Find eligible recipients for random message delivery
   */
  async findEligibleRecipients(senderId: string, senderLocation: LocationData): Promise<User[]> {
    const db = dbManager.getDatabase();
    
    // Get active users who haven't opted out of random messages
    // Exclude users inactive for more than 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE id != ? 
        AND opt_out_random = 0 
        AND last_active > ?
        AND current_location IS NOT NULL
    `);
    
    const rows = stmt.all(senderId, fourteenDaysAgo.toISOString());
    const users = rows.map((row: any) => dbManager.rowToUser(row));
    
    // Filter out users that are too close (less than 500km)
    const eligibleUsers = users.filter(user => {
      if (!user.current_location) return false;
      
      const distance = this.calculateDistance(
        senderLocation.latitude,
        senderLocation.longitude,
        user.current_location.latitude,
        user.current_location.longitude
      );
      
      return distance >= 500; // Minimum 500km distance
    });
    
    return eligibleUsers;
  }

  /**
   * Select a weighted random recipient favoring greater distances
   */
  selectWeightedRecipient(eligibleUsers: User[], senderLocation: LocationData): User {
    if (eligibleUsers.length === 0) {
      throw new Error('No eligible recipients available');
    }
    
    if (eligibleUsers.length === 1) {
      return eligibleUsers[0];
    }
    
    // Calculate weights based on distance and cross-continental preference
    const weights = eligibleUsers.map(user => {
      const distance = this.calculateDistance(
        senderLocation.latitude,
        senderLocation.longitude,
        user.current_location!.latitude,
        user.current_location!.longitude
      );
      
      // Base weight is distance
      let weight = distance;
      
      // Bonus for cross-continental messages
      if (this.isCrossContinental(senderLocation, user.current_location!)) {
        weight *= 2; // Double weight for cross-continental
      }
      
      // Bonus for different countries
      if (senderLocation.country !== user.current_location!.country) {
        weight *= 1.5;
      }
      
      return weight;
    });
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < eligibleUsers.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return eligibleUsers[i];
      }
    }
    
    // Fallback to last user (shouldn't happen)
    return eligibleUsers[eligibleUsers.length - 1];
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if two locations are on different continents
   */
  private isCrossContinental(location1: LocationData, location2: LocationData): boolean {
    const continent1 = this.getContinent(location1.latitude, location1.longitude);
    const continent2 = this.getContinent(location2.latitude, location2.longitude);
    
    return continent1 !== continent2;
  }

  /**
   * Determine continent based on coordinates (simplified)
   */
  private getContinent(lat: number, lon: number): string {
    // Simplified continent detection based on coordinates
    if (lat >= -35 && lat <= 37 && lon >= -25 && lon <= 60) {
      return 'Africa';
    } else if (lat >= 10 && lat <= 80 && lon >= -170 && lon <= -30) {
      return 'North America';
    } else if (lat >= -60 && lat <= 15 && lon >= -85 && lon <= -30) {
      return 'South America';
    } else if (lat >= 35 && lat <= 75 && lon >= -15 && lon <= 180) {
      return 'Europe/Asia';
    } else if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180) {
      return 'Australia';
    } else if (lat >= -90 && lat <= -60) {
      return 'Antarctica';
    }
    
    return 'Unknown';
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const tailwindAlgorithm = new TailwindAlgorithm();