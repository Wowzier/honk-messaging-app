import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth';
import { UserProfile } from '@/types';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';

export async function PUT(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const db = dbManager.connect();
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body: Partial<UserProfile> = await request.json();
    const success = authService.updateProfile(user.id, body);

    if (success) {
      const updatedUser = authService.getUserProfile(user.id);
      return NextResponse.json({
        success: true,
        user: updatedUser
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to update profile' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const db = dbManager.connect();
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile get API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}