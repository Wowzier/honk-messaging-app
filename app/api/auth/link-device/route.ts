import { NextRequest, NextResponse } from 'next/server';
import { seamlessAuthService } from '@/services/seamlessAuth';
import { dbManager } from '@/lib/database';
import { MigrationRunner } from '@/lib/migrations';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'honk-secret-key-change-in-production';

interface LinkDeviceRequest {
  code: string;
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

    const body: LinkDeviceRequest = await request.json();
    
    // Validate required fields
    if (!body.code || !body.userAgent || !body.screenResolution || !body.timezone || !body.language || !body.platform) {
      return NextResponse.json(
        { success: false, message: 'Missing required information' },
        { status: 400 }
      );
    }

    const result = await seamlessAuthService.linkDeviceWithCode(body.code, {
      userAgent: body.userAgent,
      screenResolution: body.screenResolution,
      timezone: body.timezone,
      language: body.language,
      platform: body.platform
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      user: result.user,
      token,
      message: 'Device linked successfully'
    });

  } catch (error) {
    console.error('Link device error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to link device' },
      { status: 500 }
    );
  }
}