import { NextRequest, NextResponse } from 'next/server';
import { RankingService } from '@/services/ranking';
import { dbManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    dbManager.connect();

    // Get limit from query parameters (default to 10)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get leaderboard data
    const leaderboard = await RankingService.getLeaderboard(limit);

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        total_shown: leaderboard.length,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}