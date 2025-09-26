import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';

export async function POST(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const db = dbManager.connect();
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    const user = authService.verifyToken(token);

    if (user) {
      return NextResponse.json({
        success: true,
        user
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}