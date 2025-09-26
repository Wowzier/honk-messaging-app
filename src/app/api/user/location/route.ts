import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import { MigrationRunner } from '@/lib/migrations';
import { LocationData } from '@/types';

interface UpdateLocationRequest {
  userId: string;
  location: LocationData;
}

/**
 * Update a user's current location
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize database and run migrations
    const migrationRunner = new MigrationRunner(dbManager.getDatabase());
    await migrationRunner.runMigrations();

    // Authenticate user
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    const body: UpdateLocationRequest = await request.json();

    // Validate that user can only update their own location
    if (body.userId !== user.id) {
      return NextResponse.json({ error: 'Can only update your own location' }, { status: 403 });
    }

    // Validate location data
    if (!body.location || typeof body.location.latitude !== 'number' || typeof body.location.longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }

    const db = dbManager.getDatabase();

    // Update user's current location
    const updateStmt = db.prepare(`
      UPDATE users 
      SET current_location = ?, updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      JSON.stringify(body.location),
      new Date().toISOString(),
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Error updating user location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}