import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth';
import { RegisterCredentials } from '@/types';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';

export async function POST(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const db = dbManager.connect();
    const migrationRunner = new MigrationRunner(db);
    migrationRunner.runMigrations();

    const body: RegisterCredentials = await request.json();
    const result = await authService.register(body);

    return NextResponse.json(result, {
      status: result.success ? 201 : 400
    });
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}