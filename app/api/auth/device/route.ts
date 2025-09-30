import { NextRequest, NextResponse } from 'next/server';
import { seamlessAuthService } from '@/services/seamlessAuth';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'honk-secret-key-change-in-production';

interface DeviceAuthRequest {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize database and run migrations
    const database = dbManager.connect();
    const migrationRunner = new MigrationRunner(database);
    migrationRunner.runMigrations();

    const body: DeviceAuthRequest = await request.json();
    
    // Validate required fields
    if (!body.userAgent || !body.screenResolution || !body.timezone || !body.language || !body.platform) {
      return NextResponse.json(
        { success: false, message: 'Missing device information' },
        { status: 400 }
      );
    }

    const result = await seamlessAuthService.getOrCreateUser(body);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user.id },
      JWT_SECRET,
      { expiresIn: '30d' } // Longer expiry for seamless auth
    );

    return NextResponse.json({
      success: true,
      user: result.user,
      token,
      isNew: result.isNew,
      message: result.isNew ? 'New user created' : 'Welcome back'
    });

  } catch (error) {
    console.error('Device auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}