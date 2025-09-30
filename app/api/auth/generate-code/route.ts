import { NextRequest, NextResponse } from 'next/server';
import { seamlessAuthService } from '@/services/seamlessAuth';
import { authMiddleware } from '@/lib/auth-middleware';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';

export async function POST(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const database = dbManager.connect();
    const migrationRunner = new MigrationRunner(database);
    migrationRunner.runMigrations();

    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const code = await seamlessAuthService.createDeviceLinkCode(authResult.user.id);

    return NextResponse.json({
      success: true,
      code,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate code' },
      { status: 500 }
    );
  }
}