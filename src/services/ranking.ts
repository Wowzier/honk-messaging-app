import { User, JourneyData, WeatherEvent, LocationData, UserReward, AviatorRankDefinition } from '@/types';
import { dbManager } from '@/lib/database';
import { calculateDistance } from './geolocation';

// Aviator rank definitions with progression thresholds
export const AVIATOR_RANKS: AviatorRankDefinition[] = [
  { name: 'Fledgling Courier', min_points: 0, rewards: [] },
  { name: 'Novice Navigator', min_points: 1000, rewards: ['weather_forecast'] },
  { name: 'Skilled Skywriter', min_points: 5000, rewards: ['priority_delivery', 'custom_themes'] },
  { name: 'Veteran Voyager', min_points: 15000, rewards: ['route_preview', 'message_scheduling'] },
  { name: 'Master Messenger', min_points: 35000, rewards: ['express_delivery', 'location_history'] },
  { name: 'Elite Explorer', min_points: 75000, rewards: ['global_leaderboard', 'premium_postcards'] },
  { name: 'Legendary Aviator', min_points: 150000, rewards: ['all_features', 'exclusive_badges'] }
];

// Bonus multipliers and thresholds
export const BONUS_CONFIG = {
  WEATHER_BONUS_MULTIPLIER: 0.25, // 25% bonus for adverse weather
  LONG_DISTANCE_THRESHOLD: 10000, // km
  LONG_DISTANCE_BONUS: 5000, // flat bonus points
  NEW_LOCATION_BONUS: 500, // points for visiting new countries/states
  BASE_POINTS_PER_KM: 1
};

export interface PointsCalculation {
  base_points: number;
  weather_bonus: number;
  distance_bonus: number;
  location_bonus: number;
  total_points: number;
  breakdown: string[];
}

export interface RankAdvancement {
  previous_rank: string;
  new_rank: string;
  points_earned: number;
  total_points: number;
  rewards_unlocked: string[];
}

export class RankingService {
  /**
   * Calculate journey points for a completed message delivery
   */
  public static calculateJourneyPoints(
    journeyData: JourneyData,
    senderLocation: LocationData,
    recipientLocation: LocationData,
    user: User
  ): PointsCalculation {
    const breakdown: string[] = [];
    
    // Base points: 1 point per kilometer
    const distance = journeyData.total_distance;
    const base_points = Math.floor(distance * BONUS_CONFIG.BASE_POINTS_PER_KM);
    breakdown.push(`Base: ${base_points} points (${distance.toFixed(0)}km × ${BONUS_CONFIG.BASE_POINTS_PER_KM})`);

    // Weather bonus: 25% extra for adverse weather conditions
    let weather_bonus = 0;
    const adverseWeatherEvents = journeyData.weather_events.filter(
      event => event.type === 'storm' || event.type === 'rain' || 
      (event.type === 'wind' && event.intensity > 0.7)
    );
    
    if (adverseWeatherEvents.length > 0) {
      weather_bonus = Math.floor(base_points * BONUS_CONFIG.WEATHER_BONUS_MULTIPLIER);
      breakdown.push(`Weather bonus: ${weather_bonus} points (${adverseWeatherEvents.length} adverse conditions)`);
    }

    // Long distance bonus: 5000 extra points for journeys over 10,000km
    let distance_bonus = 0;
    if (distance >= BONUS_CONFIG.LONG_DISTANCE_THRESHOLD) {
      distance_bonus = BONUS_CONFIG.LONG_DISTANCE_BONUS;
      breakdown.push(`Long distance bonus: ${distance_bonus} points (${distance.toFixed(0)}km ≥ ${BONUS_CONFIG.LONG_DISTANCE_THRESHOLD}km)`);
    }

    // New location bonus: 500 points for reaching new countries or states
    let location_bonus = 0;
    const newLocations = this.checkNewLocations(recipientLocation, user);
    if (newLocations.length > 0) {
      location_bonus = newLocations.length * BONUS_CONFIG.NEW_LOCATION_BONUS;
      breakdown.push(`New location bonus: ${location_bonus} points (${newLocations.join(', ')})`);
    }

    const total_points = base_points + weather_bonus + distance_bonus + location_bonus;

    return {
      base_points,
      weather_bonus,
      distance_bonus,
      location_bonus,
      total_points,
      breakdown
    };
  }

  /**
   * Check if the recipient location introduces new countries or states for the user
   */
  private static checkNewLocations(location: LocationData, user: User): string[] {
    const newLocations: string[] = [];

    if (location.country && !user.countries_visited.includes(location.country)) {
      newLocations.push(location.country);
    }

    if (location.state && !user.states_visited.includes(location.state)) {
      newLocations.push(location.state);
    }

    return newLocations;
  }

  /**
   * Update user's journey points and check for rank advancement
   */
  public static async updateUserPoints(
    userId: string,
    pointsEarned: number,
    newLocations: { countries: string[], states: string[] }
  ): Promise<RankAdvancement | null> {
    const db = dbManager.getDatabase();
    
    // Get current user data
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!userRow) {
      throw new Error('User not found');
    }

    const user = dbManager.rowToUser(userRow);
    const previousRank = user.current_rank;
    const previousPoints = user.total_journey_points;
    const newTotalPoints = previousPoints + pointsEarned;

    // Update countries and states visited
    const updatedCountries = [...new Set([...user.countries_visited, ...newLocations.countries])];
    const updatedStates = [...new Set([...user.states_visited, ...newLocations.states])];

    // Determine new rank
    const newRank = this.getRankForPoints(newTotalPoints);
    const rankChanged = newRank.name !== previousRank;

    // Update user in database
    const updateStmt = db.prepare(`
      UPDATE users 
      SET total_journey_points = ?, 
          current_rank = ?,
          countries_visited = ?,
          states_visited = ?,
          last_active = ?
      WHERE id = ?
    `);

    updateStmt.run(
      newTotalPoints,
      newRank.name,
      JSON.stringify(updatedCountries),
      JSON.stringify(updatedStates),
      new Date().toISOString(),
      userId
    );

    // If rank advanced, unlock new rewards
    let rewardsUnlocked: string[] = [];
    if (rankChanged) {
      rewardsUnlocked = await this.unlockRankRewards(userId, newRank);
    }

    return rankChanged ? {
      previous_rank: previousRank,
      new_rank: newRank.name,
      points_earned: pointsEarned,
      total_points: newTotalPoints,
      rewards_unlocked: rewardsUnlocked
    } : null;
  }

  /**
   * Get the appropriate rank for a given point total
   */
  public static getRankForPoints(points: number): AviatorRankDefinition {
    // Find the highest rank the user qualifies for
    let currentRank = AVIATOR_RANKS[0];
    
    for (const rank of AVIATOR_RANKS) {
      if (points >= rank.min_points) {
        currentRank = rank;
      } else {
        break;
      }
    }

    return currentRank;
  }

  /**
   * Unlock rewards for a new rank
   */
  private static async unlockRankRewards(userId: string, rank: AviatorRankDefinition): Promise<string[]> {
    const db = dbManager.getDatabase();
    const insertRewardStmt = db.prepare(`
      INSERT INTO user_rewards (user_id, reward_type, reward_id, unlocked_at)
      VALUES (?, ?, ?, ?)
    `);

    const unlockedRewards: string[] = [];

    for (const reward of rank.rewards) {
      // Check if reward is already unlocked
      const existingReward = db.prepare(`
        SELECT id FROM user_rewards 
        WHERE user_id = ? AND reward_type = 'rank_reward' AND reward_id = ?
      `).get(userId, reward);

      if (!existingReward) {
        insertRewardStmt.run(userId, 'rank_reward', reward, new Date().toISOString());
        unlockedRewards.push(reward);
      }
    }

    return unlockedRewards;
  }

  /**
   * Get user statistics and progress
   */
  public static async getUserStats(userId: string): Promise<{
    user: User;
    current_rank: AviatorRankDefinition;
    next_rank?: AviatorRankDefinition;
    progress_to_next: number;
    points_needed: number;
    achievements: UserReward[];
  }> {
    const db = dbManager.getDatabase();
    
    // Get user data
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!userRow) {
      throw new Error('User not found');
    }

    const user = dbManager.rowToUser(userRow);
    const currentRank = this.getRankForPoints(user.total_journey_points);
    
    // Find next rank
    const currentRankIndex = AVIATOR_RANKS.findIndex(rank => rank.name === currentRank.name);
    const nextRank = currentRankIndex < AVIATOR_RANKS.length - 1 ? 
      AVIATOR_RANKS[currentRankIndex + 1] : undefined;

    // Calculate progress to next rank
    let progress_to_next = 100; // Default to 100% if at max rank
    let points_needed = 0;

    if (nextRank) {
      const pointsInCurrentTier = user.total_journey_points - currentRank.min_points;
      const pointsNeededForTier = nextRank.min_points - currentRank.min_points;
      progress_to_next = Math.min(100, (pointsInCurrentTier / pointsNeededForTier) * 100);
      points_needed = nextRank.min_points - user.total_journey_points;
    }

    // Get user achievements/rewards
    const rewardRows = db.prepare(`
      SELECT * FROM user_rewards WHERE user_id = ? ORDER BY unlocked_at DESC
    `).all(userId);

    const achievements = rewardRows.map(row => dbManager.rowToUserReward(row));

    return {
      user,
      current_rank: currentRank,
      next_rank: nextRank,
      progress_to_next: Math.round(progress_to_next * 100) / 100,
      points_needed: Math.max(0, points_needed),
      achievements
    };
  }

  /**
   * Get leaderboard data
   */
  public static async getLeaderboard(limit: number = 10): Promise<{
    rank: number;
    user: Pick<User, 'id' | 'username' | 'total_journey_points' | 'current_rank' | 'countries_visited' | 'states_visited'>;
  }[]> {
    const db = dbManager.getDatabase();
    
    const rows = db.prepare(`
      SELECT id, username, total_journey_points, current_rank, countries_visited, states_visited
      FROM users 
      ORDER BY total_journey_points DESC 
      LIMIT ?
    `).all(limit);

    return rows.map((row, index) => ({
      rank: index + 1,
      user: {
        id: row.id,
        username: row.username,
        total_journey_points: row.total_journey_points,
        current_rank: row.current_rank,
        countries_visited: JSON.parse(row.countries_visited || '[]'),
        states_visited: JSON.parse(row.states_visited || '[]')
      }
    }));
  }

  /**
   * Process journey completion and award points
   */
  public static async processJourneyCompletion(
    messageId: string,
    journeyData: JourneyData
  ): Promise<RankAdvancement | null> {
    const db = dbManager.getDatabase();
    
    // Get message and user data
    const messageRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!messageRow) {
      throw new Error('Message not found');
    }

    const message = dbManager.rowToMessage(messageRow);
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(message.sender_id);
    if (!userRow) {
      throw new Error('Sender not found');
    }

    const user = dbManager.rowToUser(userRow);

    // Calculate points
    const pointsCalc = this.calculateJourneyPoints(
      journeyData,
      message.sender_location,
      message.recipient_location!,
      user
    );

    // Determine new locations visited
    const newLocations = this.checkNewLocations(message.recipient_location!, user);
    const newCountries = newLocations.filter(loc => 
      message.recipient_location!.country && loc === message.recipient_location!.country
    );
    const newStates = newLocations.filter(loc => 
      message.recipient_location!.state && loc === message.recipient_location!.state
    );

    // Update journey data with points earned
    const updatedJourneyData = {
      ...journeyData,
      journey_points_earned: pointsCalc.total_points
    };

    // Update message with journey points
    db.prepare(`
      UPDATE messages 
      SET journey_data = ? 
      WHERE id = ?
    `).run(JSON.stringify(updatedJourneyData), messageId);

    // Update user points and check for rank advancement
    const advancement = await this.updateUserPoints(
      message.sender_id,
      pointsCalc.total_points,
      { countries: newCountries, states: newStates }
    );

    return advancement;
  }
}

export default RankingService;